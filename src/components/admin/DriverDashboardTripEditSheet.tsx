import React, { useEffect, useMemo, useState } from 'react';
import type { DriverDashboardTrip, PaymentType } from '@/types/driverDashboard';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { bookingAPI } from '@/services/api/bookingAPI';
import { vendorTripAPI } from '@/services/api/vendorTripAPI';
import { getApiUrl } from '@/config/api';

const PAYMENT_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: 'self_paid', label: 'Self' },
  { value: 'company_phonepe', label: 'Company PhonePe' },
  { value: 'company_paid', label: 'Company paid' },
  { value: 'agent_booking', label: 'Agent booking' },
  { value: 'corporate_booking', label: 'Corporate' },
];

const STATUS_OPTIONS = [
  { value: 'assigned', label: 'Assigned' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'started', label: 'Started' },
  { value: 'on_trip', label: 'On trip' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const match = iso.trim().match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}:\d{2})/);
  if (match) return `${match[1]}T${match[2]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToMysql(dt: string): string {
  if (!dt || !dt.includes('T')) return '';
  const [datePart, timePart] = dt.split('T');
  const hm = (timePart || '').slice(0, 5);
  if (!datePart || !hm) return '';
  return `${datePart} ${hm}:00`;
}

function inferDefaultStatus(trip: DriverDashboardTrip): string {
  const raw = (trip.bookingStatusRaw || '').trim().toLowerCase();
  const known = STATUS_OPTIONS.some((option) => option.value === raw);
  if (known) return raw;
  const ops = (trip.opsStatus || '').trim().toLowerCase();
  if (STATUS_OPTIONS.some((option) => option.value === ops)) return ops;
  if (trip.status === 'in_progress') return 'in_progress';
  if (trip.status === 'completed') return 'completed';
  return 'assigned';
}

function savedTripForm(trip: DriverDashboardTrip) {
  const dist =
    trip.storedDistanceKm != null && trip.storedDistanceKm > 0
      ? trip.storedDistanceKm
      : trip.totalKilometers;
  return {
    pickupDateLocal: toDatetimeLocalValue(trip.startTime),
    driverName: trip.driverName || '',
    driverPhone: trip.driverPhone || '',
    vehicleNumber: trip.vehicleNumber || '',
    pickupLocation: trip.pickupLocation || '',
    dropLocation: trip.dropLocation || '',
    status: inferDefaultStatus(trip),
    startOdo: trip.startingOdometer > 0 ? String(trip.startingOdometer) : '',
    endOdo: trip.endingOdometer > 0 ? String(trip.endingOdometer) : '',
    distanceKm: String(dist ?? ''),
    completedAtLocal: toDatetimeLocalValue(trip.completedAt || trip.endTime),
    totalAmount: String(trip.tripAmount ?? ''),
    collected:
      trip.driverCollectedAmount != null && Number.isFinite(trip.driverCollectedAmount)
        ? String(trip.driverCollectedAmount)
        : '',
    paymentType: ((trip.paymentType as PaymentType) || 'self_paid') as PaymentType,
  };
}

type DutyKmRow = {
  dayId: number;
  segmentId: number;
  dayIndex: number;
  dutyDate: string;
  dayStatus: string;
  detail: string;
  openingKm: string;
  closingKm: string;
  closingAt: string;
};

function kmText(value: unknown): string {
  if (value == null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : '';
}

function formatDutyDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dutyStatusText(status: string): string {
  const raw = status.trim().toLowerCase();
  if (raw === 'in_progress') return 'In progress';
  if (raw === 'not_started') return 'Not started';
  if (raw === 'completed') return 'Completed';
  if (raw === 'cancelled') return 'Cancelled';
  return raw ? raw.replace(/_/g, ' ') : '';
}

interface Props {
  trip: DriverDashboardTrip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function formatSavedWhen(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]));
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function DriverDashboardTripEditSheet({ trip, open, onOpenChange, onSaved }: Props) {
  const [pickupDateLocal, setPickupDateLocal] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [status, setStatus] = useState('assigned');
  const [startOdo, setStartOdo] = useState('');
  const [endOdo, setEndOdo] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [completedAtLocal, setCompletedAtLocal] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [collected, setCollected] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('self_paid');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dayRows, setDayRows] = useState<DutyKmRow[]>([]);
  const [savedDayRows, setSavedDayRows] = useState<DutyKmRow[]>([]);
  const [dayLoadState, setDayLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [dayLoadError, setDayLoadError] = useState<string | null>(null);
  const [clearing, setClearing] = useState<'start' | 'end' | null>(null);
  const [fillingSheet, setFillingSheet] = useState(false);
  const [startedAt, setStartedAt] = useState('');
  const [cancellingDayId, setCancellingDayId] = useState<number | null>(null);
  const [cancelDayBusy, setCancelDayBusy] = useState(false);
  const readingsStamp = React.useRef(0);

  const applyDutyDays = (days: Array<{ id?: number; dayIndex?: number; dutyDate?: string; status?: string; segments?: Array<Record<string, unknown>> }>) => {
    const rows: DutyKmRow[] = [];
    for (const day of days) {
      const dayId = Number(day.id);
      const segments = Array.isArray(day.segments) ? day.segments : [];
      for (const segment of segments) {
        const segmentId = Number(segment.id);
        if (!Number.isFinite(segmentId)) continue;
        const driverName = typeof segment.driverName === 'string' ? segment.driverName : '';
        const vehicleNumber = typeof segment.vehicleNumber === 'string' ? segment.vehicleNumber : '';
        rows.push({
          dayId: Number.isFinite(dayId) ? dayId : 0,
          segmentId,
          dayIndex: Number(day.dayIndex) || rows.length + 1,
          dutyDate: String(day.dutyDate || ''),
          dayStatus: String(day.status || ''),
          detail: [driverName, vehicleNumber].filter((part) => part.trim() !== '').join(' · '),
          openingKm: kmText(segment.openingKm),
          closingKm: kmText(segment.closingKm),
          closingAt: toDatetimeLocalValue(typeof segment.closingAt === 'string' ? segment.closingAt : ''),
        });
      }
    }
    setDayRows(rows);
    setSavedDayRows(rows);
    setDayLoadState('ready');
  };

  const fuelNote = useMemo(() => {
    if (!trip) return '';
    return `₹${Number(trip.fuelSpend ?? 0).toFixed(0)} (sum of fuel entries for this trip — edit in Fuel tab)`;
  }, [trip]);

  const applySavedTrip = (source: DriverDashboardTrip) => {
    const saved = savedTripForm(source);
    setPickupDateLocal(saved.pickupDateLocal);
    setDriverName(saved.driverName);
    setDriverPhone(saved.driverPhone);
    setVehicleNumber(saved.vehicleNumber);
    setPickupLocation(saved.pickupLocation);
    setDropLocation(saved.dropLocation);
    setStatus(saved.status);
    setStartOdo(saved.startOdo);
    setEndOdo(saved.endOdo);
    setDistanceKm(saved.distanceKm);
    setCompletedAtLocal(saved.completedAtLocal);
    setTotalAmount(saved.totalAmount);
    setCollected(saved.collected);
    setPaymentType(saved.paymentType);
    setDayRows(savedDayRows.map((row) => ({ ...row })));
    setError(null);
  };

  const fillTripSheet = async () => {
    if (!trip) return;
    const confirmed = window.confirm('Replace the fuel amount on this trip’s sheet row with the fuel already saved?');
    if (!confirmed) return;
    setFillingSheet(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/fuel_records.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fill-sheet', bookingId: trip.tripId }),
      });
      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.message || 'Could not fill the sheet');
      }
      const failed = Array.isArray(data.data?.failed) ? data.data.failed.length : Number(data.data?.failed ?? 0);
      const skipped = Array.isArray(data.data?.missing) ? data.data.missing.length : Number(data.data?.skipped ?? 0);
      if (failed > 0 || skipped > 0) {
        setError(typeof data.message === 'string' ? data.message : 'The fuel could not be written onto the sheet');
        return;
      }
      window.alert(typeof data.message === 'string' ? data.message : 'Fuel written onto the sheet');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not fill the sheet');
    } finally {
      setFillingSheet(false);
    }
  };

  useEffect(() => {
    if (!trip || !open) return;
    let cancelled = false;
    const stamp = readingsStamp.current;
    void vendorTripAPI.officeReadings([trip.tripId]).then((rows) => {
      if (cancelled || stamp !== readingsStamp.current) return;
      const row = rows[0];
      if (!row) return;
      if (row.startCleared) {
        setStartOdo('');
        setStartedAt('');
      } else if (row.startKm != null && row.startKm > 0) {
        setStartOdo(String(row.startKm));
        if (row.startedAt) setStartedAt(row.startedAt);
      }
      if (row.endCleared || row.startCleared) {
        setEndOdo('');
      } else if (row.endKm != null && row.endKm > 0) {
        setEndOdo(String(row.endKm));
      }
    }).catch(() => undefined);
    void vendorTripAPI.syncOdometer(trip.tripId).then((changed) => {
      if (!cancelled && changed) onSaved();
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, trip?.tripId]);

  useEffect(() => {
    if (!trip || !open) return;
    applySavedTrip(trip);
    let cancelled = false;
    setDayLoadState('loading');
    setDayLoadError(null);
    const token = localStorage.getItem('auth_token');
    const stamp = readingsStamp.current;
    void fetch(getApiUrl(`/api/admin/duty-assignment.php?bookingId=${trip.tripId}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (response) => {
        const result = await response.json() as { status?: string; message?: string; days?: Array<{ id?: number; dayIndex?: number; dutyDate?: string; status?: string; segments?: Array<Record<string, unknown>> }> };
        if (!response.ok || result?.status !== 'success') {
          throw new Error(result?.message || 'Duty days could not be loaded');
        }
        return result;
      })
      .then((result) => {
        if (cancelled || stamp !== readingsStamp.current || !Array.isArray(result.days)) return;
        applyDutyDays(result.days);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDayRows([]);
          setSavedDayRows([]);
          setDayLoadState('error');
          setDayLoadError(error instanceof Error ? error.message : 'Duty days could not be loaded');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [trip, open]);

  const dirty = useMemo(() => {
    if (!trip) return false;
    const saved = savedTripForm(trip);
    return (
      pickupDateLocal !== saved.pickupDateLocal ||
      driverName !== saved.driverName ||
      driverPhone !== saved.driverPhone ||
      vehicleNumber !== saved.vehicleNumber ||
      pickupLocation !== saved.pickupLocation ||
      dropLocation !== saved.dropLocation ||
      status !== saved.status ||
      startOdo !== saved.startOdo ||
      endOdo !== saved.endOdo ||
      distanceKm !== saved.distanceKm ||
      completedAtLocal !== saved.completedAtLocal ||
      totalAmount !== saved.totalAmount ||
      collected !== saved.collected ||
      paymentType !== saved.paymentType ||
      JSON.stringify(dayRows) !== JSON.stringify(savedDayRows)
    );
  }, [
    trip,
    pickupDateLocal,
    driverName,
    driverPhone,
    vehicleNumber,
    pickupLocation,
    dropLocation,
    status,
    startOdo,
    endOdo,
    distanceKm,
    completedAtLocal,
    totalAmount,
    collected,
    paymentType,
    dayRows,
    savedDayRows,
  ]);

  const handleSave = async () => {
    if (!trip) return;
    setSaving(true);
    setError(null);
    try {
      const pickupSql = datetimeLocalToMysql(pickupDateLocal);
      if (!pickupSql) {
        setError('Journey date & time is required');
        setSaving(false);
        return;
      }
      const payload: Record<string, unknown> = {
        pickupDate: pickupSql,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        vehicleNumber: vehicleNumber.trim(),
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        status: status.trim(),
        distance: parseFloat(distanceKm) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        paymentType: paymentType.trim(),
      };
      const comp = datetimeLocalToMysql(completedAtLocal);
      payload.completedAt = comp || null;
      if (dayRows.length > 0) {
        payload.dutySegments = dayRows.map((row) => ({
          id: row.segmentId,
          openingKm: row.openingKm.trim() === '' ? null : Number(row.openingKm),
          closingKm: row.closingKm.trim() === '' ? null : Number(row.closingKm),
          closingAt: datetimeLocalToMysql(row.closingAt) || null,
        }));
      }
      const startTrim = startOdo.trim();
      if (startTrim !== '') payload.startOdometer = parseFloat(startTrim);
      const endTrim = endOdo.trim();
      if (endTrim !== '') payload.endOdometer = parseFloat(endTrim);
      const cTrim = collected.trim();
      if (cTrim === '') {
        payload.driverCollectedAmount = null;
      } else {
        payload.driverCollectedAmount = parseFloat(cTrim);
      }
      const res = await bookingAPI.updateBooking(trip.tripId, payload as any, { forceAdmin: true });
      if (res?.status === 'error') {
        throw new Error(res?.message || 'Update failed');
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDay = async () => {
    if (!trip || cancellingDayId == null) return;
    setCancelDayBusy(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/admin/duty-assignment.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'cancel-day',
          bookingId: trip.tripId,
          dayId: cancellingDayId,
        }),
      });
      const result = await response.json() as {
        status?: string;
        message?: string;
        days?: Array<{ id?: number; dayIndex?: number; dutyDate?: string; status?: string; segments?: Array<Record<string, unknown>> }>;
      };
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Could not cancel this day');
      }
      if (Array.isArray(result.days)) {
        applyDutyDays(result.days);
      }
      setCancellingDayId(null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel this day');
    } finally {
      setCancelDayBusy(false);
    }
  };

  const askDriverToReupload = async (side: 'start' | 'end') => {
    if (!trip) return;
    setClearing(side);
    setError(null);
    try {
      readingsStamp.current += 1;
      const result = await vendorTripAPI.clearReading(trip.tripId, side);
      if (side === 'start') {
        setStartOdo('');
        setEndOdo('');
        setStartedAt('');
        setDistanceKm('');
        setStatus('assigned');
        setDayRows((current) => current.map((row) => ({ ...row, openingKm: '', closingKm: '' })));
        setSavedDayRows((current) => current.map((row) => ({ ...row, openingKm: '', closingKm: '' })));
      } else {
        setEndOdo('');
        setDayRows((current) => current.map((row) => ({ ...row, closingKm: '' })));
        setSavedDayRows((current) => current.map((row) => ({ ...row, closingKm: '' })));
      }
      if (result.phone && result.message) {
        try {
          await bookingAPI.sendAdminTripWhatsApp(result.phone, result.message);
        } catch {
          setError('The odometer was removed. The WhatsApp did not send, so forward the same trip link to the driver.');
        }
      }
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'The odometer could not be removed.');
    } finally {
      setClearing(null);
    }
  };

  const handleDelete = async () => {
    if (!trip) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await bookingAPI.deleteBooking(trip.tripId);
      if (res?.status === 'error') {
        throw new Error(res?.message || 'Delete failed');
      }
      setDeleteOpen(false);
      onOpenChange(false);
      onSaved();
      if (res?.data?.sheet_error) {
        window.alert(res?.message || 'Booking deleted, but it could not be removed from the Google Sheet');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit trip</SheetTitle>
            <p className="text-sm text-muted-foreground">
              {trip ? trip.tripCode : ''} · Booking #{trip?.tripId}
            </p>
          </SheetHeader>
          {trip ? (
            <div className="grid gap-4 py-4">
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <div className="grid gap-2">
                <Label>Journey date & time</Label>
                <Input
                  type="datetime-local"
                  value={pickupDateLocal}
                  onChange={(e) => setPickupDateLocal(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Driver name</Label>
                <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Driver phone</Label>
                <Input inputMode="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Vehicle number</Label>
                <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>From (pickup)</Label>
                <Textarea rows={2} value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>To (drop)</Label>
                <Textarea rows={2} value={dropLocation} onChange={(e) => setDropLocation(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Start ODO</Label>
                  <Input value={startOdo} onChange={(e) => setStartOdo(e.target.value)} inputMode="decimal" />
                  {startedAt ? <p className="text-xs text-muted-foreground">Started {formatSavedWhen(startedAt)}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label>End ODO</Label>
                  <Input value={endOdo} onChange={(e) => setEndOdo(e.target.value)} inputMode="decimal" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Saving replaces the photo reading, so the trip list and duty slip use these numbers.
              </p>
              <div className="grid gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={clearing != null || saving}
                  onClick={() => void askDriverToReupload('start')}
                >
                  {clearing === 'start' ? 'Removing…' : 'Remove opening odometer and ask the driver to upload again'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={clearing != null || saving}
                  onClick={() => void askDriverToReupload('end')}
                >
                  {clearing === 'end' ? 'Removing…' : 'Remove closing odometer and ask the driver to upload again'}
                </Button>
              </div>
              <div className="grid gap-3">
                <Label>Kilometres by day</Label>
                <p className="text-xs text-muted-foreground -mt-2">
                  Change any day, including a day marked completed. Day 3 staying completed does not lock Day 1 or Day 2.
                </p>
                {dayLoadState === 'loading' ? (
                  <p className="text-sm text-muted-foreground">Loading Day 1, Day 2, and Day 3…</p>
                ) : null}
                {dayLoadState === 'error' ? (
                  <p className="text-sm text-destructive">{dayLoadError}</p>
                ) : null}
                {dayLoadState === 'ready' && dayRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">This trip has no duty days yet.</p>
                ) : null}
                {dayRows.map((row) => (
                    <div key={row.segmentId} className="rounded-md border p-3 grid gap-2">
                      <div className="text-sm font-medium">
                        Day {row.dayIndex}
                        {row.dutyDate ? ` · ${formatDutyDate(row.dutyDate)}` : ''}
                        {row.dayStatus ? ` · ${dutyStatusText(row.dayStatus)}` : ''}
                      </div>
                      {row.detail ? <p className="text-xs text-muted-foreground">{row.detail}</p> : null}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                          <Label className="text-xs">Open</Label>
                          <Input
                            value={row.openingKm}
                            inputMode="decimal"
                            onChange={(event) => {
                              const value = event.target.value;
                              setDayRows((current) => current.map((item) => (
                                item.segmentId === row.segmentId ? { ...item, openingKm: value } : item
                              )));
                            }}
                          />
                        </div>
                        <div className="grid gap-1">
                          <Label className="text-xs">Close</Label>
                          <Input
                            value={row.closingKm}
                            inputMode="decimal"
                            onChange={(event) => {
                              const value = event.target.value;
                              setDayRows((current) => current.map((item) => (
                                item.segmentId === row.segmentId ? { ...item, closingKm: value } : item
                              )));
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Closing time</Label>
                        <Input
                          type="datetime-local"
                          value={row.closingAt}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDayRows((current) => current.map((item) => (
                              item.segmentId === row.segmentId ? { ...item, closingAt: value } : item
                            )));
                          }}
                        />
                      </div>
                      {row.dayId > 0
                        && row.dayStatus.trim().toLowerCase() === 'not_started'
                        && new Set(dayRows.map((item) => item.dayId).filter((id) => id > 0)).size > 1 ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="text-destructive border-destructive/40"
                          disabled={cancelDayBusy || saving}
                          onClick={() => setCancellingDayId(row.dayId)}
                        >
                          Cancel this day
                        </Button>
                      ) : null}
                    </div>
                  ))}
              </div>
              <div className="grid gap-2">
                <Label>Distance (km)</Label>
                <Input value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} inputMode="decimal" />
              </div>
              <div className="grid gap-2">
                <Label>Trip end (completed at)</Label>
                <Input
                  type="datetime-local"
                  value={completedAtLocal}
                  onChange={(e) => setCompletedAtLocal(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used with journey start to compute hours in reports.</p>
              </div>
              <div className="grid gap-2">
                <Label>Fuel (read only)</Label>
                <p className="text-sm rounded-md border border-dashed px-3 py-2 bg-muted/40">{fuelNote}</p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!trip || fillingSheet}
                  onClick={() => { void fillTripSheet(); }}
                >
                  {fillingSheet ? 'Filling…' : 'Fill sheet'}
                </Button>
              </div>
              <div className="grid gap-2">
                <Label>Amount (₹)</Label>
                <Input value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} inputMode="decimal" />
              </div>
              <div className="grid gap-2">
                <Label>Collected (₹)</Label>
                <Input value={collected} onChange={(e) => setCollected(e.target.value)} inputMode="decimal" placeholder="Empty = clear" />
              </div>
              <div className="grid gap-2">
                <Label>Payment</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <SheetFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              disabled={!trip || saving || !dirty}
              onClick={() => {
                if (trip) applySavedTrip(trip);
              }}
            >
              Undo
            </Button>
            <Button onClick={handleSave} disabled={saving || !trip}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="destructive" disabled={!trip || deleting} onClick={() => setDeleteOpen(true)}>
              Delete trip
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently remove booking {trip?.tripCode ?? trip?.tripId}. Active trips may be blocked by the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancellingDayId != null}
        onOpenChange={(next) => {
          if (!next && !cancelDayBusy) setCancellingDayId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this duty day?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const day = dayRows.find((row) => row.dayId === cancellingDayId);
                const label = day
                  ? `Day ${day.dayIndex}${day.dutyDate ? ` · ${formatDutyDate(day.dutyDate)}` : ''}`
                  : 'This day';
                return `${label} has not started. It will be removed from the trip. Completed days stay as they were driven.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelDayBusy}>Keep this day</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelDayBusy}
              onClick={() => void handleCancelDay()}
            >
              {cancelDayBusy ? 'Cancelling…' : 'Cancel this day'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
