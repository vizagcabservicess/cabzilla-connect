import type { VisitorIdentity } from './types';

const VISITOR_KEY = 'vth_va_visitor';
const SESSION_KEY = 'vth_va_session';
const RETURNING_KEY = 'vth_va_seen';
const COOKIE_DAYS = 365;
const SESSION_IDLE_MS = 30 * 60 * 1000;

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0;
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function storageAvailable(kind: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const s = window[kind];
    const k = '__vth_t';
    s.setItem(k, '1');
    s.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'),
    );
    return match ? decodeURIComponent(match[1]!) : null;
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string, days: number): void {
  try {
    const maxAge = Math.floor(days * 86400);
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
      `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
  } catch {
    // ignore
  }
}

function readPersistent(key: string): string | null {
  if (storageAvailable('localStorage')) {
    try {
      const v = localStorage.getItem(key);
      if (v) return v;
    } catch {
      // fall through
    }
  }
  return readCookie(key);
}

function writePersistent(key: string, value: string): void {
  if (storageAvailable('localStorage')) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // fall through to cookie
    }
  }
  writeCookie(key, value, COOKIE_DAYS);
}

interface SessionRecord {
  id: string;
  touchedAt: number;
}

function readSessionRecord(): SessionRecord | null {
  if (!storageAvailable('sessionStorage')) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionRecord;
    if (!parsed?.id || typeof parsed.touchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionRecord(rec: SessionRecord): void {
  if (!storageAvailable('sessionStorage')) return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(rec));
  } catch {
    // ignore
  }
}

let cached: VisitorIdentity | null = null;

export function resolveIdentity(): VisitorIdentity {
  if (cached) return cached;

  let visitorKey = readPersistent(VISITOR_KEY);
  const seenBefore = Boolean(readPersistent(RETURNING_KEY));
  let isReturning = seenBefore;

  if (!visitorKey) {
    visitorKey = uuid();
    writePersistent(VISITOR_KEY, visitorKey);
    isReturning = false;
  } else if (seenBefore) {
    isReturning = true;
  }

  writePersistent(RETURNING_KEY, '1');

  const now = Date.now();
  let session = readSessionRecord();
  if (!session || now - session.touchedAt > SESSION_IDLE_MS) {
    session = { id: uuid(), touchedAt: now };
  } else {
    session = { id: session.id, touchedAt: now };
  }
  writeSessionRecord(session);

  cached = {
    visitorKey,
    sessionId: session.id,
    visitorId: null,
    isReturning,
  };
  return cached;
}

export function touchSession(): void {
  const id = cached?.sessionId || readSessionRecord()?.id;
  if (!id) return;
  writeSessionRecord({ id, touchedAt: Date.now() });
}

export function applyServerIdentity(res: {
  visitorId: string;
  sessionId: string;
  isReturning: boolean;
  visitorKey?: string;
}): VisitorIdentity {
  const local = resolveIdentity();
  cached = {
    visitorKey: res.visitorKey || local.visitorKey,
    sessionId: res.sessionId,
    visitorId: res.visitorId,
    isReturning: res.isReturning,
  };
  writeSessionRecord({ id: res.sessionId, touchedAt: Date.now() });
  writePersistent(VISITOR_KEY, cached.visitorKey);
  writePersistent(RETURNING_KEY, '1');
  return cached;
}

export function getIdentity(): VisitorIdentity | null {
  return cached;
}

export function clearIdentityCache(): void {
  cached = null;
}
