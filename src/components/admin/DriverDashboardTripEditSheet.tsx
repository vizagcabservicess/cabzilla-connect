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
  if (raw) return raw;
  if (trip.status === 'completed') return 'completed';
  if (trip.status === 'in_progress') return 'in_progress';
  return 'assigned';
}

interface Props {
  trip: DriverDashboardTrip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function DriverDashboardTripEditSheet({ trip, open, onOpenChange, onSaved }: Props) {
  const [pickupDateLocal, setPickupDateLocal] = useState('');
  const [driverName, setDriverName] = useState('');
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

  const fuelNote = useMemo(() => {
    if (!trip) return '';
    return `₹${Number(trip.fuelSpend ?? 0).toFixed(0)} (sum of fuel entries for this trip — edit in Fuel tab)`;
  }, [trip]);

  useEffect(() => {
    if (!trip || !open) return;
    setPickupDateLocal(toDatetimeLocalValue(trip.startTime));
    setDriverName(trip.driverName || '');
    setVehicleNumber(trip.vehicleNumber || '');
    setPickupLocation(trip.pickupLocation || '');
    setDropLocation(trip.dropLocation || '');
    setStatus(inferDefaultStatus(trip));
    setStartOdo(String(trip.startingOdometer ?? ''));
    setEndOdo(String(trip.endingOdometer ?? ''));
    const dist =
      trip.storedDistanceKm != null && trip.storedDistanceKm > 0
        ? trip.storedDistanceKm
        : trip.totalKilometers;
    setDistanceKm(String(dist ?? ''));
    setCompletedAtLocal(toDatetimeLocalValue(trip.completedAt || trip.endTime));
    setTotalAmount(String(trip.tripAmount ?? ''));
    setCollected(
      trip.driverCollectedAmount != null && Number.isFinite(trip.driverCollectedAmount)
        ? String(trip.driverCollectedAmount)
        : ''
    );
    setPaymentType((trip.paymentType as PaymentType) || 'self_paid');
    setError(null);
  }, [trip, open]);

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
        vehicleNumber: vehicleNumber.trim(),
        pickupLocation: pickupLocation.trim(),
        dropLocation: dropLocation.trim(),
        status: status.trim(),
        startOdometer: parseFloat(startOdo) || 0,
        endOdometer: parseFloat(endOdo) || 0,
        distance: parseFloat(distanceKm) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        paymentType: paymentType.trim(),
      };
      const comp = datetimeLocalToMysql(completedAtLocal);
      payload.completedAt = comp || null;
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
                </div>
                <div className="grid gap-2">
                  <Label>End ODO</Label>
                  <Input value={endOdo} onChange={(e) => setEndOdo(e.target.value)} inputMode="decimal" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Distance (km)</Label>
                <Input value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} inputMode="decimal" />
                <p className="text-xs text-muted-foreground">Stored on booking; list may show odometer-derived km when higher.</p>
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
    </>
  );
}
