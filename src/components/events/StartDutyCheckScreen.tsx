import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  Car,
  Check,
  ClipboardCheck,
  Clock,
  FileText,
  Lock,
  MapPin,
  Navigation,
  Shirt,
} from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropDialog } from '@/components/events/CroppableFileField';
import { driverPortalAPI } from '@/services/api/eventDutyAPI';
import {
  canCloseOdometer,
  downscaleImageFile,
  extractOdometerReading,
  formatDutyDate,
  formatReportingTime,
} from '@/lib/eventDuty';

type Gps = { lat: number; lng: number; accuracy: number | null } | null;
type CheckId = 'uniform' | 'towel' | 'vehicle';

const CHECKS: Array<{ id: CheckId; title: string; hint: string }> = [
  { id: 'uniform', title: 'White shirt uniform', hint: 'Wear a clean, neat white shirt' },
  { id: 'towel', title: 'White seat towel', hint: 'Place clean white towels on the seats' },
  { id: 'vehicle', title: 'Vehicle ready', hint: 'Licence, Aadhaar and RC' },
];

function isLiveCameraPhoto(file: File): boolean {
  if (file.lastModified <= 0) return true;
  return Date.now() - file.lastModified <= 3 * 60 * 1000;
}

function CheckIcon({ id }: { id: CheckId }) {
  const className = 'h-5 w-5 text-[#2f6bff]';
  switch (id) {
    case 'uniform':
      return <Shirt className={className} />;
    case 'towel':
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
          <path d="M4 8V6a2 2 0 0 1 2-2h2" />
          <path d="M8 12h8M8 16h5" />
        </svg>
      );
    case 'vehicle':
      return <Car className={className} />;
    default: {
      const _never: never = id;
      return _never;
    }
  }
}

export function StartDutyCheckScreen({
  mode,
  token,
  dutyId,
  openingKm,
  eventName,
  dutyDate,
  reportingTime,
  reportingLocation,
  locationName,
  gpsRequired,
  onClose,
  onDone,
}: {
  mode: 'start' | 'end';
  token: string;
  dutyId: number;
  openingKm?: number | null;
  eventName: string;
  dutyDate: string;
  reportingTime: string;
  reportingLocation: string;
  locationName: string;
  gpsRequired: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const starting = mode === 'start';
  const [checks, setChecks] = useState<Record<CheckId, boolean>>({
    uniform: false,
    towel: false,
    vehicle: false,
  });
  const [file, setFile] = useState<File | undefined>();
  const [km, setKm] = useState('');
  const [ocr, setOcr] = useState<number | null>(null);
  const [ocrState, setOcrState] = useState<'idle' | 'reading' | 'found' | 'missed'>('idle');
  const [cropOpen, setCropOpen] = useState(false);
  const [gps, setGps] = useState<Gps>(null);
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  const missingChecks = CHECKS.filter((item) => !checks[item.id]);
  const checksDone = missingChecks.length === 0;
  const hasPhoto = Boolean(file);
  const ready = hasPhoto && (starting ? checksDone : true);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => { if (!gpsRequired) setGps(null); },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [gpsRequired]);

  const runOcr = async (next: File) => {
    setOcrState('reading');
    setOcr(null);
    try {
      const compact = await downscaleImageFile(next);
      const res = await driverPortalAPI.ocr(token, compact);
      const reading = extractOdometerReading(res.text) ?? (res.reading ?? null);
      if (reading) {
        setOcr(reading);
        setKm(String(reading));
        setOcrState('found');
      } else {
        setOcrState('missed');
      }
    } catch {
      setOcrState('missed');
    }
  };

  const acceptPhoto = (next?: File) => {
    setInputKey((key) => key + 1);
    if (next && !isLiveCameraPhoto(next)) {
      toast.error('Please take a live odometer photo. Saved gallery photos are not allowed.');
      return;
    }
    setFile(next);
    if (next) void runOcr(next);
    else {
      setOcr(null);
      setKm('');
      setOcrState('idle');
    }
  };

  const submit = async () => {
    const photoLabel = starting ? 'opening odometer photo' : 'closing odometer photo';
    if (starting && !checksDone && !hasPhoto) {
      toast.error('Please accept all the checks and take the odometer photo.');
      return;
    }
    if (starting && !checksDone) {
      const names = missingChecks.map((item) => item.title.toLowerCase()).join(', ');
      toast.error(missingChecks.length === CHECKS.length
        ? 'Please accept all the checks before starting duty.'
        : `Please accept: ${names}.`);
      return;
    }
    if (!file) {
      toast.error(`Please take the ${photoLabel}.`);
      return;
    }
    const reading = Number(km);
    if (!reading) {
      toast.error('Enter the kilometres shown on the odometer');
      return;
    }
    if (!starting && openingKm != null && !canCloseOdometer(openingKm, reading)) {
      toast.error('Closing KM cannot normally be lower than opening KM. Contact VTH if this is an error.');
      return;
    }
    const form = new FormData();
    form.append('dutyId', String(dutyId));
    form.append(starting ? 'openingKm' : 'closingKm', String(reading));
    form.append('photo', file);
    if (gps) {
      form.append('lat', String(gps.lat));
      form.append('lng', String(gps.lng));
      if (gps.accuracy != null) form.append('accuracy', String(gps.accuracy));
    }
    setBusy(true);
    try {
      if (starting) await driverPortalAPI.startDuty(token, form);
      else await driverPortalAPI.endDuty(token, form);
      toast.success(starting ? 'Duty started' : 'Duty completed');
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  const steps: Array<{ n: number; label: string; state: 'done' | 'current' | 'upcoming' }> = starting
    ? [
      { n: 1, label: 'Pre-check', state: 'current' },
      { n: 2, label: 'Start duty', state: 'upcoming' },
      { n: 3, label: 'End duty', state: 'upcoming' },
    ]
    : [
      { n: 1, label: 'Pre-check', state: 'done' },
      { n: 2, label: 'Start duty', state: 'done' },
      { n: 3, label: 'End duty', state: 'current' },
    ];

  const rows: Array<{ icon: ReactNode; label: string; value?: string; chip?: string }> = [
    { icon: <CalendarDays className="h-4 w-4 text-[#2f6bff]" />, label: formatDutyDate(dutyDate), chip: eventName },
    { icon: <MapPin className="h-4 w-4 text-emerald-500" />, label: 'Pickup location', value: reportingLocation || '—' },
    { icon: <Clock className="h-4 w-4 text-sky-500" />, label: 'Report by', value: formatReportingTime(reportingTime) || reportingTime || '—' },
    { icon: <FileText className="h-4 w-4 text-slate-400" />, label: 'Reporting location', value: reportingLocation || '—' },
    { icon: <Navigation className="h-4 w-4 text-slate-400" />, label: 'Location name', value: locationName || 'Not provided' },
  ];

  return (
    <>
    <div className="space-y-3 pb-4">
        <div className="relative px-2 py-1">
          <div className="absolute left-[18%] right-[18%] top-[14px] h-px bg-slate-200" />
          <div className="relative grid grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="flex flex-col items-center gap-1.5">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${step.state === 'upcoming' ? 'bg-slate-200 text-slate-500' : 'bg-[#2f6bff] text-white'}`}>
                  {step.state === 'done' ? <Check className="h-4 w-4" /> : step.n}
                </div>
                <div className={`text-[10px] font-bold uppercase tracking-wide transition-colors duration-300 ${step.state === 'upcoming' ? 'text-slate-400' : 'text-[#2f6bff]'}`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {starting && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <ClipboardCheck className="h-5 w-5 text-[#2f6bff]" />
              </div>
              <div>
                <div className="font-semibold text-slate-900">Before you start</div>
                <p className="text-sm text-slate-500">Complete these checks before starting your duty.</p>
              </div>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {CHECKS.map((item) => {
                const on = checks[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setChecks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                      <CheckIcon id={item.id} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800">{item.title}</div>
                      <div className="text-sm text-slate-400">{item.hint}</div>
                    </div>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ease-out ${on ? 'scale-100 border-[#2f6bff] bg-[#2f6bff] text-white' : 'scale-95 border-slate-300 bg-white'}`}>
                      {on && <Check className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-dashed border-blue-200 bg-white p-4 shadow-sm transition-colors duration-300">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Camera className="h-5 w-5 text-[#2f6bff]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold text-slate-900">{starting ? 'Opening odometer photo' : 'Closing odometer photo'}</div>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
                  {starting ? 'Required to start duty' : 'Required to end duty'}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">Take a clear photo showing the current KM reading.</p>
            </div>
          </div>
          <label className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 text-sm font-semibold text-[#2f6bff] transition-colors duration-200 hover:bg-blue-50">
            <Camera className="h-4 w-4" />
            {file ? 'Retake photo' : (starting ? 'Capture opening KM photo' : 'Capture closing KM photo')}
            <input
              key={inputKey}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => acceptPhoto(event.target.files?.[0])}
            />
          </label>
          {previewUrl && (
            <div className="mt-3 space-y-2 transition-all duration-300 ease-out">
              <img src={previewUrl} alt="Odometer" className="h-36 w-full rounded-xl object-cover" />
              <div className="text-xs text-slate-500">
                {ocrState === 'reading' && 'Reading kilometres from the photo…'}
                {ocrState === 'found' && ocr != null && `Detected ${ocr.toLocaleString('en-IN')} km. Confirm or edit it.`}
                {ocrState === 'missed' && 'Could not read the digits. Type the KM from the photo.'}
              </div>
              <input
                inputMode="numeric"
                value={km}
                onChange={(event) => setKm(event.target.value.replace(/\D/g, ''))}
                placeholder={starting ? 'Opening KM' : 'Closing KM'}
                className="h-12 w-full rounded-xl border border-slate-200 px-3 text-lg font-semibold"
              />
              <button type="button" onClick={() => setCropOpen(true)} className="text-sm font-medium text-[#2f6bff]">Crop photo</button>
            </div>
          )}
          <ImageCropDialog file={file || null} open={cropOpen} onOpenChange={setCropOpen} onApply={(next) => acceptPhoto(next)} />
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {rows.map((row, index) => (
            <div key={row.label} className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-slate-100' : ''}`}>
              {row.icon}
              <div className={`min-w-0 flex-1 text-sm ${row.value ? 'text-slate-500' : 'font-semibold text-slate-800'}`}>{row.label}</div>
              {row.chip ? (
                <span className="max-w-[48%] truncate rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-600">{row.chip}</span>
              ) : (
                <div className="max-w-[55%] text-right text-sm font-medium text-slate-700">{row.value}</div>
              )}
            </div>
          ))}
        </section>

        <div className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <span className="font-semibold">Important: </span>
            Start and end odometer photos are mandatory. Missing readings may affect KM calculation.
          </div>
        </div>
        {gpsRequired && !gps && <p className="text-center text-xs text-slate-400">Waiting for location…</p>}
    </div>
    {typeof document !== 'undefined' && createPortal(
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            disabled={busy}
            onClick={() => { void submit(); }}
            className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-300 ease-out active:scale-[0.98] disabled:opacity-70 ${ready ? 'bg-[#2f6bff] text-white shadow-sm' : 'bg-[#d6e6ff] text-[#7eabf5] shadow-none'}`}
          >
            <span className={`inline-flex overflow-hidden transition-all duration-300 ease-out ${ready ? 'w-0 opacity-0' : 'w-4 opacity-100'}`}>
              <Lock className="h-3.5 w-3.5 shrink-0" />
            </span>
            {starting ? 'Complete Checks & Start Duty' : 'Complete Photo & End Duty'}
          </button>
        </div>
      </div>,
      document.body,
    )}
  </>
  );
}
