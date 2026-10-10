import { getApiUrl } from '@/config/api';
import { driverPortalAPI } from '@/services/api/eventDutyAPI';

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
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
  const { protocol, hostname } = window.location;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  return protocol === 'https:' || isLocalhost;
}

/** Asks for notification permission when needed, then stores this duty page's push subscription. */
export async function armDriverDutyAlerts(token: string): Promise<boolean> {
  if (!canUseWebPush() || !token) return false;
  if (Notification.permission === 'denied') return false;
  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
  }

  try {
    await navigator.serviceWorker.register('/sw.js');
  } catch {
    return Notification.permission === 'granted';
  }

  let cfg: { enabled?: boolean; publicKey?: string | null };
  try {
    const res = await fetch(getApiUrl('/api/public/web-push-vapid-public.php'));
    cfg = (await res.json()) as { enabled?: boolean; publicKey?: string | null };
  } catch {
    return Notification.permission === 'granted';
  }
  if (!cfg.enabled || !cfg.publicKey) return Notification.permission === 'granted';

  try {
    const ready = await navigator.serviceWorker.ready;
    let subscription = await ready.pushManager.getSubscription();
    if (!subscription) {
      subscription = await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.publicKey),
      });
    }
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
      return Notification.permission === 'granted';
    }
    const openPath = window.location.pathname;
    if (!/^\/driver\/register\/[a-fA-F0-9]{16,128}$/.test(openPath)) {
      return Notification.permission === 'granted';
    }
    await driverPortalAPI.registerPush(token, {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      openPath,
    });
  } catch {
    return Notification.permission === 'granted';
  }
  return true;
}

/** Shows a duty alert on this phone. Returns false when notifications are not allowed. */
async function showDutyNotification(title: string, body: string, url: string, tag: string): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    icon: '/og-image.png',
    badge: '/og-image.png',
    tag,
    renotify: true,
    data: { url },
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    // The page notification below still rings when the duty tab is open.
  }
  try {
    const note = new Notification(title, { body, tag });
    note.onclick = () => {
      window.focus();
      note.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Shows the end-duty alert on this phone. Returns false when notifications are not allowed. */
export async function showDutyEndNotification(url: string, tag: string): Promise<boolean> {
  return showDutyNotification(
    'Please end your duty',
    'End this trip now. Time after this message is not counted.',
    url,
    tag,
  );
}

/** Shows the drop-off prompt on this phone. Returns false when notifications are not allowed. */
export async function showDutyParkingNotification(url: string, tag: string): Promise<boolean> {
  return showDutyNotification(
    'You are on a trip',
    'When you drop the guest, tap In Parking.',
    url,
    tag,
  );
}
