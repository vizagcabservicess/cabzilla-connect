/**
 * Web Push (VAPID) for admin browsers — pairs with register-web-push.php + sw.js push handler.
 */

import { authAPI } from '@/services/api/authAPI';

function apiPath(path: string): string {
  if (import.meta.env.DEV) {
    return path;
  }
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
  if (base && base.trim() !== '') {
    return `${base}${path}`;
  }
  return path;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

function canUseWebPush(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  const { protocol, hostname } = window.location;
  const isLocalhost =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  if (protocol !== 'https:' && !isLocalhost) {
    return false;
  }
  return true;
}

/**
 * Registers /sw.js, subscribes to push, POSTs subscription to the API. Safe to call multiple times (idempotent per endpoint).
 */
export async function subscribeAdminWebPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!canUseWebPush()) {
    return { ok: false, reason: 'unsupported_or_insecure_context' };
  }

  const token =
    authAPI.getToken() ??
    (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null);
  if (!token) {
    return { ok: false, reason: 'no_token' };
  }

  let cfg: { enabled?: boolean; publicKey?: string | null };
  try {
    const res = await fetch(apiPath('/api/public/web-push-vapid-public.php'));
    cfg = (await res.json()) as { enabled?: boolean; publicKey?: string | null };
  } catch {
    return { ok: false, reason: 'config_fetch_failed' };
  }

  if (!cfg.enabled || !cfg.publicKey) {
    return { ok: false, reason: 'server_disabled' };
  }

  if (Notification.permission === 'denied') {
    return { ok: false, reason: 'notification_denied' };
  }

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { ok: false, reason: 'notification_not_granted' };
    }
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await navigator.serviceWorker.register('/sw.js');
    await registration.update();
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[web-push] SW register failed', e);
    }
    return { ok: false, reason: 'sw_register_failed' };
  }

  const ready = await navigator.serviceWorker.ready;
  let subscription = await ready.pushManager.getSubscription();
  try {
    if (!subscription) {
      subscription = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });
    }
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[web-push] subscribe failed', e);
    }
    return { ok: false, reason: 'push_subscribe_failed' };
  }

  const subJson = subscription.toJSON();
  if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
    return { ok: false, reason: 'invalid_subscription' };
  }

  try {
    const res = await fetch(apiPath('/api/auth/register-web-push.php'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: {
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth,
        },
      }),
    });
    const data = (await res.json()) as { status?: string };
    if (!res.ok || data.status !== 'success') {
      if (import.meta.env.DEV) {
        console.warn('[web-push] register HTTP', res.status, data);
      }
      return { ok: false, reason: 'register_http_failed' };
    }
    return { ok: true };
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('[web-push] register POST failed', e);
    }
    return { ok: false, reason: 'register_network_failed' };
  }
}
