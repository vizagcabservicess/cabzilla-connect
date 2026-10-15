import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, ImagePlus } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { EventLinkSeo } from '@/components/events/EventLinkSeo';
import { DriverFace } from '@/components/events/DriverFace';
import { AddToHomeButton } from '@/components/events/AddToHomeButton';
import { EventDutyDetailScreen } from '@/components/events/EventDutyDetailScreen';
import { driverPortalAPI } from '@/services/api/eventDutyAPI';
import { armDriverDutyAlerts, showDutyEndNotification, showDutyParkingNotification } from '@/lib/eventDutyPush';
import {
  downscaleImageFile,
  dutyStatusLabel,
  formatDutyDate,
  formatDutyDateRange,
  formatReportingTime,
  formatServerTime,
  keepFilled,
  type DriverEndNotice,
  parseDocumentOcr,
  type DocumentOcrFields,
  type DocumentOcrKind,
} from '@/lib/eventDuty';
import type { DriverPortalBootstrap, EventDuty } from '@/types/eventDuty';

const StartDutyCheckScreen = lazy(() => import('@/components/events/StartDutyCheckScreen').then((m) => ({ default: m.StartDutyCheckScreen })));
const ImageCropDialog = lazy(() => import('@/components/events/CroppableFileField').then((m) => ({ default: m.ImageCropDialog })));

function isCroppableImage(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
}

function isInVthApp(search: URLSearchParams): boolean {
  return search.get('inApp') === '1' || Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView);
}

function DriverHomeAction({ inApp }: { inApp: boolean }) {
  if (inApp) return null;
  return <AddToHomeButton kind="driver" title="Event Vehicle Duty" shortName="Duty" />;
}

function applyEndNotices(data: DriverPortalBootstrap, notices: DriverEndNotice[]): DriverPortalBootstrap {
  const byId = new Map(notices.map((notice) => [notice.id, notice]));
  return {
    ...data,
    duties: data.duties.map((duty) => {
      const notice = byId.get(duty.id);
      if (!notice) return duty;
      return {
        ...duty,
        status: notice.status,
        closingAt: notice.closingAt,
        endRequestedAt: notice.endRequestedAt,
        endRequestSeenAt: notice.endRequestSeenAt,
        endRequestNonce: notice.endRequestNonce,
        pausedSeconds: notice.pausedSeconds ?? duty.pausedSeconds,
        dutyPlace: notice.dutyPlace === 'parking' ? 'parking' : (notice.dutyPlace === 'trip' ? 'trip' : duty.dutyPlace),
        parkingPromptAt: notice.parkingPromptAt,
        parkingPromptNonce: notice.parkingPromptNonce,
      };
    }),
  };
}

function notifyNativeDutyChange() {
  const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (msg: string) => void } }).ReactNativeWebView;
  bridge?.postMessage(JSON.stringify({ type: 'event-duty-sync' }));
}

export default function DriverPortalPage() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();
  const inApp = isInVthApp(searchParams);
  const [data, setData] = useState<DriverPortalBootstrap | null>(null);
  const [error, setError] = useState('');
  const [registeredOk, setRegisteredOk] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await driverPortalAPI.bootstrap(token);
      setData(res);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid link');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const markSeen = useCallback((dutyId: number) => {
    setData((prev) => prev ? {
      ...prev,
      duties: prev.duties.map((duty) => (
        duty.id === dutyId && !duty.endRequestSeenAt
          ? { ...duty, endRequestSeenAt: new Date().toISOString() }
          : duty
      )),
    } : prev);
  }, []);

  const markParked = useCallback((dutyId: number) => {
    setData((prev) => prev ? {
      ...prev,
      duties: prev.duties.map((duty) => (
        duty.id === dutyId
          ? { ...duty, dutyPlace: 'parking', parkingPromptNonce: null }
          : duty
      )),
    } : prev);
  }, []);

  const watchingEnd = Boolean(data?.duties.some((duty) => duty.status === 'in_progress' && !duty.closingAt));
  useEffect(() => {
    if (!token || !watchingEnd) return;
    let cancelled = false;
    const pull = () => {
      void driverPortalAPI.endNotices(token).then((notices) => {
        if (cancelled) return;
        setData((prev) => {
          if (!prev) return prev;
          const finished = notices.some((notice) => {
            const before = prev.duties.find((duty) => duty.id === notice.id);
            return Boolean(before && !before.closingAt && notice.closingAt);
          });
          if (finished) {
            queueMicrotask(() => {
              void driverPortalAPI.bootstrap(token).then((next) => {
                if (!cancelled) setData(next);
              }).catch(() => undefined);
            });
          }
          return applyEndNotices(prev, notices);
        });
      }).catch(() => undefined);
    };
    pull();
    const id = window.setInterval(pull, 10000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, watchingEnd]);

  if (error) {
    return (
      <Shell>
        <EventLinkSeo title="Driver Duty | Vizag Taxi Hub" description="This driver duty link is invalid or has expired." />
        <p className="text-center text-red-600">{error}</p>
      </Shell>
    );
  }
  if (!data) {
    return (
      <Shell>
        <EventLinkSeo title="Driver Duty | Vizag Taxi Hub" description="Complete driver registration and start duty for this Vizag Taxi Hub event." />
        <p className="text-center">Loading…</p>
      </Shell>
    );
  }

  const dutyTitle = `${data.event.name} | Driver Duty | Vizag Taxi Hub`;
  const dutyDescription = `Register and start duty for ${data.assignment.vehicleTypeLabel} — ${data.event.name}.`;

  if (!data.registered && !registeredOk) {
    return (
      <Shell>
        <EventLinkSeo title={dutyTitle} description={dutyDescription} />
        <DriverHomeAction inApp={inApp} />
        <div className="flex justify-center">
          <Logo
            size="small"
            linkless
            className="[&_img]:h-10 [&_img]:w-auto [&_img]:max-w-none [&_img]:object-contain"
          />
        </div>
        <DriverProfileCard data={data} token={token} />
        <RegisterForm
          data={data}
          token={token}
          busy={busy}
          setBusy={setBusy}
          onDone={async () => {
            setRegisteredOk(true);
            toast.success('Registration submitted successfully.');
            await load();
          }}
        />
      </Shell>
    );
  }

  return (
    <>
      <EventLinkSeo title={dutyTitle} description={dutyDescription} />
      <DutiesHome
        data={data}
        token={token}
        onReload={load}
        inApp={inApp}
        onSeen={markSeen}
        onParked={markParked}
      />
    </>
  );
}

function DriverProfileCard({ data, token }: { data: DriverPortalBootstrap; token: string }) {
  const name = data.assignment.driverName || 'Driver';
  const mobile = data.assignment.driverMobile || '';
  const photoId = data.documents?.driver_photo?.id;
  const [photoUrl, setPhotoUrl] = useState<string | null>(data.driverPhoto || null);
  useEffect(() => {
    if (data.driverPhoto || !photoId) return;
    let cancelled = false;
    let objectUrl = '';
    void driverPortalAPI.mediaObjectUrl(token, photoId).then((url) => {
      if (cancelled || !url) return;
      objectUrl = url;
      setPhotoUrl(url);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data.driverPhoto, photoId, token]);

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
      <DriverFace
        name={name}
        mobile={mobile}
        photoUrl={photoUrl}
        className="h-14 w-14 rounded-full object-cover"
      />
      <div className="min-w-0">
        <div className="truncate font-semibold">{name}</div>
        {mobile ? (
          <a className="text-sm text-blue-600" href={`tel:${mobile}`}>{mobile}</a>
        ) : (
          <div className="text-sm text-muted-foreground">Mobile not added yet</div>
        )}
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-md space-y-4">{children}</div>
    </div>
  );
}

function RegisterForm({
  data, token, busy, setBusy, onDone,
}: {
  data: DriverPortalBootstrap;
  token: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(data.assignment.driverName || '');
  const [mobile, setMobile] = useState(data.assignment.driverMobile || '');
  const [dl, setDl] = useState(data.assignment.licenseNo || '');
  const [aadhaar, setAadhaar] = useState('');
  const [files, setFiles] = useState<Record<string, File | undefined>>({});

  const setFile = (key: string, file?: File) => setFiles((prev) => ({ ...prev, [key]: file }));

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <h2 className="text-lg font-semibold">Driver Registration</h2>
        <Info label="Event" value={data.event.name} />
        <Info label="Assigned vehicle" value={data.assignment.vehicleTypeLabel} />
        <Info label="Vehicle number" value={data.assignment.vehicleNumber || 'Will be confirmed by VTH'} />
        <Info label="Pickup location" value={data.assignment.reportingLocation || data.event.reportingLocation || 'Will be confirmed by VTH'} />
        <Info label="Reporting time" value={formatReportingTime(data.assignment.reportingTime || data.event.defaultReportingTime) || 'Will be confirmed by VTH'} />
        <Info label="Duty dates" value={formatDutyDateRange(data.assignment.dates)} />
        <div><Label>Full name</Label><Input className="h-12" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Mobile number</Label><Input className="h-12" inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
        <div><Label>DL number</Label><Input className="h-12" value={dl} onChange={(e) => setDl(e.target.value.toUpperCase())} /></div>
        <div><Label>Aadhaar number</Label><Input className="h-12" inputMode="numeric" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} /></div>
        <CameraField label="Driver photo" onFile={(f) => setFile('driver_photo', f)} />
        <CameraField
          label="DL front"
          kind="dl"
          token={token}
          onFile={(f) => setFile('dl_front', f)}
          onExtracted={(fields) => {
            setName((v) => keepFilled(v, fields.fullName));
            setDl((v) => keepFilled(v, fields.licenseNumber));
            if (fields.fullName || fields.licenseNumber) toast.success('Details filled from the licence photo');
          }}
        />
        <CameraField label="DL back (optional)" onFile={(f) => setFile('dl_back', f)} />
        <CameraField
          label="Aadhaar front"
          kind="aadhaar"
          token={token}
          onFile={(f) => setFile('aadhaar', f)}
          onExtracted={(fields) => {
            setName((v) => keepFilled(v, fields.fullName));
            setAadhaar((v) => keepFilled(v, fields.aadhaarNumber));
            if (fields.fullName || fields.aadhaarNumber) toast.success('Details filled from the Aadhaar photo');
          }}
        />
        <CameraField label="Aadhaar back (optional)" onFile={(f) => setFile('aadhaar_back', f)} />
        {data.needVehicleDocuments && (
          <>
            <p className="text-sm font-medium">Vehicle documents (not yet on file)</p>
            <CameraField label="RC front" onFile={(f) => setFile('rc', f)} />
            <CameraField label="RC back (optional)" onFile={(f) => setFile('rc_back', f)} />
            <CameraField label="Insurance front" onFile={(f) => setFile('insurance', f)} />
            <CameraField label="Insurance back (optional)" onFile={(f) => setFile('insurance_back', f)} />
          </>
        )}
        <Button className="h-12 w-full text-base" disabled={busy} onClick={async () => {
          const form = new FormData();
          form.append('fullName', name);
          form.append('mobile', mobile);
          form.append('licenseNumber', dl);
          form.append('aadhaarNumber', aadhaar);
          Object.entries(files).forEach(([k, f]) => { if (f) form.append(k, f); });
          setBusy(true);
          try {
            await driverPortalAPI.register(token, form);
            onDone();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Registration failed');
          } finally {
            setBusy(false);
          }
        }}>Submit registration</Button>
      </CardContent>
    </Card>
  );
}

type DutyTrackState = 'off' | 'locating' | 'need' | 'sharing' | 'other';

function isDutyPhone(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function preciseFix(pos: GeolocationPosition): boolean {
  const accuracy = pos.coords.accuracy;
  return Number.isFinite(accuracy) && accuracy > 0 && accuracy <= 120;
}

function dutyGpsClientId(): string {
  const key = 'vth-duty-gps-client';
  try {
    const existing = localStorage.getItem(key);
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing;
    const next = `web-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem(key, next);
    return next;
  } catch {
    return 'web-session';
  }
}

function useOpenDutyTracking(token: string, duties: EventDuty[], enabled: boolean): {
  state: DutyTrackState;
  takeOver: () => void;
  stopSharing: () => void;
} {
  const [state, setState] = useState<DutyTrackState>('off');
  const [generation, setGeneration] = useState(0);
  const claimRef = useRef(true);
  const pausedRef = useRef(false);
  const stopRef = useRef<(() => void) | null>(null);
  const openIds = duties
    .filter((duty) => duty.openingAt && !duty.closingAt && duty.status === 'in_progress')
    .map((duty) => duty.id)
    .join(',');

  useEffect(() => {
    if (!enabled || !openIds || pausedRef.current) {
      if (!pausedRef.current) setState('off');
      return;
    }
    if (!navigator.geolocation || !isDutyPhone()) {
      setState(isDutyPhone() ? 'need' : 'off');
      return;
    }
    setState('locating');
    const ids = openIds.split(',').map(Number).filter((id) => id > 0);
    const clientId = dutyGpsClientId();
    let stopped = false;
    let lastSent = 0;
    let sawFix = false;
    let wake: { release: () => Promise<void> } | null = null;
    let watch = 0;
    let timer = 0;
    let best: GeolocationPosition | null = null;
    const halt = () => {
      stopped = true;
      if (watch) navigator.geolocation.clearWatch(watch);
      if (timer) window.clearInterval(timer);
    };
    const send = (pos: GeolocationPosition, force = false) => {
      if (stopped) return;
      if (!best || (pos.coords.accuracy > 0 && pos.coords.accuracy < best.coords.accuracy)) best = pos;
      if (!preciseFix(pos) && best && preciseFix(best) && Date.now() - best.timestamp < 30000) pos = best;
      const now = Date.now();
      const minGap = preciseFix(pos) ? 10000 : 20000;
      if (!force && now - lastSent < minGap) return;
      lastSent = now;
      const claim = claimRef.current;
      claimRef.current = false;
      ids.forEach((dutyId) => {
        void driverPortalAPI.pingGps(token, {
          dutyId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: Number.isFinite(pos.coords.speed) ? pos.coords.speed : null,
          heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : null,
          clientId,
          claim,
        }).then((res) => {
          if (stopped) return;
          if (res.accepted === false) {
            setState('need');
            return;
          }
          sawFix = true;
          setState('sharing');
        }).catch(() => {
          if (!stopped && !sawFix) setState('need');
        });
      });
    };
    const readFix = (highAccuracy: boolean) => new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 20000 : 12000,
        maximumAge: 0,
      });
    });
    const grab = (force = false) => {
      void readFix(false).then((rough) => {
        if (force || preciseFix(rough) || !best || !preciseFix(best)) send(rough, true);
      }).catch((err: GeolocationPositionError) => {
        if (err?.code === 1 && !sawFix) setState('need');
      });
      void readFix(true).then((exact) => send(exact, true)).catch((err: GeolocationPositionError) => {
        if (err?.code === 1 && !sawFix) setState('need');
      });
    };
    watch = navigator.geolocation.watchPosition((pos) => send(pos, preciseFix(pos)), (err) => {
      if (err.code === 1 && !sawFix) setState('need');
    }, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 25000,
    });
    timer = window.setInterval(() => grab(false), 15000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') grab(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onVisible);
    const lock = navigator.wakeLock;
    if (lock?.request) {
      lock.request('screen').then((sent) => { wake = sent; }).catch(() => undefined);
    }
    stopRef.current = () => {
      halt();
      setState('off');
      ids.forEach((dutyId) => {
        void driverPortalAPI.pingGps(token, {
          dutyId,
          lat: 0,
          lng: 0,
          clientId,
          release: true,
        }).catch(() => undefined);
      });
    };
    grab(true);
    return () => {
      halt();
      stopRef.current = null;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onVisible);
      void wake?.release();
    };
  }, [enabled, token, openIds, generation]);

  return {
    state,
    takeOver: () => {
      pausedRef.current = false;
      claimRef.current = true;
      setGeneration((n) => n + 1);
    },
    stopSharing: () => {
      pausedRef.current = true;
      stopRef.current?.();
    },
  };
}

function DutyLocationBanner({
  state, onTakeOver,
}: {
  state: DutyTrackState;
  onTakeOver: () => void;
}) {
  switch (state) {
    case 'off':
    case 'locating':
    case 'sharing':
    case 'other':
      return null;
    case 'need':
      return (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p className="font-semibold">Allow location so the trip can be tracked.</p>
          <button type="button" className="mt-2 h-10 w-full rounded-lg bg-amber-500 text-sm font-bold text-white" onClick={onTakeOver}>
            Allow location
          </button>
        </div>
      );
    default: {
      const _never: never = state;
      return _never;
    }
  }
}

function pickDuty(duties: EventDuty[]): EventDuty | null {
  return duties.find((duty) => duty.status === 'in_progress') || duties[0] || null;
}

function isParkingPrompt(duty: EventDuty | null | undefined): boolean {
  return Boolean(
    duty
    && duty.status === 'in_progress'
    && duty.openingAt
    && !duty.closingAt
    && duty.dutyPlace !== 'parking'
    && duty.parkingPromptNonce,
  );
}

function DutiesHome({
  data, token, onReload, inApp, onSeen, onParked,
}: {
  data: DriverPortalBootstrap;
  token: string;
  onReload: () => void;
  inApp: boolean;
  onSeen: (dutyId: number) => void;
  onParked: (dutyId: number) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(() => pickDuty(data.duties)?.id ?? null);
  const [listOpen, setListOpen] = useState(false);
  const [active, setActive] = useState<EventDuty | null>(null);
  const [mode, setMode] = useState<'start' | 'end' | null>(null);
  const [flowOn, setFlowOn] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ url: string; title: string } | null>(null);
  const [alertPermission, setAlertPermission] = useState<NotificationPermission | 'unsupported'>(() => (
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  ));
  const [parkingBusy, setParkingBusy] = useState(false);
  const [dismissedPrompt, setDismissedPrompt] = useState('');
  const tracking = useOpenDutyTracking(token, data.duties, true);

  useEffect(() => {
    if (!mode) {
      setFlowOn(false);
      return;
    }
    setFlowOn(false);
    const frame = window.requestAnimationFrame(() => setFlowOn(true));
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);

  const closeFlow = () => {
    setFlowOn(false);
    window.setTimeout(() => {
      setActive(null);
      setMode(null);
    }, 280);
  };

  const duty = data.duties.find((row) => row.id === selectedId) || pickDuty(data.duties);
  const fallbackPlace = data.assignment.reportingLocation || data.event.reportingLocation || '';
  const manyDuties = data.duties.length > 1;
  const faceId = data.documents?.driver_photo?.id;
  const [driverPhoto, setDriverPhoto] = useState<string | null>(data.driverPhoto || null);
  const [openingPhoto, setOpeningPhoto] = useState<string | null>(null);
  const [closingPhoto, setClosingPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (data.driverPhoto || !faceId) return;
    let cancelled = false;
    let objectUrl = '';
    void driverPortalAPI.mediaObjectUrl(token, faceId).then((url) => {
      if (cancelled || !url) return;
      objectUrl = url;
      setDriverPhoto(url);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data.driverPhoto, faceId, token]);
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    const load = (id: number | null | undefined, setUrl: (url: string | null) => void) => {
      if (!id) {
        setUrl(null);
        return;
      }
      void driverPortalAPI.mediaObjectUrl(token, id).then((url) => {
        if (cancelled || !url) return;
        urls.push(url);
        setUrl(url);
      }).catch(() => undefined);
    };
    load(duty?.openingPhotoId, setOpeningPhoto);
    load(duty?.closingPhotoId, setClosingPhoto);
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [duty?.openingPhotoId, duty?.closingPhotoId, token]);

  const openDuty = Boolean(duty && duty.status === 'in_progress' && !duty.closingAt);
  const noticeKey = data.duties
    .filter((row) => row.status === 'in_progress' && row.endRequestedAt && !row.closingAt)
    .map((row) => `${row.id}:${row.endRequestNonce || 'ask'}`)
    .join(',');
  const parkingKey = data.duties
    .filter((row) => isParkingPrompt(row))
    .map((row) => `${row.id}:${row.parkingPromptNonce}`)
    .join(',');

  useEffect(() => {
    if (!openDuty || alertPermission !== 'granted') return;
    void armDriverDutyAlerts(token);
  }, [openDuty, alertPermission, token]);

  useEffect(() => {
    if (!noticeKey || alertPermission !== 'granted') return;
    const path = window.location.pathname;
    noticeKey.split(',').forEach((part) => {
      const storageKey = `vth-end-notice-${part}`;
      if (sessionStorage.getItem(storageKey)) return;
      void showDutyEndNotification(path, `event-duty-end-${part}`).then((shown) => {
        if (shown) sessionStorage.setItem(storageKey, '1');
      });
    });
  }, [noticeKey, alertPermission]);

  useEffect(() => {
    if (!parkingKey || alertPermission !== 'granted') return;
    const path = window.location.pathname;
    parkingKey.split(',').forEach((part) => {
      const storageKey = `vth-parking-notice-${part}`;
      if (sessionStorage.getItem(storageKey)) return;
      void showDutyParkingNotification(path, `event-duty-parking-${part}`).then((shown) => {
        if (shown) sessionStorage.setItem(storageKey, '1');
      });
    });
  }, [parkingKey, alertPermission]);

  const markParking = async (dutyId: number) => {
    if (parkingBusy) return;
    setParkingBusy(true);
    try {
      await driverPortalAPI.markParking(token, dutyId);
      onParked(dutyId);
      toast.success('Marked In Parking');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not mark In Parking');
    } finally {
      setParkingBusy(false);
    }
  };

  const prompted = data.duties.find((row) => row.id === duty?.id && isParkingPrompt(row))
    || data.duties.find((row) => isParkingPrompt(row))
    || null;
  const promptKey = prompted ? `${prompted.id}:${prompted.parkingPromptNonce}` : '';
  const showParkingPopup = Boolean(prompted) && !mode && dismissedPrompt !== promptKey;
  const parkingPopup = showParkingPopup && prompted ? (
    <div className="fixed inset-0 z-[10040] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" role="dialog" aria-labelledby="parking-prompt-title">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">In Trip</div>
        <h2 id="parking-prompt-title" className="mt-1 text-lg font-bold text-slate-900">You are on a trip</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          When you drop the guest, tap In Parking. The event manager will see it on the vehicle list.
        </p>
        <button
          type="button"
          disabled={parkingBusy}
          onClick={() => { void markParking(prompted.id); }}
          className="mt-4 h-12 w-full rounded-xl bg-amber-500 text-sm font-bold text-white disabled:opacity-70"
        >
          {parkingBusy ? 'Saving…' : 'In Parking'}
        </button>
        <button
          type="button"
          disabled={parkingBusy}
          onClick={() => setDismissedPrompt(promptKey)}
          className="mt-2 h-10 w-full text-sm font-semibold text-slate-500"
        >
          Guest not dropped yet
        </button>
      </div>
    </div>
  ) : null;

  const bannerDutyId = duty && openDuty && duty.endRequestedAt && !mode ? duty.id : 0;
  useEffect(() => {
    if (!bannerDutyId || !duty?.endRequestedAt || duty.endRequestSeenAt) return;
    let cancelled = false;
    const ack = () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      void driverPortalAPI.ackEndNotice(token, bannerDutyId).then(() => {
        if (!cancelled) onSeen(bannerDutyId);
      }).catch(() => undefined);
    };
    ack();
    document.addEventListener('visibilitychange', ack);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', ack);
    };
  }, [bannerDutyId, duty?.endRequestedAt, duty?.endRequestSeenAt, token, onSeen]);

  if (!duty) {
    return (
      <Shell>
        <DriverHomeAction inApp={inApp} />
        <p className="text-center text-slate-500">No duties assigned yet.</p>
      </Shell>
    );
  }

  if (manyDuties && listOpen) {
    return (
      <>
      <Shell>
        <DriverHomeAction inApp={inApp} />
        <DutyLocationBanner state={tracking.state} onTakeOver={tracking.takeOver} />
        <h2 className="text-xl font-bold">MY DUTIES</h2>
        {data.duties.map((row) => (
          <button
            key={row.id}
            type="button"
            className="w-full rounded-2xl border bg-white p-4 text-left shadow-sm"
            onClick={() => { setSelectedId(row.id); setListOpen(false); }}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold">{formatDutyDate(row.dutyDate)}</div>
              <Badge>{dutyStatusLabel(row.status)}</Badge>
            </div>
            <div className="mt-1 text-sm text-slate-500">{row.vehicleNumber || data.assignment.vehicleNumber}</div>
            {row.status === 'in_progress' && row.endRequestedAt && !row.closingAt ? (
              <div className="mt-2 rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-semibold text-white">
                Please end this duty. Time after {formatServerTime(row.endRequestedAt)} is not counted.
              </div>
            ) : null}
            {isParkingPrompt(row) ? (
              <div className="mt-2 rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-semibold text-white">
                When you drop the guest, tap In Parking.
              </div>
            ) : null}
          </button>
        ))}
      </Shell>
      {parkingPopup}
      </>
    );
  }

  const pickup = duty.reportingLocation || fallbackPlace || '—';
  const showStart = duty.status === 'not_started' || duty.status === 'scheduled' || duty.needsOpeningReupload;
  const showEnd = duty.status === 'in_progress' && !duty.needsOpeningReupload;

  return (
    <>
      <EventDutyDetailScreen
        model={{
          dutyDate: duty.dutyDate,
          eventName: data.event.name,
          vehicleType: data.assignment.vehicleTypeLabel,
          vehicleNumber: duty.vehicleNumber || data.assignment.vehicleNumber || '',
          driverName: data.assignment.driverName || 'Driver',
          driverMobile: data.assignment.driverMobile || '',
          driverPhotoUrl: driverPhoto,
          pickupLocation: pickup,
          reportingTime: duty.reportingTime || data.assignment.reportingTime || data.event.defaultReportingTime || '',
          reportingLocation: pickup,
          locationName: duty.openingGps?.address || duty.closingGps?.address || '—',
          status: duty.status,
          openingAt: duty.openingAt,
          closingAt: duty.closingAt,
          endRequestedAt: duty.endRequestedAt,
          pausedSeconds: duty.pausedSeconds,
          openingKm: duty.openingKm,
          closingKm: duty.closingKm,
          totalKm: duty.totalKm,
          openingGps: duty.openingGps,
          closingGps: duty.closingGps,
          openingPhotoUrl: openingPhoto,
          closingPhotoUrl: closingPhoto,
        }}
        onBack={mode ? closeFlow : (manyDuties ? () => setListOpen(true) : undefined)}
        callButton={{ label: 'Call Support', number: data.event.supportMobile || '9966363662' }}
        onStartDuty={showStart ? () => { setActive(duty); setMode('start'); } : undefined}
        onEndDuty={showEnd || duty.needsClosingReupload ? () => { setActive(duty); setMode('end'); } : undefined}
        onPhotoClick={(url, title) => setPhotoPreview({ url, title })}
        parkingAction={isParkingPrompt(duty) && !mode && !showParkingPopup ? {
          busy: parkingBusy,
          onParking: () => { void markParking(duty.id); },
        } : null}
        homeAction={<DriverHomeAction inApp={inApp} />}
        alertBar={!mode ? (
          <>
            <DutyLocationBanner state={tracking.state} onTakeOver={tracking.takeOver} />
            {showEnd && alertPermission === 'default' ? (
              <button
                type="button"
                className="w-full rounded-xl bg-white px-3 py-2 text-left shadow-sm"
                onClick={() => {
                  void armDriverDutyAlerts(token).then((ok) => {
                    setAlertPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
                    if (!ok) return;
                    if (duty.endRequestedAt) {
                      const tag = `event-duty-end-${duty.id}:${duty.endRequestNonce || 'ask'}`;
                      void showDutyEndNotification(window.location.pathname, tag);
                    }
                    if (isParkingPrompt(duty)) {
                      void showDutyParkingNotification(window.location.pathname, `event-duty-parking-${duty.id}:${duty.parkingPromptNonce}`);
                    }
                  });
                }}
              >
                <span className="text-sm font-semibold text-slate-800">Allow duty alerts</span>
                <span className="mt-0.5 block text-xs text-slate-500">So a trip or end-duty message still reaches you if this page is in the background.</span>
              </button>
            ) : null}
          </>
        ) : undefined}
        panel={active && mode ? (
          <div className={`transition-opacity duration-300 ease-out ${flowOn ? 'opacity-100' : 'opacity-0'}`}>
            <Suspense fallback={<p className="p-4 text-center text-sm text-slate-500">Loading…</p>}>
            <StartDutyCheckScreen
              mode={mode}
              token={token}
              dutyId={active.id}
              openingKm={active.openingKm}
              eventName={data.event.name}
              dutyDate={active.dutyDate}
              reportingTime={active.reportingTime || data.assignment.reportingTime || data.event.defaultReportingTime || ''}
              reportingLocation={active.reportingLocation || data.assignment.reportingLocation || data.event.reportingLocation || ''}
              locationName={active.openingGps?.address || active.closingGps?.address || ''}
              gpsRequired={data.gpsRequired}
              onClose={closeFlow}
              onDone={async () => {
                notifyNativeDutyChange();
                closeFlow();
                await onReload();
              }}
            />
            </Suspense>
          </div>
        ) : undefined}
      />
      {parkingPopup}
      {duty.needsOpeningReupload && (
        <p className="fixed inset-x-0 bottom-16 z-20 px-4 text-center text-xs text-amber-700">VTH asked you to take the opening odometer photo again.</p>
      )}
      {photoPreview && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/60 p-4" onClick={() => setPhotoPreview(null)}>
          <div className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-xl bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="mb-2 text-sm text-blue-600" onClick={() => setPhotoPreview(null)}>Close</button>
            <img src={photoPreview.url} alt={photoPreview.title} className="max-h-[75vh] w-full rounded object-contain" />
          </div>
        </div>
      )}
    </>
  );
}

function isLiveCameraPhoto(file: File): boolean {
  if (file.lastModified <= 0) return true;
  return Date.now() - file.lastModified <= 3 * 60 * 1000;
}

function CameraField({
  label, onFile, cropOnSelect = true, cameraOnly = false, kind, token, onExtracted,
}: {
  label: string;
  onFile: (file?: File) => void;
  cropOnSelect?: boolean;
  cameraOnly?: boolean;
  kind?: DocumentOcrKind;
  token?: string;
  onExtracted?: (fields: DocumentOcrFields) => void;
}) {
  const [source, setSource] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const applyFile = (file?: File) => {
    onFile(file);
    if (!file || !kind || !token || !onExtracted) return;
    void (async () => {
      try {
        const compact = await downscaleImageFile(file);
        const res = await driverPortalAPI.ocr(token, compact);
        onExtracted(parseDocumentOcr(kind, res.text || ''));
      } catch {
        onExtracted({});
      }
    })();
  };

  const takeFile = (file?: File, { crop = true }: { crop?: boolean } = {}) => {
    setInputKey((key) => key + 1);
    if (!file) {
      applyFile(undefined);
      return;
    }
    if (cameraOnly && !isLiveCameraPhoto(file)) {
      toast.error('Please take a live odometer photo. Saved gallery photos are not allowed.');
      applyFile(undefined);
      return;
    }
    const autoCrop = crop && cropOnSelect && isCroppableImage(file)
      && typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (!autoCrop) {
      applyFile(file);
      return;
    }
    setSource(file);
    setCropOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="text-sm font-medium">{label}</div>
        <div className={`grid w-full min-w-0 gap-2 ${cameraOnly ? 'grid-cols-1' : 'grid-cols-2'}`}>
          <label className="inline-flex h-12 min-w-0 w-full cursor-pointer items-center justify-center gap-1 rounded-md border bg-primary px-2 text-center text-xs font-medium text-primary-foreground sm:gap-2 sm:px-3 sm:text-sm">
            <Camera className="h-4 w-4 shrink-0" />
            Take photo
            <input
              key={`cam-${inputKey}`}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(e) => takeFile(e.target.files?.[0], { crop: false })}
            />
          </label>
          {!cameraOnly && (
            <label className="inline-flex h-12 min-w-0 w-full cursor-pointer items-center justify-center gap-1 rounded-md border bg-background px-2 text-center text-xs font-medium sm:gap-2 sm:px-3 sm:text-sm">
              <ImagePlus className="h-4 w-4 shrink-0" />
              Choose file
              <input
                key={`file-${inputKey}`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => takeFile(e.target.files?.[0])}
              />
            </label>
          )}
        </div>
      </div>
      {cropOnSelect && (
        <Suspense fallback={null}>
        <ImageCropDialog
          file={source}
          open={cropOpen}
          onOpenChange={setCropOpen}
          onApply={(file) => applyFile(file)}
        />
        </Suspense>
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
