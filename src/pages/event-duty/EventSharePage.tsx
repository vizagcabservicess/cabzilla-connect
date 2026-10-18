import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Play,
  RefreshCw,
  Search,
  Share2,
  XCircle,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { AddToHomeButton } from '@/components/events/AddToHomeButton';
import { EventLinkSeo } from '@/components/events/EventLinkSeo';
import { DriverFace } from '@/components/events/DriverFace';
import { AskDriverEndButton } from '@/components/events/AskDriverEndButton';
import { ContinueDutyButton } from '@/components/events/ContinueDutyButton';
import { EventDutyDetailScreen } from '@/components/events/EventDutyDetailScreen';
import { EventTrackingMap } from '@/components/events/EventTrackingMap';
import { toast } from 'sonner';
import { eventDutyAPI, fetchEventShare, fetchEventTracking, setShareDutyPlace } from '@/services/api/eventDutyAPI';
import {
  billableDutyEnd,
  dutyDurationMinutes,
  formatDutyDate,
  formatDutyDateShort,
  formatDutyDurationCompact,
  formatServerDateTime,
  isShareVehicleAssigned,
  shareListStats,
  tripPromptResultMessage,
  whatsappUrl,
} from '@/lib/eventDuty';
import type { EventShareView, EventTrackVehicle } from '@/types/eventDuty';

type ShareRow = EventShareView['vehicles'][number];
type StatusChip = 'all' | 'started' | 'in_progress' | 'completed' | 'pending';
type ChipId = 'all' | 'trip' | 'parking' | 'completed' | 'pending';
type ListFilter = StatusChip | 'trip' | 'parking';

function dutyStarted(row: ShareRow): boolean {
  return row.status === 'in_progress' && Boolean(row.openingAt) && !row.closingAt;
}

function rowPlace(row: ShareRow): 'trip' | 'parking' {
  return row.dutyPlace === 'parking' ? 'parking' : 'trip';
}

function rowStatus(row: ShareRow): Exclude<StatusChip, 'all'> {
  const status = (row.status || '').toLowerCase();
  switch (status) {
    case 'completed':
      return 'completed';
    case 'in_progress':
      return 'in_progress';
    case 'missing_closing':
      return 'started';
    case 'not_started':
    case 'scheduled':
    case 'missing_opening':
    case 'cancelled':
      return row.openingAt ? 'started' : 'pending';
    case 'exception':
      return row.openingAt ? 'started' : 'pending';
    default:
      return row.openingAt ? 'started' : 'pending';
  }
}

function displayMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits}`;
  return mobile;
}

function rowSerial(row: ShareRow, vehicles: ShareRow[]): number {
  if (row.serialNo != null && row.serialNo > 0) return row.serialNo;
  const listedAt = vehicles.findIndex((item) => item.dutySlipNo === row.dutySlipNo && item.dutyId === row.dutyId);
  return listedAt >= 0 ? listedAt + 1 : 1;
}

function driverShareText(row: ShareRow, serial: number, showSerial: boolean): string {
  return [
    showSerial ? `SL.No: ${serial}` : '',
    `Driver: ${row.driverName || '—'}`,
    `Phone: ${row.driverMobile ? displayMobile(row.driverMobile) : '—'}`,
    `Vehicle: ${row.vehicleType || '—'}`,
    `Vehicle No: ${row.vehicleNumber || '—'}`,
  ].filter(Boolean).join('\n');
}

async function shareDriverCard(row: ShareRow, serial: number, showSerial: boolean): Promise<void> {
  const text = driverShareText(row, serial, showSerial);
  try {
    if (typeof navigator.share === 'function') {
      await navigator.share({ title: row.driverName || 'Driver', text });
      return;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
  }
  window.open(whatsappUrl(text), '_blank', 'noopener,noreferrer');
}

function sharePhotoUrl(token: string, photoId?: number | null): string | null {
  if (!photoId) return null;
  return `${eventDutyAPI.mediaUrl(photoId)}&shareToken=${encodeURIComponent(token)}`;
}

function sessionLabel(status: Exclude<StatusChip, 'all'>): { text: string; className: string } {
  switch (status) {
    case 'started':
      return { text: 'Started', className: 'text-emerald-600' };
    case 'in_progress':
      return { text: 'In progress', className: 'text-amber-600' };
    case 'completed':
      return { text: 'Stopped', className: 'text-sky-600' };
    case 'pending':
      return { text: 'Pending', className: 'text-rose-500' };
    default: {
      const _never: never = status;
      return _never;
    }
  }
}

export default function EventSharePage() {
  const { token = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<EventShareView | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState<ChipId>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<ListFilter>('all');
  const [placeBusy, setPlaceBusy] = useState<number | null>(null);
  const [selected, setSelected] = useState<ShareRow | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<{ opening: string | null; closing: string | null }>({ opening: null, closing: null });
  const [photoPreview, setPhotoPreview] = useState<{ url: string; title: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showMap, setShowMap] = useState(false);
  const [track, setTrack] = useState<EventTrackVehicle[]>([]);
  const [trackBusy, setTrackBusy] = useState(false);
  const date = params.get('date') || undefined;
  const placeBusyRef = useRef<number | null>(null);
  placeBusyRef.current = placeBusy;

  const load = () => {
    setError('');
    fetchEventShare(token, date).then(setView).catch((err) => setError(err instanceof Error ? err.message : 'Unable to load'));
  };

  useEffect(() => {
    load();
  }, [token, date]);

  useEffect(() => {
    if (!token) return;
    const pull = () => {
      if (document.visibilityState === 'hidden') return;
      fetchEventShare(token, date).then((next) => {
        const busyId = placeBusyRef.current;
        setView((current) => {
          if (!current || busyId == null) return next;
          const local = current.vehicles.find((row) => row.dutyId === busyId);
          if (!local) return next;
          return {
            ...next,
            vehicles: next.vehicles.map((vehicle) => (
              vehicle.dutyId === busyId
                ? { ...vehicle, dutyPlace: local.dutyPlace, parkingAsked: local.parkingAsked }
                : vehicle
            )),
          };
        });
      }).catch(() => undefined);
    };
    const id = window.setInterval(pull, 10000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pull();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [token, date]);

  useEffect(() => {
    if (!selected?.dutyId || !view) return;
    const fresh = view.vehicles.find((row) => row.dutyId === selected.dutyId);
    if (!fresh) return;
    if (
      fresh.dutyPlace !== selected.dutyPlace
      || Boolean(fresh.parkingAsked) !== Boolean(selected.parkingAsked)
      || fresh.status !== selected.status
      || fresh.vehicleNumber !== selected.vehicleNumber
      || fresh.vehicleType !== selected.vehicleType
      || fresh.endRequestedAt !== selected.endRequestedAt
      || fresh.endRequestSeenAt !== selected.endRequestSeenAt
    ) {
      setSelected(fresh);
    }
  }, [view, selected]);

  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.scrollbarGutter;
    html.style.scrollbarGutter = 'stable';
    const tick = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => {
      html.style.scrollbarGutter = previous;
      window.clearInterval(tick);
    };
  }, []);

  const loadTrack = () => {
    setTrackBusy(true);
    fetchEventTracking(token, date)
      .then((rows) => setTrack(rows.filter(isShareVehicleAssigned)))
      .catch(() => setTrack([]))
      .finally(() => setTrackBusy(false));
  };

  useEffect(() => {
    if (!selected) {
      setSelectedPhotos({ opening: null, closing: null });
      return;
    }
    let cancelled = false;
    setSelectedPhotos({ opening: null, closing: null });
    const load = async (id: number | null | undefined, key: 'opening' | 'closing') => {
      if (!id) return;
      try {
        const url = await eventDutyAPI.sharePhotoDataUrl(token, id);
        if (!cancelled) setSelectedPhotos((prev) => ({ ...prev, [key]: url }));
      } catch {
        if (!cancelled) setSelectedPhotos((prev) => ({ ...prev, [key]: null }));
      }
    };
    void load(selected.openingPhotoId, 'opening');
    void load(selected.closingPhotoId, 'closing');
    return () => { cancelled = true; };
  }, [selected, token]);

  useEffect(() => {
    if (!showMap) return;
    loadTrack();
    const id = window.setInterval(loadTrack, 8000);
    return () => window.clearInterval(id);
  }, [showMap, token, date]);

  const assignedVehicles = useMemo(
    () => (view?.vehicles || []).filter(isShareVehicleAssigned),
    [view],
  );

  const stats = useMemo(
    () => shareListStats(assignedVehicles, view?.selectedDate || ''),
    [assignedVehicles, view?.selectedDate],
  );
  const tripCount = useMemo(
    () => assignedVehicles.filter((row) => dutyStarted(row) && rowPlace(row) === 'trip').length,
    [assignedVehicles],
  );
  const parkingCount = useMemo(
    () => assignedVehicles.filter((row) => dutyStarted(row) && rowPlace(row) === 'parking').length,
    [assignedVehicles],
  );

  const types = useMemo(() => {
    const set = new Set(assignedVehicles.map((row) => row.vehicleType).filter(Boolean));
    return Array.from(set);
  }, [assignedVehicles]);

  const applyPlace = (dutyId: number, place: 'trip' | 'parking', parkingAsked: boolean) => {
    setView((current) => {
      if (!current) return current;
      return {
        ...current,
        vehicles: current.vehicles.map((vehicle) => (
          vehicle.dutyId === dutyId ? { ...vehicle, dutyPlace: place, parkingAsked } : vehicle
        )),
      };
    });
    setSelected((current) => (
      current?.dutyId === dutyId ? { ...current, dutyPlace: place, parkingAsked } : current
    ));
  };

  const askDriverParking = async (row: ShareRow) => {
    if (!row.dutyId || !dutyStarted(row) || placeBusy != null) return;
    const dutyId = row.dutyId;
    const previous = rowPlace(row);
    const previousAsked = Boolean(row.parkingAsked);
    setPlaceBusy(dutyId);
    applyPlace(dutyId, 'trip', true);
    try {
      const res = await setShareDutyPlace(token, dutyId, 'trip');
      toast.success(tripPromptResultMessage(previous === 'trip', res.delivery));
    } catch (err) {
      applyPlace(dutyId, previous, previousAsked);
      toast.error(err instanceof Error ? err.message : 'Could not alert the driver');
    } finally {
      setPlaceBusy(null);
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const placeFilter = statusFilter === 'trip' || statusFilter === 'parking'
      ? statusFilter
      : chip === 'trip' || chip === 'parking'
        ? chip
        : null;
    const activeStatus = placeFilter || statusFilter === 'all' ? chip : statusFilter;
    return assignedVehicles
      .filter((row) => {
        if (placeFilter) {
          if (!dutyStarted(row) || rowPlace(row) !== placeFilter) return false;
        } else if (activeStatus !== 'all' && activeStatus !== 'parking' && activeStatus !== 'trip' && rowStatus(row) !== activeStatus) {
          return false;
        }
        if (typeFilter !== 'all' && row.vehicleType !== typeFilter) return false;
        if (!q) return true;
        return [row.vehicleNumber, row.driverName, row.vehicleType, row.driverMobile, row.dutySlipNo]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const aPark = dutyStarted(a) && rowPlace(a) === 'parking';
        const bPark = dutyStarted(b) && rowPlace(b) === 'parking';
        if (aPark !== bPark) return aPark ? -1 : 1;
        const aOpen = Boolean(a.openingAt && !a.closingAt);
        const bOpen = Boolean(b.openingAt && !b.closingAt);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;
        return dutyDurationMinutes(b.openingAt, b.closingAt, nowMs, b.pausedSeconds) - dutyDurationMinutes(a.openingAt, a.closingAt, nowMs, a.pausedSeconds);
      });
  }, [assignedVehicles, query, chip, typeFilter, statusFilter, nowMs]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f3f7fb] p-6 text-center text-red-600">
        <EventLinkSeo title="Event Vehicle List | Vizag Taxi Hub" description="This event share link is invalid or has expired." />
        {error}
      </div>
    );
  }
  if (!view) {
    return (
      <div className="min-h-screen bg-[#f3f7fb] p-6 text-center text-slate-500">
        <EventLinkSeo title="Event Vehicle List | Vizag Taxi Hub" description="Live vehicle list, duty status, and tracking for this Vizag Taxi Hub event." />
        Loading event…
      </div>
    );
  }

  const showSerial = Boolean(view.event.showSerialNo);
  const chips: Array<{ id: ChipId; label: string; count: number; icon: typeof Car }> = [
    { id: 'all', label: 'All Vehicles', count: stats.totalVehicles, icon: Car },
    { id: 'trip', label: 'In Trip', count: tripCount, icon: Play },
    { id: 'parking', label: 'In Parking', count: parkingCount, icon: Clock },
    { id: 'completed', label: 'Completed', count: stats.completed, icon: CheckCircle2 },
    { id: 'pending', label: 'Pending', count: stats.pending, icon: XCircle },
  ];

  return (
    <div className="min-h-screen bg-[#f3f7fb] text-slate-800">
      <EventLinkSeo
        title={`${view.event.name} | Event Vehicle List | Vizag Taxi Hub`}
        description={`Live vehicle list, duty status, and tracking for ${view.event.name}.`}
      />
      <header className="bg-[#f3f7fb]">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-3 px-4 pb-2 pt-4">
          <div className="flex min-w-0 flex-col items-start">
            <Logo
              size="small"
              linkless
              className="shrink-0 [&_img]:h-7 [&_img]:w-auto [&_img]:max-w-none [&_img]:object-contain"
            />
            <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Event vehicle list</div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-600">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDutyDate(view.event.startDate)} – {formatDutyDate(view.event.endDate)}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-700">{view.event.name}</div>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <AddToHomeButton kind="event" title="Event Vehicle List" shortName="Event" />
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-3 px-4 pb-10">
        {view.dates.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {view.dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setParams({ date: d })}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${d === view.selectedDate ? 'bg-[#2f6bff] text-white' : 'bg-white text-slate-500 shadow-sm'}`}
              >
                {formatDutyDateShort(d)}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
          <StatCard icon={<Car className="h-4 w-4" />} label={['Total', 'Vehicles']} value={stats.totalVehicles} tone="blue" />
          <StatCard icon={<Play className="h-4 w-4 fill-current" />} label={['In', 'Trip']} value={tripCount} tone="green" />
          <StatCard icon={<Clock className="h-4 w-4" />} label={['In', 'Parking']} value={parkingCount} tone="orange" />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label={['Trip', 'Completed']} value={stats.completed} tone="sky" />
          <StatCard icon={<XCircle className="h-4 w-4" />} label={['Total', 'Pending']} value={stats.pending} tone="red" />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {chips.map((item) => {
            const active = chip === item.id && statusFilter === 'all';
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setChip(item.id); setStatusFilter('all'); }}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold sm:gap-1.5 sm:px-3 sm:text-[11px] ${active ? 'bg-[#2f6bff] text-white' : 'bg-white text-slate-500 shadow-sm'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label} ({item.count})
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowMap((open) => !open)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${showMap ? 'bg-[#2f6bff] text-white' : 'bg-white text-slate-600 shadow-sm'}`}
        >
          <MapPin className="h-3.5 w-3.5" />
          {showMap ? 'Hide live map' : 'Live map'}
        </button>

        {showMap && (
          <EventTrackingMap vehicles={track} onRefresh={loadTrack} refreshing={trackBusy} />
        )}

        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by vehicle number, driver name or type..."
              className="h-10 w-full rounded-full border-0 bg-white pl-9 pr-3 text-xs shadow-sm outline-none placeholder:text-slate-400 sm:text-sm"
            />
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 w-[5.25rem] shrink-0 rounded-full border-0 bg-white px-2 text-[11px] text-slate-600 shadow-sm sm:w-auto sm:px-3 sm:text-sm"
          >
            <option value="all">All Types</option>
            {types.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as ListFilter); if (e.target.value !== 'all') setChip('all'); }}
            className="h-10 w-[5.25rem] shrink-0 rounded-full border-0 bg-white px-2 text-[11px] text-slate-600 shadow-sm sm:w-auto sm:px-3 sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="trip">In Trip</option>
            <option value="parking">In Parking</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm sm:inline-flex"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6.25rem] items-center gap-x-2 border-b border-slate-100 px-3 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_7rem] sm:px-4 sm:text-[10px]">
            <div>Vehicle Details</div>
            <div>Driver Details</div>
            <div className="text-right">Action</div>
          </div>
          {rows.map((row, index) => {
            const duration = formatDutyDurationCompact(row.openingAt, billableDutyEnd(row.closingAt, row.endRequestedAt), nowMs, row.pausedSeconds);
            const session = sessionLabel(rowStatus(row));
            const asked = row.status === 'in_progress' && row.endRequestedAt;
            const sessionText = asked
              ? (row.endRequestSeenAt ? 'Seen · end duty' : 'Asked to end')
              : session.text;
            const sessionClass = asked ? 'text-red-600' : session.className;
            const started = dutyStarted(row);
            const serial = rowSerial(row, assignedVehicles);
            return (
              <div
                key={`${row.dutySlipNo}-${index}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(row)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelected(row);
                  }
                }}
                className="grid cursor-pointer grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6.25rem] items-center gap-x-2 border-t border-slate-50 px-3 py-2.5 hover:bg-slate-50 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_7rem] sm:px-4"
              >
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-semibold leading-tight sm:text-sm">{row.vehicleType}</div>
                  <div className="flex min-w-0 items-center gap-1.5">
                    <div className="truncate text-[10px] leading-tight text-slate-400 sm:text-xs">{row.vehicleNumber}</div>
                    {showSerial ? (
                      <span
                        aria-label={`Serial ${serial}`}
                        className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none text-slate-700 sm:text-[11px]"
                      >
                        {serial}
                      </span>
                    ) : null}
                  </div>
                  {duration ? (
                    <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 sm:text-[10px]">
                      {duration}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[11px] font-medium leading-tight sm:text-sm">{row.driverName}</div>
                  {row.driverMobile ? (
                    <a
                      href={`tel:${row.driverMobile}`}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] leading-tight text-slate-400 sm:text-xs"
                    >
                      <Phone className="h-3 w-3 shrink-0" />
                      <span className="truncate">{displayMobile(row.driverMobile)}</span>
                    </a>
                  ) : (
                    <div className="text-[10px] text-slate-300">—</div>
                  )}
                  <div className={`mt-0.5 text-[10px] font-semibold leading-tight sm:text-xs ${sessionClass}`}>
                    {sessionText}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    aria-label={`Share ${row.driverName || 'driver'}`}
                    title="Share"
                    onClick={() => { void shareDriverCard(row, serial, showSerial); }}
                    className="inline-flex h-6 items-center gap-1 rounded-full bg-slate-100 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    <Share2 className="h-3 w-3" />
                    Share
                  </button>
                  {row.dutyId ? (
                    <AskDriverEndButton
                      appearance="share"
                      shareToken={token}
                      dutyId={row.dutyId}
                      status={row.status}
                      endRequestedAt={row.endRequestedAt}
                      onDone={load}
                    />
                  ) : null}
                  {started ? (
                    <div className="flex flex-col items-end gap-0.5">
                      <button
                        type="button"
                        disabled={placeBusy === row.dutyId}
                        title={rowPlace(row) === 'trip'
                          ? 'Ask the driver to tap In Parking when the guest is dropped'
                          : 'Mark In Trip and alert the driver'}
                        onClick={() => { void askDriverParking(row); }}
                        className={`relative h-6 w-[4.7rem] overflow-hidden rounded-full text-[10px] font-semibold text-white transition-colors duration-300 ease-in-out disabled:opacity-70 sm:text-[11px] ${rowPlace(row) === 'parking' ? 'bg-amber-500' : 'bg-[#2f6bff]'}`}
                      >
                        <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${rowPlace(row) === 'trip' ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                          In Trip
                        </span>
                        <span className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${rowPlace(row) === 'parking' ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
                          In Parking
                        </span>
                      </button>
                      {rowPlace(row) === 'trip' && row.parkingAsked ? (
                        <span className="text-[9px] font-semibold text-amber-600">Driver asked</span>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      {row.dutyId ? (
                        <ContinueDutyButton
                          appearance="share"
                          shareToken={token}
                          dutyId={row.dutyId}
                          status={row.status}
                          openingAt={row.openingAt}
                          closingAt={row.closingAt}
                          onDone={load}
                        />
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 hover:bg-emerald-100 sm:px-3 sm:text-[11px]"
                      >
                        View
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No vehicles match this filter.</div>
          )}
        </div>

        {view.event.updatedAt && (
          <p className="text-center text-xs text-slate-400">Last updated {formatServerDateTime(view.event.updatedAt)}</p>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[10050] overflow-y-auto bg-[#f3f6fb]">
          <EventDutyDetailScreen
            model={{
              dutyDate: view.selectedDate,
              eventName: view.event.name,
              vehicleType: selected.vehicleType,
              vehicleNumber: selected.vehicleNumber,
              driverName: selected.driverName,
              driverMobile: selected.driverMobile,
              driverPhotoUrl: selected.driverPhoto || sharePhotoUrl(token, selected.driverPhotoId),
              pickupLocation: selected.reportingLocation || '—',
              reportingTime: selected.reportingTime || '',
              reportingLocation: selected.reportingLocation || '—',
              locationName: selected.openingGps?.address || selected.closingGps?.address || '—',
              status: selected.status,
              openingAt: selected.openingAt,
              closingAt: selected.closingAt,
              endRequestedAt: selected.endRequestedAt,
              pausedSeconds: selected.pausedSeconds,
              openingKm: selected.openingKm,
              closingKm: selected.closingKm,
              totalKm: selected.totalKm,
              openingGps: selected.openingGps,
              closingGps: selected.closingGps,
              openingPhotoUrl: selectedPhotos.opening,
              closingPhotoUrl: selectedPhotos.closing,
            }}
            onBack={() => setSelected(null)}
            homeAction={<AddToHomeButton kind="event" title="Event Vehicle List" shortName="Event" />}
            callButton={selected.driverMobile ? { label: 'Call Driver', number: selected.driverMobile } : null}
            onPhotoClick={(url, title) => setPhotoPreview({ url, title })}
          />
        </div>
      )}
      {photoPreview && (
        <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/60 p-4" onClick={() => setPhotoPreview(null)}>
          <div className="relative max-h-[90vh] w-full max-w-md overflow-hidden rounded-xl bg-white p-3" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="mb-2 text-sm text-blue-600" onClick={() => setPhotoPreview(null)}>Close</button>
            <img src={photoPreview.url} alt={photoPreview.title} className="max-h-[75vh] w-full rounded object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, tone,
}: {
  icon: ReactNode;
  label: [string, string];
  value: number;
  tone: 'blue' | 'green' | 'orange' | 'sky' | 'red';
}) {
  const tones: Record<typeof tone, string> = {
    blue: 'bg-gradient-to-b from-blue-50 to-white text-blue-600',
    green: 'bg-gradient-to-b from-emerald-50 to-white text-emerald-600',
    orange: 'bg-gradient-to-b from-amber-50 to-white text-amber-600',
    sky: 'bg-gradient-to-b from-sky-50 to-white text-sky-600',
    red: 'bg-gradient-to-b from-rose-50 to-white text-rose-500',
  };
  return (
    <div className={`rounded-2xl p-2 text-center shadow-sm sm:p-3 sm:text-left ${tones[tone]}`}>
      <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/70 sm:mx-0">{icon}</div>
      <div className="mt-1.5 text-xl font-extrabold leading-none sm:text-2xl">{value}</div>
      <div className="mt-1 text-[8px] font-bold uppercase leading-[1.15] tracking-wide opacity-80 sm:text-[11px]">
        <div>{label[0]}</div>
        <div>{label[1]}</div>
      </div>
    </div>
  );
}
