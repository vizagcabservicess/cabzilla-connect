import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { authAPI } from '@/services/api/authAPI';
import { useAuth } from '@/providers/AuthProvider';

const STORAGE_KEY = 'adminDriverFuelPollSinceId';

/** Dev: Vite proxies /api → backend. Prod: relative URL if SPA and PHP share origin; else set VITE_API_BASE_URL. */
function driverFuelPollUrl(query: string): string {
  const q = query.startsWith('?') ? query : `?${query}`;
  if (import.meta.env.DEV) {
    return `/api/admin/driver-fuel-uploads-poll.php${q}`;
  }
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit && explicit.trim() !== '') {
    return `${explicit.replace(/\/$/, '')}/api/admin/driver-fuel-uploads-poll.php${q}`;
  }
  return `/api/admin/driver-fuel-uploads-poll.php${q}`;
}

/**
 * While any /admin/* page is open, poll for new driver fuel OCR uploads and toast (browser).
 * Depends on AuthProvider: starts only after admin is logged in (JWT in authAPI).
 * Mobile admins get Expo push from upload-fuel-odometer.php instead.
 */
export function AdminDriverFuelRefillPoller() {
  const { isLoading, isAuthenticated, isAdmin, user } = useAuth();
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !isAdmin) {
      return;
    }

    const token =
      authAPI.getToken() ??
      (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null);
    if (!token) {
      if (import.meta.env.DEV) {
        console.warn('[fuel poll] No auth token — admin toasts disabled until login.');
      }
      return;
    }

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let followUpId: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        if (!bootstrapped.current) {
          const initRes = await fetch(driverFuelPollUrl('init=1'), {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!initRes.ok) {
            if (import.meta.env.DEV) {
              console.warn('[fuel poll] init failed', initRes.status, initRes.statusText);
            }
            return;
          }
          const initJson = (await initRes.json()) as { status?: string; latestId?: number };
          if (cancelled) {
            return;
          }
          if (initJson.status === 'success' && initJson.latestId != null) {
            sessionStorage.setItem(STORAGE_KEY, String(initJson.latestId));
          }
          bootstrapped.current = true;
          return;
        }

        const sinceRaw = sessionStorage.getItem(STORAGE_KEY);
        const since = sinceRaw != null ? parseInt(sinceRaw, 10) : 0;
        const res = await fetch(
          driverFuelPollUrl(`since_id=${encodeURIComponent(String(Number.isFinite(since) ? since : 0))}`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          if (import.meta.env.DEV && res.status === 401) {
            console.warn('[fuel poll] 401 — JWT role must be admin or super_admin; deploy driver-fuel-uploads-poll.php');
          }
          return;
        }
        const json = (await res.json()) as {
          status?: string;
          hasNew?: boolean;
          latestId?: number;
          record?: {
            vehicle_number?: string | null;
            phase?: string | null;
            amount?: number | null;
            quantity?: number | null;
            fuel_type?: string | null;
            driver_display_name?: string | null;
          };
        };
        if (json.status !== 'success' || cancelled) {
          return;
        }
        if (json.latestId != null) {
          sessionStorage.setItem(STORAGE_KEY, String(json.latestId));
        }
        if (json.hasNew && json.record) {
          const r = json.record;
          const veh = (r.vehicle_number && String(r.vehicle_number).trim()) || '';
          const ft = String(r.fuel_type || '').toLowerCase();
          const unit = ft === 'cng' ? 'kg' : 'L';
          const hasAmt = r.amount != null && Number(r.amount) > 0;
          const hasQty = r.quantity != null && Number(r.quantity) > 0;
          const fmtInr = (n: number) =>
            `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          const fmtQ = (n: number) => String(Number(n).toFixed(4)).replace(/\.?0+$/, '');
          let refillBit = '';
          if (hasAmt && hasQty) {
            refillBit = `${fmtInr(Number(r.amount))}, ${fmtQ(Number(r.quantity))} ${unit}`;
          } else if (hasAmt) {
            refillBit = fmtInr(Number(r.amount));
          } else if (hasQty) {
            refillBit = `${fmtQ(Number(r.quantity))} ${unit}`;
          }
          const driverLabel =
            (r.driver_display_name && String(r.driver_display_name).trim()) || 'A driver';
          const vehPhrase = veh !== '' ? `vehicle no ${veh}` : 'vehicle';
          const body =
            refillBit !== ''
              ? `${driverLabel} has refilled ${refillBit} for ${vehPhrase}.`
              : `${driverLabel} submitted fuel for ${vehPhrase}.`;
          const title = `Fuel refill · ${veh || '—'}`;
          toast.info(title, { description: body });
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(title, { body, tag: `fuel-refill-${json.latestId ?? ''}` });
            } catch {
              /* ignore */
            }
          }
        }
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('[fuel poll] request error', e);
        }
      }
    };

    void poll();

    intervalId = window.setInterval(poll, 30_000);
    followUpId = window.setTimeout(() => {
      if (!cancelled && bootstrapped.current) {
        void poll();
      }
    }, 8000);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && bootstrapped.current) {
        void poll();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      if (followUpId) {
        window.clearTimeout(followUpId);
      }
      document.removeEventListener('visibilitychange', onVisible);
      bootstrapped.current = false;
    };
  }, [isLoading, isAuthenticated, isAdmin, user?.id]);

  return null;
}
