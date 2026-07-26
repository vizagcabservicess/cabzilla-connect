import { logDebug, nowIso, scheduleIdle, scrollDepthPct, throttle, viewport } from './config';
import {
  cssPath,
  isSensitiveElement,
  safeInputValue,
  sanitizeHtmlForRecord,
  shouldMaskElement,
} from './privacy';
import type { RecordingOp, ResolvedConfig, SerializedMutation } from './types';
import type { Transport } from './transport';

declare global {
  interface Window {
    pako?: {
      gzip: (data: string | Uint8Array, options?: { to?: string }) => Uint8Array;
    };
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function compressChunk(events: RecordingOp[]): {
  compressed: boolean;
  encoding: 'gzip-base64' | 'json';
  data?: string;
  events?: RecordingOp[];
} {
  const json = JSON.stringify(events);
  try {
    if (window.pako?.gzip) {
      const gz = window.pako.gzip(json);
      return {
        compressed: true,
        encoding: 'gzip-base64',
        data: bytesToBase64(gz),
      };
    }
  } catch {
    // fall through
  }
  return { compressed: false, encoding: 'json', events };
}

async function gzipViaCompressionStream(json: string): Promise<string | null> {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = await new Response(stream).arrayBuffer();
    return bytesToBase64(new Uint8Array(buf));
  } catch {
    return null;
  }
}

/** Prefer gzip — full DOM snapshots are large; uncompressed JSON is slow to upload. */
async function packForUpload(events: RecordingOp[]): Promise<{
  compressed: boolean;
  encoding: 'gzip-base64' | 'json';
  data?: string;
  events?: RecordingOp[];
}> {
  const json = JSON.stringify(events);
  const streamed = await gzipViaCompressionStream(json);
  if (streamed) {
    return { compressed: true, encoding: 'gzip-base64', data: streamed };
  }
  if (window.pako?.gzip) {
    return compressChunk(events);
  }
  return { compressed: false, encoding: 'json', events };
}

function estimatePayloadBytes(
  events: RecordingOp[],
  packed?: { compressed: boolean; data?: string; events?: RecordingOp[] },
): number {
  if (packed?.compressed && packed.data) return Math.ceil(packed.data.length * 0.75) + 256;
  try {
    return JSON.stringify(packed?.events || events).length;
  } catch {
    return 1_000_000;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** True while the site is still showing the HTML/React skeleton (gray bars). */
function isSkeletonVisible(): boolean {
  try {
    if (document.querySelector('.skel, .skel-hero, .skel-card, .loading-skeleton')) return true;
    // Many skeleton blocks = still loading; a few animate-pulse accents are OK
    const pulses = document.querySelectorAll('.animate-pulse');
    if (pulses.length >= 4) return true;
    const root = document.getElementById('root');
    if (root && root.textContent && root.textContent.replace(/\s+/g, '').length < 40) return true;
  } catch {
    // ignore
  }
  return false;
}

export class SessionRecorder {
  private ops: RecordingOp[] = [];
  private startedAt = nowIso();
  private chunkIndex = 0;
  private observer: MutationObserver | null = null;
  private destroyed = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private snapshotPending = false;
  private lastFullAt = 0;
  private unsubscribers: Array<() => void> = [];
  private origin = Date.now();

  constructor(
    private cfg: ResolvedConfig,
    private transport: Transport,
    private getIds: () => { visitorId: string | null; sessionId: string },
  ) {}

  start(): void {
    if (this.destroyed || !this.cfg.recording) return;
    this.origin = Date.now();
    this.startedAt = nowIso();
    this.observeMutations();
    this.bindInputListeners();
    this.bindPointerListeners();
    this.bindViewportListeners();
    this.bindSpaNavigation();

    // Wait until skeleton loaders are gone, then take the real page snapshot
    void this.waitForContentThenSnapshot();

    // Refresh full snapshot often enough that live watch stays close to the visitor
    this.snapshotTimer = setInterval(() => {
      if (this.destroyed) return;
      if (isSkeletonVisible()) return;
      this.scheduleFullSnapshot(true);
    }, 10_000);

    this.flushTimer = setInterval(() => {
      scheduleIdle(() => void this.flush());
    }, 2500);

    const onHide = () => void this.flush(true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });
    window.addEventListener('pagehide', onHide);
    this.unsubscribers.push(() => window.removeEventListener('pagehide', onHide));
  }

  private t(): number {
    return Date.now() - this.origin;
  }

  private push(op: RecordingOp): void {
    if (this.destroyed) return;
    this.ops.push(op);
    if (this.ops.length >= 80) {
      scheduleIdle(() => void this.flush());
    }
  }

  private async waitForContentThenSnapshot(): Promise<void> {
    const maxWaitMs = 6_000;
    const start = Date.now();
    while (!this.destroyed && Date.now() - start < maxWaitMs) {
      if (!isSkeletonVisible() && document.getElementById('root')?.childElementCount) {
        await sleep(150);
        break;
      }
      await sleep(150);
    }
    if (this.destroyed) return;
    this.captureFullSnapshot();
    void this.flush();
  }

  /** @param urgent bypass normal throttle (used on SPA navigations) */
  private scheduleFullSnapshot(forceFlush: boolean, urgent = false): void {
    if (this.snapshotPending) return;
    if (!urgent && Date.now() - this.lastFullAt < 4_000) return;
    if (urgent && Date.now() - this.lastFullAt < 1_200) return;
    this.snapshotPending = true;
    const run = () => {
      this.snapshotPending = false;
      if (this.destroyed || isSkeletonVisible()) return;
      this.captureFullSnapshot();
      if (forceFlush) void this.flush();
    };
    if (urgent) {
      window.setTimeout(run, 350); // let React paint the new route
    } else {
      scheduleIdle(run);
    }
  }

  private bindSpaNavigation(): void {
    const onNav = () => this.scheduleFullSnapshot(true, true);
    window.addEventListener('popstate', onNav);
    this.unsubscribers.push(() => window.removeEventListener('popstate', onNav));

    const wrap = (type: 'pushState' | 'replaceState') => {
      const orig = history[type].bind(history);
      history[type] = ((...args: Parameters<History['pushState']>) => {
        const ret = orig(...args);
        onNav();
        return ret;
      }) as History['pushState'];
      this.unsubscribers.push(() => {
        history[type] = orig;
      });
    };
    wrap('pushState');
    wrap('replaceState');
  }

  private captureFullSnapshot(): void {
    try {
      const base = `${location.origin}/`;
      const html = sanitizeHtmlForRecord(document.documentElement.outerHTML, this.cfg, base);
      const vp = viewport();
      // Replace any queued full snapshot so we keep the freshest DOM
      this.ops = this.ops.filter((o) => o.op !== 'full');
      this.push({ t: this.t(), op: 'full', html, w: vp.w, h: vp.h });
      this.lastFullAt = Date.now();
    } catch (err) {
      logDebug(this.cfg, 'full snapshot failed', err);
    }
  }

  private observeMutations(): void {
    if (typeof MutationObserver === 'undefined') return;
    let majorDomChanges = 0;
    this.observer = new MutationObserver((mutations) => {
      const serialized: SerializedMutation[] = [];
      for (const m of mutations) {
        if (m.type === 'childList' && (m.addedNodes.length > 2 || m.removedNodes.length > 2)) {
          majorDomChanges += 1;
        }
        if (serialized.length > 40) break;
        const target = m.target instanceof Element ? m.target : m.target.parentElement;
        if (!target) continue;
        if (target.closest?.('[data-va-ignore]')) continue;

        if (m.type === 'attributes') {
          if (shouldMaskElement(target, this.cfg.maskSelectors) && m.attributeName === 'value') {
            serialized.push({
              type: 'attributes',
              target: cssPath(target),
              attributeName: m.attributeName,
              oldValue: '***',
            });
          } else {
            serialized.push({
              type: 'attributes',
              target: cssPath(target),
              attributeName: m.attributeName,
              oldValue: m.oldValue,
            });
          }
        } else if (m.type === 'characterData') {
          const text = shouldMaskElement(target, this.cfg.maskSelectors)
            ? '***'
            : (m.target.textContent || '').slice(0, 200);
          serialized.push({
            type: 'characterData',
            target: cssPath(target),
            text,
          });
        } else if (m.type === 'childList') {
          serialized.push({
            type: 'childList',
            target: cssPath(target),
            added: Array.from(m.addedNodes)
              .filter((n) => n.nodeType === 1)
              .slice(0, 5)
              .map((n) => sanitizeHtmlForRecord((n as Element).outerHTML || '', this.cfg).slice(0, 1500)),
            removed: Array.from(m.removedNodes)
              .filter((n) => n.nodeType === 1)
              .slice(0, 5)
              .map((n) => cssPath(n as Element)),
          });
        }
      }
      if (serialized.length) {
        this.push({ t: this.t(), op: 'mut', mutations: serialized });
      }
      // Skeleton → real content is a big DOM swap; mutations alone can't rebuild it — take a new full snapshot
      if (majorDomChanges >= 3) {
        majorDomChanges = 0;
        this.scheduleFullSnapshot(true);
      }
    });

    this.observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
      attributeOldValue: true,
    });
  }

  private bindInputListeners(): void {
    const onInput = (ev: Event) => {
      const el = ev.target as Element | null;
      if (!el || isSensitiveElement(el)) return;
      const sel = cssPath(el);
      const v = safeInputValue(el, this.cfg.maskSelectors);
      this.push({ t: this.t(), op: 'input', sel, v });
    };

    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target instanceof Element ? ev.target : null;
      if (isSensitiveElement(el)) return;
      // Some browsers / IME / autofill fire keydown without `key`
      const key = typeof ev.key === 'string' ? ev.key : '';
      if (!key || key.length === 1) return;
      // Do not record actual characters for privacy; only key meta for non-text shortcuts
      this.push({
        t: this.t(),
        op: 'key',
        k: key,
        sel: el ? cssPath(el) : undefined,
      });
    };

    document.addEventListener('input', onInput, { capture: true, passive: true });
    document.addEventListener('keydown', onKey, { capture: true, passive: true });
    this.unsubscribers.push(() => {
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('keydown', onKey, true);
    });
  }

  private bindPointerListeners(): void {
    const onMove = throttle((ev: MouseEvent) => {
      this.push({ t: this.t(), op: 'mm', x: ev.clientX, y: ev.clientY });
    }, this.cfg.mouseThrottleMs);

    const onClick = (ev: MouseEvent) => {
      this.push({
        t: this.t(),
        op: 'click',
        x: ev.clientX,
        y: ev.clientY,
        button: ev.button,
      });
    };

    const onScroll = throttle(() => {
      this.push({
        t: this.t(),
        op: 'scroll',
        x: window.scrollX || 0,
        y: window.scrollY || 0,
        d: scrollDepthPct(),
      });
    }, this.cfg.scrollThrottleMs);

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('click', onClick, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    this.unsubscribers.push(() => {
      onMove.cancel();
      onScroll.cancel();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('click', onClick);
      window.removeEventListener('scroll', onScroll);
    });
  }

  private bindViewportListeners(): void {
    const onResize = throttle(() => {
      const vp = viewport();
      this.push({ t: this.t(), op: 'resize', w: vp.w, h: vp.h });
    }, 300);

    const onVis = () => {
      this.push({ t: this.t(), op: 'vis', state: document.visibilityState });
    };

    const onFocus = () => this.push({ t: this.t(), op: 'focus' });
    const onBlur = () => this.push({ t: this.t(), op: 'blur' });

    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);

    this.unsubscribers.push(() => {
      onResize.cancel();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    });
  }

  async flush(useBeacon = false): Promise<void> {
    if (this.flushing || !this.ops.length) return;
    const { visitorId, sessionId } = this.getIds();
    if (!visitorId || !sessionId) return;

    this.flushing = true;
    try {
      // Always send the page snapshot alone first — concurrent flushes used to
      // persist tiny mouse chunks while the large `full` snapshot kept failing.
      const fullIdx = this.ops.findIndex((o) => o.op === 'full');
      const chunk =
        fullIdx >= 0 ? this.ops.splice(fullIdx, 1) : this.ops.splice(0, this.ops.length);
      if (!chunk.length) return;

      const endedAt = nowIso();
      const packed = await packForUpload(chunk);
      const index = this.chunkIndex;
      const payload = {
        siteKey: this.cfg.siteKey,
        visitorId,
        sessionId,
        chunkIndex: index,
        events: packed.events || [],
        startedAt: this.startedAt,
        endedAt,
        compressed: packed.compressed,
        encoding: packed.encoding,
        data: packed.data,
      };

      // Never push full snapshots over WS (too large) — dashboard fetches the chunk after REST save
      const liveEvents = chunk.filter((e) => e.op !== 'full');
      if (liveEvents.length) {
        this.transport.sendWs('recording.ops', {
          sessionId,
          visitorId,
          events: liveEvents,
        });
      }

      const bytes = estimatePayloadBytes(chunk, packed);
      const canBeacon = useBeacon && bytes < 55_000 && !chunk.some((e) => e.op === 'full');

      try {
        await this.transport.sendRecording(payload, canBeacon);
        this.chunkIndex = index + 1;
        this.startedAt = endedAt;
      } catch (err) {
        // Put failed ops back; do not advance chunk index
        this.ops = chunk.concat(this.ops).slice(0, 500);
        logDebug(this.cfg, 'recording flush failed', err);
      }
    } finally {
      this.flushing = false;
      // If a full snapshot is still queued (or more ops arrived), keep draining
      if (this.ops.some((o) => o.op === 'full') || this.ops.length >= 40) {
        scheduleIdle(() => void this.flush());
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = null;
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    this.snapshotTimer = null;
    this.observer?.disconnect();
    this.observer = null;
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    void this.flush(true);
  }
}
