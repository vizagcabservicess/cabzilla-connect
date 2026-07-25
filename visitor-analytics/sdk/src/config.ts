import type { ResolvedConfig, VTHAnalyticsConfig } from './types';

const DEFAULT_API_BASE = 'https://vizagup.com';
const DEFAULT_WS_URL = 'wss://vizagup.com/ws';
const DEFAULT_MASK = ['.mask-me', '[data-va-mask]'];

declare global {
  interface Window {
    VTH_ANALYTICS?: Partial<VTHAnalyticsConfig>;
  }
}

export function readConfig(overrides?: Partial<VTHAnalyticsConfig>): ResolvedConfig {
  const raw = {
    ...(typeof window !== 'undefined' ? window.VTH_ANALYTICS || {} : {}),
    ...(overrides || {}),
  };

  const siteKey = (raw.siteKey || '').trim();
  if (!siteKey) {
    throw new Error('[VTH Analytics] siteKey is required (set window.VTH_ANALYTICS.siteKey)');
  }

  const apiBase = (raw.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  let wsUrl = (raw.wsUrl || DEFAULT_WS_URL).trim();
  if (!wsUrl && apiBase) {
    wsUrl = apiBase.replace(/^http/, 'ws') + '/ws';
  }

  return {
    siteKey,
    apiBase,
    wsUrl,
    recording: raw.recording !== false,
    requireConsent: raw.requireConsent === true,
    maskSelectors: Array.isArray(raw.maskSelectors) && raw.maskSelectors.length
      ? raw.maskSelectors
      : DEFAULT_MASK.slice(),
    batchIntervalMs: clampInt(raw.batchIntervalMs, 500, 30_000, 2000),
    batchMaxEvents: clampInt(raw.batchMaxEvents, 1, 100, 20),
    mouseThrottleMs: clampInt(raw.mouseThrottleMs, 50, 5000, 200),
    scrollThrottleMs: clampInt(raw.scrollThrottleMs, 50, 5000, 250),
    debug: raw.debug === true,
  };
}

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function pageUrl(): string {
  try {
    return location.href;
  } catch {
    return '';
  }
}

export function pagePath(): string {
  try {
    return location.pathname + location.search;
  } catch {
    return '';
  }
}

export function pageTitle(): string {
  try {
    return document.title || '';
  } catch {
    return '';
  }
}

export function viewport(): { w: number; h: number } {
  return {
    w: window.innerWidth || document.documentElement.clientWidth || 0,
    h: window.innerHeight || document.documentElement.clientHeight || 0,
  };
}

export function scrollDepthPct(): number {
  const doc = document.documentElement;
  const body = document.body;
  const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
  const height = Math.max(
    body.scrollHeight,
    body.offsetHeight,
    doc.clientHeight,
    doc.scrollHeight,
    doc.offsetHeight,
  );
  const view = window.innerHeight || doc.clientHeight || 0;
  if (height <= view) return 100;
  return Math.min(100, Math.round(((scrollTop + view) / height) * 100));
}

export function scheduleIdle(fn: () => void, timeout = 1500): number {
  const ric = (window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (typeof ric === 'function') {
    return ric(fn, { timeout });
  }
  return window.setTimeout(fn, 0) as unknown as number;
}

export function cancelIdle(id: number): void {
  const cic = (window as Window & {
    cancelIdleCallback?: (id: number) => void;
  }).cancelIdleCallback;
  if (typeof cic === 'function') {
    cic(id);
    return;
  }
  clearTimeout(id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  waitMs: number,
): T & { cancel: () => void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Parameters<T> | null = null;

  const run = (args: Parameters<T>) => {
    last = Date.now();
    pending = null;
    fn(...args);
  };

  const wrapped = ((...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = waitMs - (now - last);
    pending = args;
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      run(args);
    } else if (!timer) {
      timer = setTimeout(() => {
        timer = null;
        if (pending) run(pending);
      }, remaining);
    }
  }) as T & { cancel: () => void };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
  };

  return wrapped;
}

export function logDebug(cfg: ResolvedConfig, ...args: unknown[]): void {
  if (cfg.debug) {
    // eslint-disable-next-line no-console
    console.log('[VTH Analytics]', ...args);
  }
}
