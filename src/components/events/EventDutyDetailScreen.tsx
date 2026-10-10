import { useEffect, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  Camera,
  ClipboardList,
  Clock,
  FileText,
  Gauge,
  Hourglass,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Play,
  Route,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DriverFace } from '@/components/events/DriverFace';
import {
  billableDutyEnd,
  dutyClosingTime,
  dutyStatusLabel,
  formatDutyDate,
  formatDutyDuration,
  formatReportingTime,
  formatServerDateTime,
  formatServerTime,
  mapsUrl,
} from '@/lib/eventDuty';
import { getVehicleImageUrlForDisplay } from '@/utils/vehicleUrlUtils';
import type { EventGps } from '@/types/eventDuty';

export type DutyDetailTab = 'details' | 'photos' | 'timeline' | 'map';

export interface EventDutyDetailModel {
  dutyDate: string;
  eventName?: string | null;
  vehicleType: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  driverPhotoUrl?: string | null;
  pickupLocation: string;
  reportingTime: string;
  reportingLocation: string;
  locationName: string;
  status: string;
  openingAt?: string | null;
  closingAt?: string | null;
  endRequestedAt?: string | null;
  openingKm?: number | null;
  closingKm?: number | null;
  totalKm?: number | null;
  openingGps?: EventGps | null;
  closingGps?: EventGps | null;
  openingPhotoUrl?: string | null;
  closingPhotoUrl?: string | null;
}

export function EventDutyDetailScreen({
  model,
  onBack,
  callButton,
  onEndDuty,
  onStartDuty,
  onPhotoClick,
  homeAction,
  panel,
  alertBar,
  parkingAction,
}: {
  model: EventDutyDetailModel;
  onBack?: () => void;
  callButton?: { label: string; number: string } | null;
  onEndDuty?: () => void;
  onStartDuty?: () => void;
  onPhotoClick?: (url: string, title: string) => void;
  homeAction?: ReactNode;
  panel?: ReactNode;
  alertBar?: ReactNode;
  parkingAction?: { busy: boolean; onParking: () => void } | null;
}) {
  const [tab, setTab] = useState<DutyDetailTab>('details');
  const [, setTick] = useState(0);
  const running = Boolean(model.openingAt) && !model.closingAt;
  const status = (model.status || '').toLowerCase();
  const inProgress = status === 'in_progress' || running;
  const canStart = Boolean(onStartDuty) && (status === 'not_started' || status === 'scheduled');
  const canEnd = Boolean(onEndDuty) && inProgress;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, [running]);

  const askedToEnd = Boolean(model.endRequestedAt) && canEnd && !panel;
  const showParking = Boolean(parkingAction) && canEnd && !panel;
  const startedClock = formatServerTime(model.openingAt);
  const totalTime = formatDutyDuration(model.openingAt, billableDutyEnd(model.closingAt, model.endRequestedAt)) || '—';
  const totalKm = model.totalKm != null ? model.totalKm.toLocaleString('en-IN') : '—';
  const openingKm = model.openingKm != null ? model.openingKm.toLocaleString('en-IN') : '—';
  const mapGps = model.openingGps?.lat != null ? model.openingGps : model.closingGps;
  const mapLink = mapsUrl(mapGps);

  return (
    <div className="flex min-h-screen flex-col bg-[#f3f6fb]">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/95 px-3 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-2">
          {onBack ? (
            <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600" aria-label="Back">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          ) : <div className="w-9" />}
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <Logo size="small" linkless className="[&_img]:h-8 [&_img]:w-auto" />
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Event vehicle duty</div>
            </div>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <div className={`mx-auto w-full max-w-md flex-1 space-y-3 px-4 py-3 ${askedToEnd ? 'pb-44' : 'pb-28'}`}>
        {alertBar}
        {homeAction}
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <DriverFace
            name={model.driverName}
            mobile={model.driverMobile}
            photoUrl={model.driverPhotoUrl}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-slate-900">{model.driverName || 'Driver'}</div>
            {model.driverMobile ? (
              <a className="mt-0.5 inline-flex items-center gap-1 text-sm text-slate-500" href={`tel:${model.driverMobile}`}>
                <Phone className="h-3.5 w-3.5 text-blue-500" />
                {model.driverMobile}
              </a>
            ) : (
              <div className="text-sm text-slate-400">Mobile not added</div>
            )}
          </div>
          {callButton?.number ? (
            <a
              href={`tel:${callButton.number}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600"
            >
              <Phone className="h-3.5 w-3.5" />
              {callButton.label}
            </a>
          ) : null}
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <img
            src={getVehicleImageUrlForDisplay({ name: model.vehicleType, id: model.vehicleType.replace(/\s+/g, '_').toLowerCase() })}
            alt=""
            className="h-12 w-[4.5rem] object-contain"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-slate-400">Vehicle</div>
            <div className="font-semibold text-slate-900">{model.vehicleType}</div>
            <div className="text-sm text-slate-500">{model.vehicleNumber || '—'}</div>
          </div>
          <div className={`shrink-0 rounded-2xl px-3 py-2 text-center ${inProgress ? 'bg-amber-50 text-amber-600' : status === 'completed' ? 'bg-sky-50 text-sky-600' : 'bg-slate-50 text-slate-500'}`}>
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold">
              <Clock className="h-3.5 w-3.5" />
              {dutyStatusLabel(model.status)}
            </div>
            {startedClock ? <div className="mt-0.5 text-[10px] opacity-80">since {startedClock}</div> : null}
          </div>
        </div>

        {panel}

        {!panel && (
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm">
            <TabBtn id="details" tab={tab} onClick={setTab} icon={<FileText className="h-3.5 w-3.5" />}>Duty Details</TabBtn>
            <TabBtn id="photos" tab={tab} onClick={setTab} icon={<Camera className="h-3.5 w-3.5" />}>Photos</TabBtn>
            <TabBtn id="timeline" tab={tab} onClick={setTab} icon={<Clock className="h-3.5 w-3.5" />}>Timeline</TabBtn>
            <TabBtn id="map" tab={tab} onClick={setTab} icon={<MapIcon className="h-3.5 w-3.5" />}>Map</TabBtn>
          </div>
        )}

        {!panel && tab === 'details' && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  {formatDutyDate(model.dutyDate)}
                </div>
                {model.eventName ? (
                  <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-600">{model.eventName}</span>
                ) : null}
              </div>
              <div className="divide-y divide-slate-100 px-4">
                <DetailRow icon={<MapPin className="h-4 w-4 text-emerald-500" />} label="Pickup Location" value={model.pickupLocation} />
                <DetailRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Reporting Time" value={formatReportingTime(model.reportingTime) || model.reportingTime || '—'} />
                <DetailRow icon={<ClipboardList className="h-4 w-4 text-slate-400" />} label="Reporting Location" value={model.reportingLocation} />
                <DetailRow icon={<Navigation className="h-4 w-4 text-slate-400" />} label="Location Name" value={model.locationName} />
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="divide-y divide-slate-100 px-4">
                <DetailRow
                  icon={<Play className="h-4 w-4 text-emerald-500" />}
                  label="Duty Status"
                  value={inProgress ? 'DUTY IN PROGRESS' : dutyStatusLabel(model.status).toUpperCase()}
                  valueClass={inProgress ? 'font-bold text-emerald-600' : 'font-semibold'}
                />
                <DetailRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Started At" value={formatServerDateTime(model.openingAt)} />
                <DetailRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Closing Time" value={formatServerDateTime(dutyClosingTime(model.closingAt, model.endRequestedAt))} />
                <DetailRow icon={<Clock className="h-4 w-4 text-slate-400" />} label="Odometer uploaded" value={formatServerDateTime(model.closingAt)} />
                <DetailRow icon={<Gauge className="h-4 w-4 text-slate-400" />} label="Opening KM" value={openingKm} />
                <DetailRow icon={<Route className="h-4 w-4 text-slate-400" />} label="Total KM" value={totalKm} />
                <DetailRow icon={<Hourglass className="h-4 w-4 text-slate-400" />} label="Total Time" value={totalTime} />
              </div>
            </div>

            {(model.openingPhotoUrl || mapGps) && (
              <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <Camera className="h-4 w-4 text-blue-500" />
                    Opening Photo
                  </div>
                  <div className="text-[11px] text-slate-400">{formatServerDateTime(model.openingAt)}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {model.openingPhotoUrl ? (
                    <button type="button" className="overflow-hidden rounded-xl bg-slate-100" onClick={() => onPhotoClick?.(model.openingPhotoUrl!, 'Opening odometer')}>
                      <img src={model.openingPhotoUrl} alt="Opening odometer" className="h-28 w-full object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">No photo</div>
                  )}
                  <MiniMap gps={mapGps} link={mapLink} />
                </div>
              </div>
            )}
          </div>
        )}

        {!panel && tab === 'photos' && (
          <div className="space-y-3">
            <PhotoCard title="Opening Photo" at={model.openingAt} url={model.openingPhotoUrl} onClick={onPhotoClick} />
            <PhotoCard title="Closing Photo" at={model.closingAt} url={model.closingPhotoUrl} onClick={onPhotoClick} />
          </div>
        )}

        {!panel && tab === 'timeline' && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <ol className="space-y-4">
              <TimeItem title="Duty date" detail={formatDutyDate(model.dutyDate)} />
              {model.openingAt && <TimeItem title="Duty started" detail={formatServerDateTime(model.openingAt)} />}
              {model.openingKm != null && <TimeItem title="Opening KM" detail={openingKm} />}
              {model.locationName && model.locationName !== '—' && <TimeItem title="Reporting location" detail={model.locationName} />}
              {dutyClosingTime(model.closingAt, model.endRequestedAt) && (
                <TimeItem title="Closing time" detail={formatServerDateTime(dutyClosingTime(model.closingAt, model.endRequestedAt))} />
              )}
              {model.closingAt && <TimeItem title="Odometer uploaded" detail={formatServerDateTime(model.closingAt)} />}
              {model.totalKm != null && <TimeItem title="Total KM" detail={totalKm} />}
              <TimeItem title="Total time" detail={totalTime} />
            </ol>
          </div>
        )}

        {!panel && tab === 'map' && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="h-72">
              <MiniMap gps={mapGps} link={mapLink} tall />
            </div>
            <div className="px-4 py-3 text-sm text-slate-600">{model.locationName || model.reportingLocation || 'Waiting for GPS'}</div>
          </div>
        )}
      </div>

      {(showParking || askedToEnd) && (
        <div className="fixed inset-x-0 bottom-[4.75rem] z-20 space-y-2 px-4">
          {showParking && parkingAction && (
            <button
              type="button"
              disabled={parkingAction.busy}
              onClick={parkingAction.onParking}
              className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-xl bg-amber-500 px-3 py-2.5 text-left text-white shadow-lg disabled:opacity-70"
            >
              <span className="text-sm font-semibold">When you drop the guest, tap In Parking.</span>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-amber-600">
                {parkingAction.busy ? '…' : 'In Parking'}
              </span>
            </button>
          )}
          {askedToEnd && (
            <div className="mx-auto max-w-md rounded-xl bg-amber-500 px-3 py-2.5 text-center text-sm font-semibold text-white shadow-lg">
              Please end your duty now. Time after {formatServerTime(model.endRequestedAt)} is not counted.
            </div>
          )}
        </div>
      )}

      {!panel && (canStart || canEnd) && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-md gap-3">
            {canEnd && (
              <button type="button" onClick={onEndDuty} className="h-12 flex-1 rounded-xl bg-red-500 text-sm font-bold text-white shadow-sm">
                End Duty
              </button>
            )}
            {canStart && (
              <button type="button" onClick={onStartDuty} className="h-12 flex-1 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
                Start Duty
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({
  id, tab, onClick, icon, children,
}: {
  id: DutyDetailTab;
  tab: DutyDetailTab;
  onClick: (id: DutyDetailTab) => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  const active = tab === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={`flex flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-2 py-2 text-[11px] font-semibold ${
        active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function DetailRow({
  icon, label, value, valueClass,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="mt-0.5">{icon}</div>
      <div className="w-[42%] text-[13px] text-slate-500">{label}</div>
      <div className={`min-w-0 flex-1 text-right text-[13px] text-slate-800 ${valueClass || ''}`}>{value || '—'}</div>
    </div>
  );
}

function MiniMap({ gps, link, tall }: { gps?: EventGps | null; link: string | null; tall?: boolean }) {
  if (!gps || gps.lat == null || gps.lng == null) {
    return <div className="flex h-28 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">No GPS</div>;
  }
  const embed = `https://maps.google.com/maps?q=${gps.lat},${gps.lng}&z=15&output=embed`;
  if (!tall) {
    return (
      <a
        href={link || embed.replace('&output=embed', '')}
        target="_blank"
        rel="noreferrer"
        className="flex h-28 items-center justify-center gap-1 rounded-xl bg-sky-50 text-xs font-semibold text-blue-600"
      >
        <MapIcon className="h-3.5 w-3.5" />
        View on Map
      </a>
    );
  }
  return (
    <div className={`relative overflow-hidden rounded-xl bg-sky-50 ${tall ? 'h-full' : 'h-28'}`}>
      <iframe title="Duty location" src={embed} className="h-full w-full border-0" loading="lazy" />
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-[10px] font-semibold text-blue-600 shadow"
        >
          <MapIcon className="h-3 w-3" />
          View on Map
        </a>
      ) : null}
    </div>
  );
}

function PhotoCard({
  title, at, url, onClick,
}: {
  title: string;
  at?: string | null;
  url?: string | null;
  onClick?: (url: string, title: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span>{title}</span>
        <span className="text-[11px] font-normal text-slate-400">{at ? formatServerDateTime(at) : '—'}</span>
      </div>
      {url ? (
        <button type="button" className="block w-full overflow-hidden rounded-xl" onClick={() => onClick?.(url, title)}>
          <img src={url} alt={title} className="h-52 w-full object-contain bg-slate-50" />
        </button>
      ) : (
        <div className="flex h-28 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">Not uploaded yet</div>
      )}
    </div>
  );
}

function TimeItem({ title, detail }: { title: string; detail: string }) {
  return (
    <li className="relative border-l-2 border-blue-100 pl-4">
      <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-blue-500" />
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{title}</div>
      <div className="text-sm font-medium text-slate-800">{detail}</div>
    </li>
  );
}
