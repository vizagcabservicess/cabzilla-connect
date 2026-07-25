import {
  logDebug,
  pagePath,
  pageTitle,
  pageUrl,
  readConfig,
  scrollDepthPct,
  throttle,
  viewport,
} from './config';
import { collectDeviceInfo, collectUtm } from './device';
import { EventQueue } from './events';
import {
  applyServerIdentity,
  clearIdentityCache,
  getIdentity,
  resolveIdentity,
} from './identity';
import {
  classifyLink,
  elementSnapshot,
  hasConsent,
  isSensitiveElement,
  watchConsent,
} from './privacy';
import { SessionRecorder } from './recorder';
import { Transport } from './transport';
import {
  attachChatHelpers,
  createChatBridge,
  destroyChatBridge,
} from './chat-bridge';
import type {
  ResolvedConfig,
  TrackerEvent,
  VTHAnalyticsConfig,
  VisitorAnalyticsPublicApi,
} from './types';

declare global {
  interface Window {
    visitorAnalytics?: VisitorAnalyticsPublicApi;
    VTHTracker?: {
      init: (config?: Partial<VTHAnalyticsConfig>) => Promise<VisitorAnalyticsPublicApi | null>;
      getInstance: () => VisitorAnalyticsPublicApi | null;
    };
  }
}

let active: TrackerRuntime | null = null;

class TrackerRuntime {
  readonly cfg: ResolvedConfig;
  readonly transport: Transport;
  readonly events: EventQueue;
  readonly recorder: SessionRecorder | null;
  readonly api: VisitorAnalyticsPublicApi;
  private unsubscribers: Array<() => void> = [];
  private started = false;
  private consentStop: (() => void) | null = null;

  constructor(cfg: ResolvedConfig) {
    this.cfg = cfg;
    this.transport = new Transport(cfg);
    this.events = new EventQueue(cfg, this.transport, () => ({
      visitorId: getIdentity()?.visitorId ?? null,
      sessionId: getIdentity()?.sessionId || resolveIdentity().sessionId,
    }));
    this.recorder = cfg.recording
      ? new SessionRecorder(cfg, this.transport, () => ({
          visitorId: getIdentity()?.visitorId ?? null,
          sessionId: getIdentity()?.sessionId || resolveIdentity().sessionId,
        }))
      : null;

    const chat = createChatBridge(this.transport, getIdentity);
    attachChatHelpers(chat);

    this.api = {
      init: (overrides) => {
        void bootstrap(overrides);
      },
      trackInteraction: (name, metaOrCategory?, data?) => {
        // Site sometimes calls (event, category, data); SDK also accepts (name, meta).
        const CONTACT = new Set(['phone_click', 'whatsapp_click', 'email_click']);
        if (typeof metaOrCategory === 'string') {
          const type = CONTACT.has(name) ? name : 'custom';
          const meta = {
            category: metaOrCategory,
            ...(data && typeof data === 'object' ? data : {}),
          };
          this.events.enqueue(type, { name, meta });
          return;
        }
        if (CONTACT.has(name)) {
          this.events.enqueue(name, { name, meta: metaOrCategory });
          return;
        }
        this.trackCustom('custom', name, metaOrCategory);
      },
      trackPageView: (path, meta) => this.trackPageView(path, meta),
      trackSearch: (query, meta) =>
        this.events.enqueue('search', { name: 'search', meta: { query, ...(meta || {}) } }),
      trackClick: (target, meta) => this.trackClickManual(target, meta),
      trackScroll: (depth, meta) =>
        this.events.enqueue('scroll', {
          scrollDepth: depth ?? scrollDepthPct(),
          meta,
        }),
      trackFormSubmission: (formName, meta) =>
        this.events.enqueue('form_submit', { formName, meta }),
      trackConversion: (name, meta) => this.trackCustom('custom', name, meta),
      flush: async () => {
        await this.events.flush(true);
        await this.recorder?.flush(true);
      },
      destroy: () => this.destroy(),
      getIdentity: () => getIdentity(),
      chat,
    };
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const identity = resolveIdentity();
    const device = collectDeviceInfo();
    const utm = collectUtm();

    logDebug(this.cfg, 'init', {
      visitorKey: identity.visitorKey,
      sessionId: identity.sessionId,
      isReturning: identity.isReturning,
      device,
      utm,
    });

    try {
      const res = await this.transport.identify({
        siteKey: this.cfg.siteKey,
        visitorKey: identity.visitorKey,
        sessionId: identity.sessionId,
        device,
        utm,
        consentGiven: hasConsent(this.cfg.requireConsent) || !this.cfg.requireConsent,
        language: device.language,
        timezone: device.timezone,
      });
      applyServerIdentity(res);
    } catch (err) {
      logDebug(this.cfg, 'identify failed; continuing offline', err);
      // Keep local session; events will queue until identify succeeds on retry
      this.retryIdentify();
    }

    this.events.start();
    this.bindAutoTracking();
    this.recorder?.start();
    this.trackPageView();
  }

  private retryIdentify(): void {
    let attempts = 0;
    const tick = async () => {
      if (!this.started || getIdentity()?.visitorId) return;
      attempts += 1;
      try {
        const identity = resolveIdentity();
        const device = collectDeviceInfo();
        const utm = collectUtm();
        const res = await this.transport.identify({
          siteKey: this.cfg.siteKey,
          visitorKey: identity.visitorKey,
          sessionId: identity.sessionId,
          device,
          utm,
          consentGiven: true,
          language: device.language,
          timezone: device.timezone,
        });
        applyServerIdentity(res);
        void this.events.flush();
      } catch {
        if (attempts < 8) {
          window.setTimeout(() => void tick(), Math.min(30_000, 1000 * attempts * attempts));
        }
      }
    };
    window.setTimeout(() => void tick(), 2000);
  }

  private trackCustom(
    type: string,
    name: string,
    meta?: Record<string, unknown>,
  ): void {
    this.events.enqueue(type, { name, meta });
  }

  trackPageView(path?: string, meta?: Record<string, unknown>): void {
    const vp = viewport();
    this.events.enqueue('page_view', {
      pagePath: path || pagePath(),
      pageUrl: pageUrl(),
      pageTitle: pageTitle(),
      viewportW: vp.w,
      viewportH: vp.h,
      meta,
    });
  }

  private trackClickManual(
    target?: Element | string,
    meta?: Record<string, unknown>,
  ): void {
    let el: Element | null = null;
    if (typeof target === 'string') {
      try {
        el = document.querySelector(target);
      } catch {
        el = null;
      }
    } else if (target) {
      el = target;
    }
    this.events.enqueue('click', {
      ...elementSnapshot(el, this.cfg.maskSelectors),
      meta,
    });
  }

  private bindAutoTracking(): void {
    const onMove = throttle((ev: MouseEvent) => {
      this.events.enqueue('mouse_move', { x: ev.clientX, y: ev.clientY });
    }, this.cfg.mouseThrottleMs);

    const onScroll = throttle(() => {
      this.events.enqueue('scroll', {
        scrollDepth: scrollDepthPct(),
        x: window.scrollX || 0,
        y: window.scrollY || 0,
      });
    }, this.cfg.scrollThrottleMs);

    const onClick = (ev: MouseEvent) => {
      const el = ev.target instanceof Element ? ev.target : null;
      const snap = elementSnapshot(el, this.cfg.maskSelectors);
      const href = snap.elementHref;
      const special = classifyLink(href);

      if (ev.button === 2) {
        this.events.enqueue('right_click', { x: ev.clientX, y: ev.clientY, ...snap });
        return;
      }

      this.events.enqueue('click', { x: ev.clientX, y: ev.clientY, ...snap });
      if (special) {
        this.events.enqueue(special, { x: ev.clientX, y: ev.clientY, ...snap });
      }

      this.detectBookingAndPayment(el, snap);
      this.detectPopup(el, 'click');
    };

    const onDblClick = (ev: MouseEvent) => {
      const el = ev.target instanceof Element ? ev.target : null;
      this.events.enqueue('double_click', {
        x: ev.clientX,
        y: ev.clientY,
        ...elementSnapshot(el, this.cfg.maskSelectors),
      });
    };

    const onContext = (ev: MouseEvent) => {
      const el = ev.target instanceof Element ? ev.target : null;
      this.events.enqueue('right_click', {
        x: ev.clientX,
        y: ev.clientY,
        ...elementSnapshot(el, this.cfg.maskSelectors),
      });
    };

    const onFocus = (ev: FocusEvent) => {
      const el = ev.target instanceof Element ? ev.target : null;
      if (!el || isSensitiveElement(el)) return;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
        return;
      }
      this.events.enqueue('form_focus', {
        formName: (el as HTMLInputElement).form?.name || el.getAttribute('name') || undefined,
        ...elementSnapshot(el, this.cfg.maskSelectors),
      });
    };

    const onBlur = (ev: FocusEvent) => {
      const el = ev.target instanceof Element ? ev.target : null;
      if (!el || isSensitiveElement(el)) return;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
        return;
      }
      this.events.enqueue('form_blur', {
        formName: (el as HTMLInputElement).form?.name || el.getAttribute('name') || undefined,
        ...elementSnapshot(el, this.cfg.maskSelectors),
      });
    };

    const onSubmit = (ev: Event) => {
      const form = ev.target instanceof HTMLFormElement ? ev.target : null;
      if (!form || form.hasAttribute('data-va-ignore')) return;
      this.events.enqueue('form_submit', {
        formName: form.name || form.id || form.getAttribute('action') || undefined,
        ...elementSnapshot(form, this.cfg.maskSelectors),
      });
      this.detectBookingForm(form);
    };

    const onVis = () => {
      this.events.enqueue('visibility_change', {
        meta: { state: document.visibilityState },
      });
      if (document.visibilityState === 'hidden') {
        this.events.enqueue('tab_switch', { meta: { state: 'hidden' } });
      }
    };

    const onResize = throttle(() => {
      const vp = viewport();
      this.events.enqueue('resize', { viewportW: vp.w, viewportH: vp.h });
    }, 500);

    // SPA page views via history API
    const wrapHistory = (method: 'pushState' | 'replaceState') => {
      const original = history[method];
      history[method] = function (this: History, ...args: Parameters<History['pushState']>) {
        const ret = original.apply(this, args);
        window.dispatchEvent(new Event('vth:location'));
        return ret;
      };
      this.unsubscribers.push(() => {
        history[method] = original;
      });
    };
    wrapHistory('pushState');
    wrapHistory('replaceState');

    const onLoc = () => this.trackPageView();
    window.addEventListener('popstate', onLoc);
    window.addEventListener('vth:location', onLoc);

    document.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', onClick, { capture: true, passive: true });
    document.addEventListener('dblclick', onDblClick, { capture: true, passive: true });
    document.addEventListener('contextmenu', onContext, { capture: true, passive: true });
    document.addEventListener('focus', onFocus, true);
    document.addEventListener('blur', onBlur, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize, { passive: true });

    // Mutation observer for popup open/close heuristics
    this.observePopups();

    // Razorpay / booking data-attribute hooks
    this.bindDataAttributeHooks();

    this.unsubscribers.push(() => {
      onMove.cancel();
      onScroll.cancel();
      onResize.cancel();
      document.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('dblclick', onDblClick, true);
      document.removeEventListener('contextmenu', onContext, true);
      document.removeEventListener('focus', onFocus, true);
      document.removeEventListener('blur', onBlur, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('popstate', onLoc);
      window.removeEventListener('vth:location', onLoc);
    });
  }

  private detectBookingAndPayment(
    el: Element | null,
    snap: ReturnType<typeof elementSnapshot>,
  ): void {
    if (!el) return;
    const marker =
      el.closest('[data-va-event]') ||
      el.closest('[data-booking]') ||
      el.closest('.razorpay-payment-button');
    if (!marker) return;

    const evName =
      marker.getAttribute('data-va-event') ||
      marker.getAttribute('data-booking') ||
      '';

    if (evName === 'booking_started' || /book|quote|reserve/i.test(evName)) {
      this.events.enqueue('booking_started', { ...snap, meta: { trigger: evName } });
    }
    if (evName === 'booking_completed' || /complete|success|confirm/i.test(evName)) {
      this.events.enqueue('booking_completed', { ...snap, meta: { trigger: evName } });
    }
    if (
      evName === 'razorpay_payment' ||
      marker.classList.contains('razorpay-payment-button') ||
      /razorpay|pay/i.test(evName)
    ) {
      this.events.enqueue('razorpay_payment', { ...snap, meta: { trigger: evName || 'razorpay' } });
    }
  }

  private detectBookingForm(form: HTMLFormElement): void {
    const id = `${form.id} ${form.name} ${form.className}`.toLowerCase();
    if (/book|quote|reserv|enquiry|inquiry|cab|taxi/.test(id)) {
      this.events.enqueue('booking_started', {
        formName: form.name || form.id || undefined,
        meta: { via: 'form_submit' },
      });
    }
  }

  private detectPopup(el: Element | null, _via: string): void {
    if (!el) return;
    const popup = el.closest('[data-va-popup], .modal, [role="dialog"], .popup');
    if (!popup) return;
    const isClose =
      el.closest('[data-va-popup-close], .modal-close, [aria-label="Close"], .close') != null;
    if (isClose) {
      this.events.enqueue('popup_closed', elementSnapshot(popup, this.cfg.maskSelectors));
    }
  }

  private observePopups(): void {
    if (typeof MutationObserver === 'undefined') return;
    const seen = new WeakSet<Element>();
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          const popup =
            n.matches?.('[data-va-popup], .modal, [role="dialog"], .popup')
              ? n
              : n.querySelector?.('[data-va-popup], .modal, [role="dialog"], .popup');
          if (popup && !seen.has(popup)) {
            seen.add(popup);
            this.events.enqueue(
              'popup_opened',
              elementSnapshot(popup, this.cfg.maskSelectors),
            );
          }
        });
        m.removedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          const popup =
            n.matches?.('[data-va-popup], .modal, [role="dialog"], .popup') ? n : null;
          if (popup) {
            this.events.enqueue(
              'popup_closed',
              elementSnapshot(popup, this.cfg.maskSelectors),
            );
          }
        });
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    this.unsubscribers.push(() => obs.disconnect());
  }

  private bindDataAttributeHooks(): void {
    const handler = (ev: Event) => {
      const t = ev.target instanceof Element ? ev.target : null;
      const host = t?.closest('[data-va-track]') as HTMLElement | null;
      if (!host) return;
      const type = host.getAttribute('data-va-track') || 'custom';
      this.events.enqueue(type, {
        ...elementSnapshot(host, this.cfg.maskSelectors),
        name: host.getAttribute('data-va-name') || undefined,
      });
    };
    document.addEventListener('click', handler, true);
    this.unsubscribers.push(() => document.removeEventListener('click', handler, true));

    // Global custom events sites can dispatch
    const onCustom = (ev: Event) => {
      const detail = (ev as CustomEvent<Partial<TrackerEvent> & { type?: string }>).detail;
      if (!detail?.type) return;
      this.events.enqueue(detail.type, detail);
    };
    document.addEventListener('vth:track', onCustom);
    this.unsubscribers.push(() => document.removeEventListener('vth:track', onCustom));
  }

  waitForConsentThenStart(): void {
    this.consentStop = watchConsent(this.cfg.requireConsent, () => {
      void this.start();
    });
  }

  destroy(): void {
    this.consentStop?.();
    this.consentStop = null;
    for (const off of this.unsubscribers) off();
    this.unsubscribers = [];
    this.recorder?.destroy();
    this.events.destroy();
    destroyChatBridge(this.api.chat);
    this.transport.destroy();
    clearIdentityCache();
    this.started = false;
  }
}

async function bootstrap(overrides?: Partial<VTHAnalyticsConfig>): Promise<VisitorAnalyticsPublicApi | null> {
  try {
    const cfg = readConfig(overrides);
    if (active) {
      active.destroy();
      active = null;
    }
    const runtime = new TrackerRuntime(cfg);
    active = runtime;
    window.visitorAnalytics = runtime.api;

    if (cfg.requireConsent && !hasConsent(true)) {
      logDebug(cfg, 'waiting for cookie consent');
      runtime.waitForConsentThenStart();
    } else {
      await runtime.start();
    }
    return runtime.api;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[VTH Analytics] failed to initialize', err);
    return null;
  }
}

/** Programmatic entry used by IIFE global `VTHTracker`. */
export function init(overrides?: Partial<VTHAnalyticsConfig>): Promise<VisitorAnalyticsPublicApi | null> {
  return bootstrap(overrides);
}

export function getInstance(): VisitorAnalyticsPublicApi | null {
  return active?.api ?? null;
}

export type { VisitorAnalyticsPublicApi, VTHAnalyticsConfig };

function autoInit(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Expose a stable global shape regardless of bundler namespace nesting
  const api = { init, getInstance };
  window.VTHTracker = api;

  const run = () => {
    void bootstrap();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
}

autoInit();
