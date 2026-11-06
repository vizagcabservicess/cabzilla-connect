import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Banknote, Camera, Car, FileText, Gauge, Map, MapPin, Navigation, Phone } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { vendorTripAPI, type VendorTripView } from '@/services/api/vendorTripAPI';

function WhatsAppIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} fill-white`} aria-hidden="true">
      <path d="M20.5 3.5A11 11 0 0 0 2.1 16.8L1 23l6.4-1.1A11 11 0 0 0 12 22a11 11 0 0 0 8.5-18.5zM12 20.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3.8.6.6-3.7-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.8c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.5-.6.2-.4c0-.1 0-.3-.1-.4l-.8-1.9c-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.4c.1.2 1.6 2.5 3.9 3.4 1.4.6 1.9.6 2.6.5.4-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2z" />
    </svg>
  );
}

function readableError(err: unknown): string {
  const message = err instanceof Error ? err.message.trim() : '';
  if (!message || message === 'Network Error' || message === 'Request failed') {
    return 'This trip link could not be opened. Check the internet and open the WhatsApp link again.';
  }
  return message;
}

function driverStep(trip: VendorTripView): VendorTripView['phase'] {
  if (trip.phase === 'cancelled') return 'cancelled';
  if (trip.reupload === 'start') return 'start';
  if (trip.reupload === 'end') return 'end';
  return trip.phase;
}

function phaseTitle(phase: VendorTripView['phase']): string {
  switch (phase) {
    case 'start':
      return 'Start the trip';
    case 'end':
      return 'End the trip';
    case 'closed':
      return 'Trip closed';
    case 'cancelled':
      return 'Trip cancelled';
    default: {
      const exhaustive: never = phase;
      return exhaustive;
    }
  }
}

function placeName(raw: string): string {
  return raw.replace(/https?:\/\/\S+/gi, ' ').replace(/\s{2,}/g, ' ').trim();
}

function label(raw: string): string {
  const value = raw.replace(/[_-]+/g, ' ').trim();
  if (!value) return '';
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tripKind(trip: VendorTripView): string {
  const cat = trip.tripType.trim();
  const mode = trip.tripMode.trim();
  if (cat.toLowerCase() === 'tour' || /package|\d+\s*d\s*\/\s*\d+\s*n/i.test(trip.to)) return 'Tour';
  const service = `${cat} ${mode}`;
  if (/round|two.?way/i.test(service)) return 'Round trip';
  if (/one.?way|oneway/i.test(service)) return 'One way';
  if (/local/i.test(cat) || /local/i.test(mode)) return 'Local';
  const left = label(cat);
  const right = label(mode);
  if (left && right && left.toLowerCase() !== right.toLowerCase()) return `${left} · ${right}`;
  return left || right;
}

function noteKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/^\d{1,2}\s*[.)]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/[.\s]+$/g, '')
    .trim();
}

function cleanNotes(notes: string[]): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const note of notes) {
    const pieces = note
      .split(/\n+|(?=\d{1,2}\s*[.)]\s)/)
      .map((piece) => piece.replace(/^\d{1,2}\s*[.)]\s*/, '').trim())
      .filter((piece) => piece !== '');
    for (const piece of pieces) {
      const key = noteKey(piece);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      lines.push(piece);
    }
  }
  return lines.filter((line) => {
    const key = noteKey(line);
    return !lines.some((other) => {
      const otherKey = noteKey(other);
      return otherKey !== key && otherKey.length > 0 && key.includes(otherKey) && key.length > otherKey.length + 8;
    });
  });
}

function rupees(value: number): string {
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function displayPhone(phone: string, country: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    const code = country.replace(/\D/g, '') || '91';
    return `+${code} ${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2)}`;
  return phone;
}

function guestDigits(phone: string, country: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    const code = country.replace(/\D/g, '') || '91';
    return `${code}${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

type GpsFix = { lat: number; lng: number; accuracy: number; at: string };
type RideMark = { km: number; at: string; lat: number; lng: number };
type RideMarks = { start?: RideMark; end?: RideMark };

function displayWhen(raw: string): string {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function usesIphoneCamera(): boolean {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

function cameraFailureMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    if (usesIphoneCamera()) {
      return 'Allow the camera for Chrome. Open iPhone Settings, tap Chrome, turn Camera on, then tap the button again.';
    }
    return 'Chrome blocked the camera. Tap the lock icon beside the address, set Camera to Allow, then tap the button again.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is being used by another app. Close that app and tap the button again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return 'The phone camera did not start. Close other camera apps and tap the button again.';
  }
  if (usesIphoneCamera()) {
    return 'Allow the camera for Chrome. Open iPhone Settings, tap Chrome, turn Camera on, then tap the button again.';
  }
  return 'The camera did not open. Tap the lock icon beside the address, set Camera to Allow, then try again.';
}

function readGps(): Promise<GpsFix> {
  if (!navigator.geolocation) {
    return Promise.reject(new Error('Open this link in the phone browser and turn on GPS to photograph the odometer.'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        at: new Date(pos.timestamp).toISOString(),
      }),
      (err) => {
        if (err.code === 1) {
          reject(new Error('Allow location access. GPS must be on to photograph the odometer.'));
          return;
        }
        if (err.code === 3) {
          reject(new Error('GPS is not ready. Turn on location and try again.'));
          return;
        }
        reject(new Error('Turn on GPS to photograph the odometer.'));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 15000 },
    );
  });
}

function readMark(value: unknown): RideMark | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const km = typeof row.km === 'number' ? row.km : null;
  const lat = typeof row.lat === 'number' ? row.lat : null;
  const lng = typeof row.lng === 'number' ? row.lng : null;
  const at = typeof row.at === 'string' ? row.at : '';
  if (km == null || lat == null || lng == null || at === '') return undefined;
  return { km, lat, lng, at };
}

function readMarks(token: string): RideMarks {
  if (!token) return {};
  try {
    const raw = sessionStorage.getItem(`vth-ride-mark:${token}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const row = parsed as Record<string, unknown>;
    return { start: readMark(row.start), end: readMark(row.end) };
  } catch {
    return {};
  }
}

function writeMark(token: string, phase: 'start' | 'end', mark: RideMark) {
  const next = { ...readMarks(token), [phase]: mark };
  sessionStorage.setItem(`vth-ride-mark:${token}`, JSON.stringify(next));
}

function syncMarks(token: string, trip: VendorTripView): RideMarks {
  const saved = readMarks(token);
  const next: RideMarks = {};
  if (trip.reupload !== 'start' && trip.startKm != null && saved.start?.km === trip.startKm) {
    next.start = saved.start;
  }
  if (trip.reupload !== 'start' && trip.reupload !== 'end' && trip.endKm != null && saved.end?.km === trip.endKm) {
    next.end = saved.end;
  }
  const key = `vth-ride-mark:${token}`;
  if (next.start || next.end) sessionStorage.setItem(key, JSON.stringify(next));
  else sessionStorage.removeItem(key);
  return next;
}

function GpsPlace({ lat, lng }: { lat: number | null; lng: number | null }) {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    if (lat == null || lng == null) {
      setName(null);
      return;
    }
    let cancelled = false;
    setName(null);
    void vendorTripAPI.placeName(lat, lng).then((place) => {
      if (!cancelled) setName(place);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);
  if (lat == null || lng == null) {
    return (
      <p className="mt-0.5 flex items-center gap-1 text-xs leading-4 text-slate-500">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        GPS —
      </p>
    );
  }
  return (
    <a
      className="mt-0.5 flex items-start gap-1 text-xs font-semibold leading-4 text-[#2563eb]"
      href={`https://www.google.com/maps?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
    >
      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{name === null ? 'Finding location…' : (name || 'Open map')}</span>
    </a>
  );
}

function ReadingSide({
  title,
  place,
  when,
  km,
  lat,
  lng,
}: {
  title: string;
  place: string;
  when: string;
  km: number | null;
  lat: number | null;
  lng: number | null;
}) {
  return (
    <div className="min-w-0 px-3.5 py-3">
      <p className="text-xs text-slate-500">{title}</p>
      {place ? <p className="text-sm font-bold leading-5">{place}</p> : null}
      <p className="text-xs text-slate-600">{displayWhen(when) || '—'}</p>
      <p className="mt-1 flex items-center gap-1 text-sm font-bold leading-5">
        <Gauge className="h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
        {km != null ? `${km.toLocaleString('en-IN')} km` : '—'}
      </p>
      <GpsPlace lat={lat} lng={lng} />
    </div>
  );
}

function guestMessage(trip: VendorTripView): string {
  const driver = trip.driverName || 'Driver';
  return [
    'Hello Sir/Madam,',
    '',
    'Greetings from Vizag Taxi Hub.',
    '',
    'I am your assigned driver for your upcoming trip.',
    '',
    `Pickup: ${placeName(trip.from) || '—'}`,
    `When: ${trip.when || '—'}`,
    `Destination: ${placeName(trip.to) || '—'}`,
    `Vehicle: ${label(trip.cabType) || '—'}`,
    `Vehicle number: ${trip.vehicleNumber || '—'}`,
    `Driver: ${driver}`,
  ].join('\n');
}

export default function VendorTripPage() {
  const token = useParams().token ?? '';
  const [trip, setTrip] = useState<VendorTripView | null>(null);
  const [error, setError] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [km, setKm] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marks, setMarks] = useState<RideMarks>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const gpsRef = useRef<GpsFix | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gpsPromiseRef = useRef<Promise<GpsFix | null> | null>(null);
  const busyRef = useRef(false);
  const submittingRef = useRef(false);
  const iphoneCamera = usesIphoneCamera();
  busyRef.current = saving || cameraOn || photo != null;

  const showAlert = (message: string) => {
    setError(message);
    setAlertOpen(true);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  const clearPhoto = () => {
    setPhoto(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return '';
    });
  };

  const requireGps = async (): Promise<GpsFix | null> => {
    try {
      const fix = await readGps();
      gpsRef.current = fix;
      return fix;
    } catch (err: unknown) {
      gpsRef.current = null;
      showAlert(err instanceof Error ? err.message : 'Turn on GPS to photograph the odometer.');
      return null;
    }
  };

  const beginGps = () => {
    const pending = requireGps();
    gpsPromiseRef.current = pending;
    return pending;
  };

  const acceptIphonePhoto = async (file: File) => {
    const takenAt = file.lastModified;
    if (takenAt > 0 && Date.now() - takenAt > 3 * 60 * 1000) {
      showAlert('Take the photo with the camera now. Gallery photos are not accepted.');
      return;
    }
    const gps = gpsRef.current ?? await (gpsPromiseRef.current ?? beginGps());
    if (!gps) return;
    clearPhoto();
    setPhoto(file);
    setPreviewUrl(URL.createObjectURL(file));
    setReadingPhoto(true);
    void vendorTripAPI.readReading(token, file).then((reading) => {
      if (reading != null) setKm(String(reading));
    }).catch(() => undefined).finally(() => setReadingPhoto(false));
  };

  const openIphoneCamera = () => {
    setError('');
    setAlertOpen(false);
    beginGps();
    fileInputRef.current?.click();
  };

  const openCamera = async () => {
    setError('');
    setAlertOpen(false);
    if (iphoneCamera) {
      openIphoneCamera();
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showAlert('Open this link in Chrome. The camera does not work inside WhatsApp.');
      return;
    }
    stopCamera();
    // Chrome only shows the camera prompt when the request starts in this tap. GPS must wait until after it.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      if (name !== 'OverconstrainedError' && name !== 'NotFoundError') {
        showAlert(cameraFailureMessage(err));
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      } catch (retryErr: unknown) {
        showAlert(cameraFailureMessage(retryErr));
        return;
      }
    }
    const gps = await requireGps();
    if (!gps) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;
    setCameraOn(true);
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    document.body.style.removeProperty('pointer-events');
    document.body.style.removeProperty('overflow');
    document.body.removeAttribute('data-scroll-locked');
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOn || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [cameraOn]);

  useEffect(() => {
    if (!token) {
      showAlert('This trip link is invalid.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = (announce: boolean) => {
      void vendorTripAPI.getTrip(token).then((next) => {
        if (cancelled || busyRef.current) return;
        setTrip(next);
        setMarks(syncMarks(token, next));
        if (announce) {
          setError('');
          setAlertOpen(false);
        }
      }).catch((err: unknown) => {
        if (!cancelled && announce) showAlert(readableError(err));
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    };
    setLoading(true);
    load(true);
    const onShow = () => {
      if (document.visibilityState === 'hidden' || busyRef.current) return;
      load(false);
    };
    window.addEventListener('pageshow', onShow);
    document.addEventListener('visibilitychange', onShow);
    const timer = window.setInterval(onShow, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('pageshow', onShow);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [token]);

  const submit = async () => {
    if (submittingRef.current || !trip) return;
    const step = driverStep(trip);
    if (step !== 'start' && step !== 'end') return;
    const reading = Number(km);
    if (!Number.isFinite(reading) || reading < 1) {
      showAlert('Enter the number on the odometer.');
      return;
    }
    if (!photo) {
      showAlert('Photograph the odometer.');
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError('');
    setAlertOpen(false);
    try {
      const gps = gpsRef.current ?? await requireGps();
      if (!gps) return;
      const phone = trip.driverPhone;
      const next = await vendorTripAPI.submitReading(token, step, Math.round(reading), photo, gps);
      void vendorTripAPI.notifyOffice(token, step, {
        lat: gps.lat,
        lng: gps.lng,
        phone,
        place: '',
      }).catch(() => undefined);
      writeMark(token, step, { km: Math.round(reading), at: gps.at, lat: gps.lat, lng: gps.lng });
      setMarks(syncMarks(token, next));
      setTrip(next);
      setKm('');
      clearPhoto();
      stopCamera();
    } catch (err: unknown) {
      showAlert(readableError(err));
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  const digits = trip ? guestDigits(trip.guestPhone, trip.guestCountryCode) : '';
  const notes = trip ? cleanNotes(trip.notes) : [];
  const kind = trip ? tripKind(trip) : '';
  const balance = trip && trip.collects && trip.amount != null && trip.advance != null && trip.advance > 0
    ? Math.max(0, trip.amount - trip.advance)
    : null;
  const step = trip ? driverStep(trip) : null;
  const openingKm = trip && trip.reupload !== 'start' ? trip.startKm : null;
  const closingKm = trip && trip.reupload !== 'end' && trip.reupload !== 'start' ? trip.endKm : null;
  const openingMark = openingKm != null && marks.start?.km === openingKm ? marks.start : undefined;
  const closingMark = closingKm != null && marks.end?.km === closingKm ? marks.end : undefined;
  const openingAt = openingKm != null ? (trip?.startAt || openingMark?.at || '') : '';
  const closingAt = closingKm != null ? (trip?.endAt || closingMark?.at || '') : '';
  const openingLat = openingKm != null ? (trip?.startLat ?? openingMark?.lat ?? null) : null;
  const openingLng = openingKm != null ? (trip?.startLng ?? openingMark?.lng ?? null) : null;
  const closingLat = closingKm != null ? (trip?.endLat ?? closingMark?.lat ?? null) : null;
  const closingLng = closingKm != null ? (trip?.endLng ?? closingMark?.lng ?? null) : null;

  return (
    <main data-vendor-trip="" className="min-h-screen bg-[#f3f6fb] px-3 py-4 text-[15px] leading-6 text-slate-800 antialiased [font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,sans-serif]">
      <div className={`mx-auto max-w-md space-y-3 ${step === 'start' || step === 'end' ? 'pb-28' : ''}`}>
        <div className="flex items-center justify-center gap-2 whitespace-nowrap pt-2">
          <Logo linkless size="small" className="[&_img]:h-7" />
          <h1 className="text-base font-bold leading-6">{step ? phaseTitle(step) : 'Trip'}</h1>
          {trip ? <p className="text-xs text-slate-500">{trip.code}</p> : null}
        </div>
        {loading ? <p className="text-sm text-slate-500">Loading the trip…</p> : null}
        {!trip && !loading && error && !alertOpen ? <p className="text-sm text-slate-600">{error}</p> : null}
        {alertOpen ? (
          <div className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-6" role="alertdialog" aria-modal="true">
            <div className="w-full max-w-[20rem] rounded-2xl bg-white p-5 text-center shadow-lg">
              <p className="text-base font-semibold leading-6 text-slate-900">{error}</p>
              <button
                type="button"
                className="mt-4 h-11 w-full rounded-xl bg-[#2563eb] text-base font-semibold text-white"
                onClick={() => setAlertOpen(false)}
              >
                OK
              </button>
            </div>
          </div>
        ) : null}
        {trip ? (
          <>
            <section className="flex items-center gap-3 rounded-2xl border border-[#e8edf5] bg-white p-3.5 shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="flex gap-2.5">
                  <div className="flex w-3.5 flex-col items-center pt-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                    <span className="mt-0.5 min-h-6 flex-1 border-l border-dashed border-slate-300" />
                  </div>
                  <div className="min-w-0 pb-2">
                    <p className="text-base font-bold leading-6">{placeName(trip.from) || 'Pickup'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Pickup{trip.when ? ` · ${trip.when}` : ''}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <div className="flex w-3.5 justify-center pt-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-6">{placeName(trip.to) || 'Drop'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Destination
                      {kind && kind.toLowerCase() !== placeName(trip.to).toLowerCase() ? ` · ${kind}` : ''}
                      {trip.kilometers != null ? ` · ${trip.kilometers} km` : ''}
                    </p>
                  </div>
                </div>
              </div>
              <a
                className="flex w-[108px] shrink-0 flex-col items-center gap-2"
                href={trip.mapUrl.startsWith('http') ? trip.mapUrl : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName(trip.from) || placeName(trip.to))}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="flex h-16 w-[88px] items-center justify-center rounded-xl bg-[#e8f7ee]">
                  <Map className="h-7 w-7 text-[#16a34a]" />
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#2563eb] px-2.5 py-1.5 text-xs font-bold text-white">
                  <Navigation className="h-3 w-3" />
                  Open Map
                </span>
              </a>
            </section>

            <section className="rounded-2xl border border-[#e8edf5] bg-white shadow-sm">
              <div className="space-y-3 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">Guest details</p>
                    <p className="mt-0.5 break-words text-base font-bold leading-6">{trip.guestName || '—'}</p>
                    {trip.guestPhone ? (
                      <a className="mt-0.5 block break-all text-sm font-semibold leading-5 text-slate-700" href={digits ? `tel:+${digits}` : undefined}>
                        {displayPhone(trip.guestPhone, trip.guestCountryCode)}
                      </a>
                    ) : null}
                  </div>
                  {digits ? (
                    <div className="flex shrink-0 gap-1.5 pt-4">
                      <a className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]" href={`https://wa.me/${digits}?text=${encodeURIComponent(guestMessage(trip))}`} target="_blank" rel="noreferrer" aria-label="WhatsApp guest">
                        <WhatsAppIcon className="h-4 w-4" />
                      </a>
                      <a className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb] text-white" href={`tel:+${digits}`} aria-label="Call guest">
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>
                  ) : null}
                </div>
                <div className="border-t border-[#e8edf5] pt-3">
                  <p className="text-xs font-medium text-slate-500">Driver details</p>
                  <p className="mt-0.5 break-words text-base font-bold leading-6">{trip.driverName || '—'}</p>
                  <p className="mt-1 flex items-start gap-1.5 break-words text-sm leading-5 text-slate-700">
                    <Car className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2563eb]" />
                    <span>{[trip.vehicleNumber, label(trip.cabType)].filter(Boolean).join(' · ') || '—'}</span>
                  </p>
                  {trip.driverPhone ? (
                    <a className="mt-0.5 block break-all text-sm font-semibold leading-5 text-[#2563eb]" href={`tel:+${guestDigits(trip.driverPhone, '91')}`}>
                      {displayPhone(trip.driverPhone, '91')}
                    </a>
                  ) : null}
                  {trip.flight ? <p className="mt-0.5 break-words text-sm leading-5 text-slate-600">{trip.flight}</p> : null}
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-[#e8edf5]">
                <ReadingSide
                  title="Opening odometer & start time"
                  place=""
                  when={openingAt}
                  km={openingKm}
                  lat={openingLat}
                  lng={openingLng}
                />
                <div className="border-l border-[#e8edf5]">
                  <ReadingSide
                    title="Closing odometer & ending"
                    place=""
                    when={closingAt}
                    km={closingKm}
                    lat={closingLat}
                    lng={closingLng}
                  />
                </div>
              </div>
              {trip.collects && trip.amount != null ? (
                <div className="flex items-center gap-3 border-t border-[#e8edf5] px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#ecfdf3] text-[#16a34a]">
                    <Banknote className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Collect</p>
                    <p className="text-base font-bold leading-6">{rupees(trip.amount)}</p>
                    {balance != null && trip.advance != null ? (
                      <p className="text-xs text-slate-600">Advance {rupees(trip.advance)} · Balance {rupees(balance)}</p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            {trip.collects ? null : (
              <p className="rounded-2xl bg-[#FEF3C7] px-3 py-3 text-base font-bold text-[#92400E]">Do not collect payment</p>
            )}

            {notes.length > 0 || trip.places.length > 0 ? (
              <section className="rounded-2xl border border-[#e8edf5] bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-[18px] w-[18px] text-[#2563eb]" />
                  <p className="text-base font-bold">Package Details & Terms</p>
                </div>
                {notes.length > 0 ? (
                  <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">
                    {notes.map((note) => <li key={note}>• {note}</li>)}
                  </ul>
                ) : null}
                {trip.places.length > 0 ? (
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    {trip.places.map((place) => <li key={place}>{place}</li>)}
                  </ol>
                ) : null}
              </section>
            ) : null}

          </>
        ) : null}
        {cameraOn ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-5">
            <div className="w-full max-w-sm">
              <video ref={videoRef} autoPlay playsInline muted className="mx-auto aspect-[3/4] max-h-[68vh] w-full rounded-2xl bg-black object-cover" />
              <button
                type="button"
                className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-base font-semibold text-slate-900"
                onClick={() => {
                  void (async () => {
                    if (!await requireGps()) return;
                    const video = videoRef.current;
                    if (!video || video.videoWidth < 1) return;
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const context = canvas.getContext('2d');
                    if (!context) return;
                    context.drawImage(video, 0, 0);
                    canvas.toBlob((blob) => {
                      if (!blob) return;
                      const file = new File([blob], 'odometer.jpg', { type: 'image/jpeg' });
                      clearPhoto();
                      setPhoto(file);
                      setPreviewUrl(URL.createObjectURL(blob));
                      stopCamera();
                      setReadingPhoto(true);
                      void vendorTripAPI.readReading(token, file).then((reading) => {
                        if (reading != null) setKm(String(reading));
                      }).catch(() => undefined).finally(() => setReadingPhoto(false));
                    }, 'image/jpeg', 0.92);
                  })();
                }}
              >
                <Camera className="h-4 w-4" />
                Take photo
              </button>
            </div>
          </div>
        ) : null}
        {trip && (step === 'start' || step === 'end') && !cameraOn ? (
          <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-[#e8edf5] bg-white px-3 pt-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-md space-y-2">
              {trip.reupload === 'start' ? (
                <p className="text-center text-sm font-semibold text-[#92400E]">The office removed the opening odometer. Photograph it again.</p>
              ) : null}
              {trip.reupload === 'end' ? (
                <p className="text-center text-sm font-semibold text-[#92400E]">The office removed the closing odometer. Photograph it again.</p>
              ) : null}
              {previewUrl ? (
                <>
                  <div className="flex items-center gap-3">
                    <img src={previewUrl} alt="Odometer photograph" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    <label className="min-w-0 flex-1">
                      <span className="text-xs text-slate-500">{step === 'start' ? 'Opening odometer' : 'Closing odometer'}</span>
                      <input
                        className="mt-0.5 h-11 w-full rounded-lg border px-3 text-lg font-bold"
                        inputMode="numeric"
                        value={km}
                        onChange={(event) => setKm(event.target.value.replace(/[^\d]/g, ''))}
                        placeholder={readingPhoto ? 'Reading the photo…' : 'Kilometres'}
                      />
                    </label>
                  </div>
                  {readingPhoto ? <p className="text-xs text-slate-500">Reading the number from the photo…</p> : null}
                  <button
                    type="button"
                    className="h-12 w-full rounded-xl bg-[#2563eb] text-base font-semibold text-white disabled:opacity-40"
                    disabled={saving || readingPhoto || km.trim() === ''}
                    onClick={() => void submit()}
                  >
                    {saving ? 'Saving…' : step === 'start' ? 'Start trip' : 'End trip'}
                  </button>
                  <button
                    type="button"
                    className="h-9 w-full text-sm font-semibold text-slate-600"
                    onClick={() => {
                      clearPhoto();
                      setKm('');
                      if (iphoneCamera) {
                        openIphoneCamera();
                        return;
                      }
                      void openCamera();
                    }}
                  >
                    Take again
                  </button>
                </>
              ) : iphoneCamera ? (
                <label className="relative inline-flex min-h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-3 py-2 text-center text-base font-semibold leading-5 text-white">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    onClick={() => {
                      setError('');
                      setAlertOpen(false);
                      beginGps();
                    }}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void acceptIphonePhoto(file);
                    }}
                  />
                  <Camera className="h-4 w-4 shrink-0" />
                  {step === 'start' ? 'Start the trip with odometer pic' : 'End the trip with odometer pic'}
                </label>
              ) : (
                <button
                  type="button"
                  className="relative z-40 inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-[#2563eb] px-3 py-2 text-center text-base font-semibold leading-5 text-white"
                  onClick={() => void openCamera()}
                >
                  <Camera className="h-4 w-4 shrink-0" />
                  {step === 'start' ? 'Start the trip with odometer pic' : 'End the trip with odometer pic'}
                </button>
              )}
            </div>
          </div>
        ) : null}
        {step === 'closed' ? (
          <p className="text-sm text-slate-600">The office has the opening and closing readings. You can close this page.</p>
        ) : null}
      </div>
    </main>
  );
}
