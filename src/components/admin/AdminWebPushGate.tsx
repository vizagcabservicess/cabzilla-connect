import { useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { subscribeAdminWebPush } from '@/services/webPushService';

/**
 * Single app-wide hook: when an admin/super_admin session exists, register Web Push once per mount cycle.
 * Kept separate from /admin layout so admins who land on /dashboard still get subscription.
 */
export function AdminWebPushGate() {
  const { isLoading, isAuthenticated, isAdmin } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isAdmin) {
      return;
    }
    if (attempted.current) {
      return;
    }
    attempted.current = true;

    const t = window.setTimeout(() => {
      void (async () => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        const r = await subscribeAdminWebPush();
        if (import.meta.env.DEV && !r.ok && r.reason && r.reason !== 'server_disabled') {
          console.info('[web-push]', r.reason);
        }
      })();
    }, 1200);

    return () => {
      window.clearTimeout(t);
    };
  }, [isLoading, isAuthenticated, isAdmin]);

  return null;
}
