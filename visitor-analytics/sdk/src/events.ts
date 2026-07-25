import {
  cancelIdle,
  logDebug,
  nowIso,
  pagePath,
  pageTitle,
  pageUrl,
  scheduleIdle,
  viewport,
} from './config';
import type { ResolvedConfig, TrackerEvent, TrackerEventType } from './types';
import type { Transport } from './transport';
import { touchSession } from './identity';

export class EventQueue {
  private queue: TrackerEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private flushing = false;
  private destroyed = false;
  private idleHandle: number | null = null;

  constructor(
    private cfg: ResolvedConfig,
    private transport: Transport,
    private getIds: () => { visitorId: string | null; sessionId: string },
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.flush();
    }, this.cfg.batchIntervalMs);

    const onHide = () => {
      void this.flush(true);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onHide();
    });
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
  }

  enqueue(
    type: TrackerEventType | string,
    partial: Partial<TrackerEvent> = {},
  ): void {
    if (this.destroyed) return;
    touchSession();
    const vp = viewport();
    const event: TrackerEvent = {
      ...partial,
      type,
      pageUrl: partial.pageUrl ?? pageUrl(),
      pagePath: partial.pagePath ?? pagePath(),
      pageTitle: partial.pageTitle ?? pageTitle(),
      viewportW: partial.viewportW ?? vp.w,
      viewportH: partial.viewportH ?? vp.h,
      occurredAt: partial.occurredAt ?? nowIso(),
    };
    this.queue.push(event);
    logDebug(this.cfg, 'event', type, event);

    if (this.queue.length >= this.cfg.batchMaxEvents) {
      void this.flush();
    } else {
      this.scheduleIdleFlush();
    }
  }

  private scheduleIdleFlush(): void {
    if (this.idleHandle != null) return;
    this.idleHandle = scheduleIdle(() => {
      this.idleHandle = null;
      if (this.queue.length >= Math.max(5, Math.floor(this.cfg.batchMaxEvents / 2))) {
        void this.flush();
      }
    }, this.cfg.batchIntervalMs);
  }

  async flush(useBeacon = false): Promise<void> {
    if (this.flushing || this.queue.length === 0) return;
    const { visitorId, sessionId } = this.getIds();
    if (!visitorId || !sessionId) return;

    this.flushing = true;
    const batch = this.queue.splice(0, this.cfg.batchMaxEvents);
    try {
      await this.transport.sendEvents(
        {
          siteKey: this.cfg.siteKey,
          visitorId,
          sessionId,
          events: batch,
        },
        useBeacon,
      );
    } catch (err) {
      // re-queue failed batch at front (cap to avoid unbounded growth)
      this.queue = batch.concat(this.queue).slice(0, 500);
      logDebug(this.cfg, 'flush failed', err);
    } finally {
      this.flushing = false;
      if (this.queue.length >= this.cfg.batchMaxEvents) {
        void this.flush(useBeacon);
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.idleHandle != null) cancelIdle(this.idleHandle);
    this.idleHandle = null;
    void this.flush(true);
  }
}
