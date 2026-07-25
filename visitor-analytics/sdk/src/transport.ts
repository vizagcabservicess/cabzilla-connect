import { logDebug, nowIso } from './config';
import type {
  EventBatchPayload,
  IdentifyPayload,
  IdentifyResponse,
  RecordingChunkPayload,
  ResolvedConfig,
} from './types';

export class Transport {
  private ws: WebSocket | null = null;
  private wsRetry = 0;
  private wsTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private identity: { visitorId: string; sessionId: string } | null = null;

  constructor(private cfg: ResolvedConfig) {}

  setIdentity(visitorId: string, sessionId: string): void {
    this.identity = { visitorId, sessionId };
    this.connectWs();
  }

  async sendEvents(payload: EventBatchPayload, useBeacon = false): Promise<void> {
    const path = '/v1/collect/events';
    if (useBeacon && this.tryBeacon(path, payload)) return;

    // Prefer WS when open for lower latency; fall back to REST
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'events.batch', payload }));
        return;
      } catch {
        // fall through to REST
      }
    }

    await this.postJson(path, payload, { keepalive: true, timeoutMs: 12_000 });
  }

  async sendRecording(payload: RecordingChunkPayload, useBeacon = false): Promise<void> {
    const path = '/v1/collect/recording';
    if (useBeacon && this.tryBeacon(path, payload)) return;
    // Keepalive must stay off — full DOM snapshots are >> 64KB
    await this.postJson(path, payload, { keepalive: false, timeoutMs: 45_000 });
  }

  async identify(payload: IdentifyPayload): Promise<IdentifyResponse> {
    const res = await this.postJson<IdentifyResponse>('/v1/collect/identify', payload, {
      keepalive: true,
      timeoutMs: 15_000,
    });
    this.setIdentity(res.visitorId, res.sessionId);
    return res;
  }

  private url(path: string): string {
    return `${this.cfg.apiBase}${path}`;
  }

  private async postJson<T = unknown>(
    path: string,
    body: unknown,
    opts?: { timeoutMs?: number; keepalive?: boolean },
  ): Promise<T> {
    const timeoutMs = opts?.timeoutMs ?? 20_000;
    const payload = JSON.stringify(body);
    // Chrome rejects / truncates keepalive fetch bodies over ~64 KiB — never use it for recordings.
    const keepalive = opts?.keepalive === true && payload.length < 60_000;
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(this.url(path), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Key': this.cfg.siteKey,
        },
        body: payload,
        keepalive,
        credentials: 'omit',
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${path}: ${text.slice(0, 200)}`);
      }
      if (res.status === 204) return undefined as T;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) return (await res.json()) as T;
      return undefined as T;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(`Timeout ${timeoutMs}ms ${path}`);
      }
      throw err;
    } finally {
      window.clearTimeout(timer);
    }
  }

  private tryBeacon(path: string, body: unknown): boolean {
    try {
      if (typeof navigator.sendBeacon !== 'function') return false;
      // sendBeacon cannot set headers — pass siteKey in the query string
      const u = new URL(this.url(path));
      u.searchParams.set('siteKey', this.cfg.siteKey);
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      if (blob.size > 55_000) return false;
      return navigator.sendBeacon(u.toString(), blob);
    } catch {
      return false;
    }
  }

  connectWs(): void {
    if (this.destroyed || !this.cfg.wsUrl || !this.identity) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const u = new URL(this.cfg.wsUrl);
      u.searchParams.set('role', 'visitor');
      // Server resolves public siteKey → site UUID
      u.searchParams.set('siteKey', this.cfg.siteKey);
      u.searchParams.set('visitorId', this.identity.visitorId);
      u.searchParams.set('sessionId', this.identity.sessionId);

      const ws = new WebSocket(u.toString());
      this.ws = ws;

      ws.onopen = () => {
        this.wsRetry = 0;
        logDebug(this.cfg, 'ws open');
        ws.send(
          JSON.stringify({
            type: 'visitor.hello',
            payload: {
              visitorId: this.identity!.visitorId,
              sessionId: this.identity!.sessionId,
              at: nowIso(),
            },
          }),
        );
      };

      ws.onclose = () => {
        this.ws = null;
        this.scheduleWsReconnect();
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {
          // ignore
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string; payload?: unknown };
          if (msg?.type) {
            document.dispatchEvent(
              new CustomEvent('vth:ws', { detail: msg }),
            );
          }
        } catch {
          // ignore malformed
        }
      };
    } catch (err) {
      logDebug(this.cfg, 'ws connect failed', err);
      this.scheduleWsReconnect();
    }
  }

  private scheduleWsReconnect(): void {
    if (this.destroyed || this.wsTimer) return;
    const delay = Math.min(30_000, 1000 * Math.pow(2, this.wsRetry++));
    this.wsTimer = setTimeout(() => {
      this.wsTimer = null;
      this.connectWs();
    }, delay);
  }

  sendWs(type: string, payload: unknown): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    } catch {
      return false;
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.wsTimer) clearTimeout(this.wsTimer);
    this.wsTimer = null;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    this.ws = null;
  }
}
