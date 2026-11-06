import React, { useEffect, useState } from 'react';
import type { DriverDashboardTrip } from '@/types/driverDashboard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  driverOfficeTripAPI,
  type OfficeDutyView,
  type OfficeFleetVehicle,
} from '@/services/api/driverOfficeTripAPI';
import { officeNotes } from '../../../mobile-app/src/lib/tripPackageLines';

type FuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Electric';
type FuelPay = 'card' | 'upi' | 'customer_advance' | 'company_paid';
type ExtraCategory = 'extra_hours' | 'extra_km' | 'tolls' | 'other';

const FUEL_TYPES: FuelType[] = ['Diesel', 'Petrol', 'CNG', 'Electric'];
const FUEL_PAYMENTS: { value: FuelPay; label: string }[] = [
  { value: 'company_paid', label: 'Company paid' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'customer_advance', label: 'Customer advance' },
];
const EXTRA_OPTIONS: { value: ExtraCategory; label: string }[] = [
  { value: 'extra_hours', label: 'Extra hours' },
  { value: 'extra_km', label: 'Extra km' },
  { value: 'tolls', label: 'Tolls' },
  { value: 'other', label: 'Other' },
];

function money(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function plateKey(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

interface Props {
  trip: DriverDashboardTrip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function DriverOfficeTripSheet({ trip, open, onOpenChange, onChanged }: Props) {
  const [duty, setDuty] = useState<OfficeDutyView | null>(null);
  const [dutyError, setDutyError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'view' | 'start' | 'end' | 'fuel'>('view');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<DriverDashboardTrip['status']>('assigned');
  const [openingKm, setOpeningKm] = useState('');
  const [closingKm, setClosingKm] = useState('');
  const [paymentTo, setPaymentTo] = useState<'company_paid' | 'self_paid' | ''>('');
  const [collectedText, setCollectedText] = useState('');
  const [extraText, setExtraText] = useState('');
  const [extraCategory, setExtraCategory] = useState<ExtraCategory | ''>('');
  const [vehicles, setVehicles] = useState<OfficeFleetVehicle[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('Diesel');
  const [litres, setLitres] = useState('');
  const [fuelAmount, setFuelAmount] = useState('');
  const [fuelOdo, setFuelOdo] = useState('');
  const [fuelPay, setFuelPay] = useState<FuelPay>('company_paid');
  const [cardLastFour, setCardLastFour] = useState('');
  const [station, setStation] = useState('');

  useEffect(() => {
    if (!open || !trip) return;
    setPhase('view');
    setNotice(null);
    setError(null);
    setDuty(null);
    setDutyError(null);
    setLocalStatus(trip.status);
    setOpeningKm(trip.startingOdometer > 0 ? String(Math.round(trip.startingOdometer)) : '');
    setClosingKm(trip.endingOdometer > 0 ? String(Math.round(trip.endingOdometer)) : '');
    const balance = Math.max(0, trip.tripAmount - (trip.advancePaidAmount ?? 0));
    setCollectedText(balance > 0 ? String(Math.round(balance)) : '');
    setPaymentTo('');
    setExtraText('');
    setExtraCategory('');
    setLitres('');
    setFuelAmount('');
    setFuelOdo('');
    setCardLastFour('');
    setStation('');
    setFuelPay('company_paid');
    setFuelType('Diesel');
    let cancelled = false;
    void driverOfficeTripAPI.getDuty(trip.tripId).then((next) => {
      if (!cancelled) setDuty(next);
    }).catch((err: unknown) => {
      if (!cancelled) setDutyError(err instanceof Error ? err.message : 'Could not load this trip');
    });
    void driverOfficeTripAPI.getVehicles().then((list) => {
      if (cancelled) return;
      setVehicles(list);
      const wanted = plateKey(trip.vehicleNumber || '');
      const match = wanted ? list.find((item) => plateKey(item.vehicleNumber) === wanted) : undefined;
      setVehicleId(match ? String(match.id) : '');
    }).catch(() => {
      if (!cancelled) setVehicles([]);
    });
    return () => {
      cancelled = true;
    };
  }, [open, trip]);

  if (!trip) {
    return null;
  }

  const collects = trip.driverCollectsPayment !== false;
  const notes = officeNotes({
    additionalRequirements: trip.additionalRequirements,
    tripTerms: trip.tripTerms,
  });
  const cancelled = trip.opsStatus === 'cancelled';
  const completed = localStatus === 'completed';
  const showStart = !cancelled && !completed && (duty
    ? duty.canStart || duty.needsReceipt
    : localStatus === 'assigned');
  const showEnd = !cancelled && !completed && (duty
    ? duty.canEnd
    : localStatus === 'in_progress');
  const noDriver = trip.driverId <= 0;

  const refreshDuty = async () => {
    const next = await driverOfficeTripAPI.getDuty(trip.tripId);
    setDuty(next);
    return next;
  };

  const startTrip = async () => {
    const km = Number(openingKm);
    if (!Number.isFinite(km) || km < 1) {
      setError('Enter the opening odometer.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (duty?.needsReceipt) {
        await driverOfficeTripAPI.confirmReceipt(trip.tripId);
      }
      await driverOfficeTripAPI.saveOdometer(trip.tripId, 'start', Math.round(km));
      try {
        await driverOfficeTripAPI.setStatus(trip.tripId, 'in_progress');
      } catch (startError) {
        const message = startError instanceof Error ? startError.message : '';
        if (!/confirm receipt/i.test(message)) throw startError;
        await driverOfficeTripAPI.confirmReceipt(trip.tripId);
        await driverOfficeTripAPI.setStatus(trip.tripId, 'in_progress');
      }
      setLocalStatus('in_progress');
      setPhase('view');
      setNotice('Trip started.');
      try {
        await refreshDuty();
      } catch {
        setDuty({ needsReceipt: false, canStart: false, canEnd: true, isLastOpenDay: duty?.isLastOpenDay !== false });
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start this trip');
    } finally {
      setBusy(false);
    }
  };

  const endTrip = async () => {
    const km = Number(closingKm);
    if (!Number.isFinite(km) || km < 1) {
      setError('Enter the closing odometer.');
      return;
    }
    const lastDay = duty?.isLastOpenDay !== false;
    const extra = Number(extraText);
    const extraAmount = Number.isFinite(extra) && extra > 0 ? Math.round(extra * 100) / 100 : 0;
    if (lastDay && collects) {
      if (paymentTo !== 'company_paid' && paymentTo !== 'self_paid') {
        setError('Choose company account or self before ending the trip.');
        return;
      }
      if (extraAmount > 0 && !extraCategory) {
        setError('Choose what the extra amount is for.');
        return;
      }
    }
    const collected = Number(collectedText);
    setBusy(true);
    setError(null);
    try {
      await driverOfficeTripAPI.saveOdometer(trip.tripId, 'end', Math.round(km));
      if (!lastDay) {
        const closed = await driverOfficeTripAPI.endDutyDay(trip.tripId);
        setLocalStatus(closed.tripCompleted ? 'completed' : 'assigned');
        setNotice(closed.tripCompleted ? 'Trip completed.' : 'This day is closed. The trip stays open for the next day.');
      } else if (!collects) {
        const result = await driverOfficeTripAPI.setStatus(trip.tripId, 'completed', {
          collectedAmount: 0,
          paymentType: 'agent_booking',
        });
        setLocalStatus(result.tripCompleted ? 'completed' : 'assigned');
        setNotice(result.tripCompleted ? 'Trip completed. Nothing was collected.' : 'This day is closed. The trip stays open for the next day.');
      } else {
        const result = await driverOfficeTripAPI.setStatus(trip.tripId, 'completed', {
          collectedAmount: Number.isFinite(collected) && collected >= 0 ? collected : 0,
          paymentType: paymentTo,
          extraCollectedAmount: extraAmount,
          extraCollectedCategory: extraAmount > 0 ? extraCategory : null,
        });
        setLocalStatus(result.tripCompleted ? 'completed' : 'assigned');
        setNotice(result.tripCompleted ? 'Trip completed.' : 'This day is closed. The trip stays open for the next day.');
      }
      setPhase('view');
      try {
        await refreshDuty();
      } catch {
        /* the trip status is already saved */
      }
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not end this trip');
    } finally {
      setBusy(false);
    }
  };

  const saveFuel = async () => {
    const quantity = Number(litres);
    const totalCost = Number(fuelAmount);
    const odometer = Number(fuelOdo);
    const selectedVehicle = Number(vehicleId);
    if (!selectedVehicle) {
      setError('Choose the vehicle.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(totalCost) || totalCost <= 0) {
      setError('Enter the litres and the amount paid.');
      return;
    }
    if (!Number.isFinite(odometer) || odometer < 1) {
      setError('Enter the odometer at the pump.');
      return;
    }
    if (fuelPay === 'card' && cardLastFour.replace(/\D/g, '').length !== 4) {
      setError('Enter the last 4 digits of the card.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await driverOfficeTripAPI.saveFuel({
        vehicleId: selectedVehicle,
        bookingId: trip.tripId,
        quantity,
        pricePerUnit: Math.round((totalCost / quantity) * 100) / 100,
        totalCost,
        odometer: Math.round(odometer),
        fuelType,
        paymentMethod: fuelPay,
        fuelStation: station.trim() || undefined,
        cardLastFour: fuelPay === 'card' ? cardLastFour.replace(/\D/g, '').slice(-4) : undefined,
      });
      setNotice('Fuel saved on this trip.');
      setPhase('view');
      setLitres('');
      setFuelAmount('');
      setFuelOdo('');
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save fuel');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        data-driver-office-trip=""
        className="flex h-dvh w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="space-y-1 border-b px-4 py-4 pr-12 text-left">
          <SheetTitle className="truncate text-base">{trip.tripCode}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {localStatus === 'in_progress' ? 'In progress' : localStatus === 'completed' ? 'Completed' : 'Assigned'}
            {duty?.needsReceipt ? ' · Confirm receipt first' : ''}
          </p>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Driver view. Start, end, and fuel are saved on this trip.
          </p>
          <div className="rounded-lg border p-3 text-sm">
            <div className="font-medium">{trip.pickupLocation || '—'}</div>
            <div className="mt-1 text-muted-foreground">{trip.dropLocation || '—'}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {trip.driverName || 'No driver'} · {trip.vehicleNumber || 'No vehicle'}
            </div>
            <div className="mt-1 text-xs">
              {collects ? money(trip.tripAmount) : 'Do not collect'}
              {(trip.advancePaidAmount ?? 0) > 0 ? ` · Advance ${money(trip.advancePaidAmount ?? 0)}` : ''}
            </div>
            {notes.length > 0 ? (
              <div className="mt-3 border-t pt-2">
                <div className="text-xs font-semibold">Notes</div>
                <ul className="mt-1 space-y-1 text-sm">
                  {notes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          {noDriver ? (
            <p className="text-sm text-amber-700">Assign a driver before starting, ending, or adding fuel.</p>
          ) : null}
          {dutyError ? <p className="text-sm text-amber-700">{dutyError}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {phase === 'start' ? (
            <div className="space-y-3">
              <Label htmlFor="opening-km">Opening odometer (km)</Label>
              <Input id="opening-km" inputMode="numeric" value={openingKm} onChange={(event) => setOpeningKm(event.target.value)} />
              <Button type="button" className="w-full" disabled={busy || noDriver} onClick={() => void startTrip()}>
                {busy ? 'Starting…' : 'Start trip'}
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => setPhase('view')}>
                Back
              </Button>
            </div>
          ) : null}

          {phase === 'end' ? (
            <div className="space-y-3">
              <Label htmlFor="closing-km">Closing odometer (km)</Label>
              <Input id="closing-km" inputMode="numeric" value={closingKm} onChange={(event) => setClosingKm(event.target.value)} />
              {duty?.isLastOpenDay !== false && collects ? (
                <>
                  <Label>Payment received</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant={paymentTo === 'company_paid' ? 'default' : 'outline'} onClick={() => setPaymentTo('company_paid')}>
                      Company A/C
                    </Button>
                    <Button type="button" variant={paymentTo === 'self_paid' ? 'default' : 'outline'} onClick={() => setPaymentTo('self_paid')}>
                      Self
                    </Button>
                  </div>
                  <Label htmlFor="collected">Collected (₹)</Label>
                  <Input id="collected" inputMode="decimal" value={collectedText} onChange={(event) => setCollectedText(event.target.value)} />
                  <Label htmlFor="extra">Extra amount (₹)</Label>
                  <Input id="extra" inputMode="decimal" value={extraText} onChange={(event) => setExtraText(event.target.value)} />
                  <Select value={extraCategory || undefined} onValueChange={(value) => setExtraCategory(value as ExtraCategory)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Extra is for…" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXTRA_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              ) : null}
              <Button type="button" className="w-full" disabled={busy || noDriver} onClick={() => void endTrip()}>
                {busy ? 'Saving…' : duty?.isLastOpenDay === false ? 'Close this day' : 'End trip'}
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => setPhase('view')}>
                Back
              </Button>
            </div>
          ) : null}

          {phase === 'fuel' ? (
            <div className="space-y-3">
              <Label>Vehicle</Label>
              <Select value={vehicleId || undefined} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={String(vehicle.id)}>
                      {vehicle.vehicleNumber || vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label>Fuel</Label>
              <Select value={fuelType} onValueChange={(value) => setFuelType(value as FuelType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor="fuel-litres">Litres</Label>
              <Input id="fuel-litres" inputMode="decimal" value={litres} onChange={(event) => setLitres(event.target.value)} />
              <Label htmlFor="fuel-amount">Amount paid (₹)</Label>
              <Input id="fuel-amount" inputMode="decimal" value={fuelAmount} onChange={(event) => setFuelAmount(event.target.value)} />
              <Label htmlFor="fuel-odo">Odometer (km)</Label>
              <Input id="fuel-odo" inputMode="numeric" value={fuelOdo} onChange={(event) => setFuelOdo(event.target.value)} />
              <Label>Paid by</Label>
              <Select value={fuelPay} onValueChange={(value) => setFuelPay(value as FuelPay)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_PAYMENTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fuelPay === 'card' ? (
                <>
                  <Label htmlFor="card-last">Card last 4 digits</Label>
                  <Input id="card-last" inputMode="numeric" maxLength={4} value={cardLastFour} onChange={(event) => setCardLastFour(event.target.value)} />
                </>
              ) : null}
              <Label htmlFor="station">Pump name</Label>
              <Input id="station" value={station} onChange={(event) => setStation(event.target.value)} />
              <Button type="button" className="w-full" disabled={busy || noDriver} onClick={() => void saveFuel()}>
                {busy ? 'Saving…' : 'Save fuel'}
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => setPhase('view')}>
                Back
              </Button>
            </div>
          ) : null}

          {phase === 'view' ? (
            <div className="space-y-2">
              {showStart ? (
                <Button type="button" className="w-full" disabled={busy || noDriver} onClick={() => { setError(null); setPhase('start'); }}>
                  {duty?.needsReceipt ? 'Confirm and start' : 'Start trip'}
                </Button>
              ) : null}
              {showEnd ? (
                <Button type="button" className="w-full" disabled={busy || noDriver} onClick={() => { setError(null); setPhase('end'); }}>
                  End trip
                </Button>
              ) : null}
              {!cancelled ? (
                <Button type="button" variant="outline" className="w-full" disabled={busy || noDriver} onClick={() => { setError(null); setPhase('fuel'); }}>
                  Add fuel
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
