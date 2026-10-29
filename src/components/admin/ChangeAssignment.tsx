import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { getApiUrl } from '@/config/api';
import type { Booking } from '@/types/api';

const REASONS = [
  { value: 'driver_unavailable', label: 'Driver unavailable' },
  { value: 'vehicle_breakdown', label: 'Vehicle breakdown' },
  { value: 'vehicle_replacement', label: 'Vehicle replacement' },
  { value: 'customer_request', label: 'Customer request' },
  { value: 'other', label: 'Other' },
];

interface DutySegment {
  status: string;
  driverName: string;
  vehicleNumber: string;
  vehicleModel: string;
  openingKm: number | null;
  closingKm: number | null;
}

interface DutyDay {
  id: number;
  dayIndex: number;
  dutyDate: string;
  status: string;
  segments: DutySegment[];
}

interface ChangeAssignmentProps {
  booking: Booking;
}

export function ChangeAssignment({ booking }: ChangeAssignmentProps) {
  const { toast } = useToast();
  const [days, setDays] = useState<DutyDay[]>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; phone?: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; vehicleNumber: string; model?: string }>>([]);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [reason, setReason] = useState('driver_unavailable');
  const [note, setNote] = useState('');
  const [closingKm, setClosingKm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedDay = days.find((day) => day.dutyDate === effectiveDate);
  const openSegment = selectedDay?.segments.find((segment) => segment.status !== 'completed');
  const needsClosingKm = openSegment?.status === 'in_progress';

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl(`/api/admin/duty-assignment.php?bookingId=${booking.id}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Could not load duty days');
      }
      const loaded = Array.isArray(result.days) ? result.days as DutyDay[] : [];
      setDays(loaded);
      const firstOpen = loaded.find((day) => day.status !== 'completed');
      setEffectiveDate(firstOpen?.dutyDate || loaded[0]?.dutyDate || '');
      const driverResponse = await fetch(getApiUrl('/api/admin/get-drivers.php'));
      const driverResult = await driverResponse.json();
      if (driverResult.status === 'success' && Array.isArray(driverResult.data)) {
        setDrivers(driverResult.data);
      }
      const fleetResponse = await fetch(getApiUrl('/api/admin/fleet_vehicles.php/vehicles'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const fleetResult = await fleetResponse.json();
      const fleetRows = Array.isArray(fleetResult.vehicles) ? fleetResult.vehicles : [];
      setVehicles(fleetRows.flatMap((vehicle: { id?: string | number; vehicleNumber?: string; vehicle_number?: string; model?: string; name?: string }) => {
        const id = String(vehicle.id ?? '').trim();
        const vehicleNumber = String(vehicle.vehicleNumber || vehicle.vehicle_number || '').trim();
        if (!/^\d+$/.test(id) || vehicleNumber === '') return [];
        const model = String(vehicle.model || vehicle.name || '').trim();
        return [{ id, vehicleNumber, model }];
      }));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Duty days',
        description: error instanceof Error ? error.message : 'Could not load this trip',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // booking.id is the only input that should reload the form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking.id]);

  const submit = async () => {
    if (!effectiveDate) {
      toast({ variant: 'destructive', title: 'Choose the day this change starts' });
      return;
    }
    if (!driverId && !vehicleId) {
      toast({ variant: 'destructive', title: 'Choose a new driver, a new vehicle, or both' });
      return;
    }
    if (needsClosingKm && !(Number(closingKm) > 0)) {
      toast({ variant: 'destructive', title: 'Enter the closing KM of the vehicle that is stopping' });
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(getApiUrl('/api/admin/duty-assignment.php'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bookingId: booking.id,
          effectiveDate,
          newDriverId: driverId ? Number(driverId) : 0,
          newVehicleId: vehicleId ? Number(vehicleId) : 0,
          reason,
          note,
          closingKm: needsClosingKm ? Number(closingKm) : null,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Could not change the assignment');
      }
      setDays(Array.isArray(result.days) ? result.days : []);
      setClosingKm('');
      toast({ title: 'Assignment updated', description: 'Completed days were left unchanged.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Assignment change',
        description: error instanceof Error ? error.message : 'Could not change the assignment',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-600 p-4">Loading duty days…</p>;
  }

  const tripCode = booking.bookingNumber || `Booking ${booking.id}`;

  return (
    <div className="min-w-0 space-y-4 p-2">
      <div>
        <h3 className="text-base font-semibold">Change Driver / Vehicle</h3>
        <p className="text-sm text-gray-600">Trip ID: {tripCode}. Completed days keep their original driver, vehicle, and kilometres.</p>
      </div>

      <div className="space-y-2">
        {days.map((day) => (
          <div key={day.id} className="rounded-md border p-3 text-sm">
            <div className="font-medium capitalize">Day {day.dayIndex} · {day.dutyDate} · {day.status.replace('_', ' ')}</div>
            {day.segments.map((segment, index) => (
              <div key={`${day.id}-${index}`} className="text-gray-600">
                {segment.driverName || 'No driver'} · {segment.vehicleNumber || 'No vehicle'}
                {segment.vehicleModel ? ` · ${segment.vehicleModel}` : ''}
                {segment.openingKm != null ? ` · Open ${segment.openingKm}` : ''}
                {segment.closingKm != null ? ` · Close ${segment.closingKm}` : ''}
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-3 md:grid-cols-2 [&>*]:min-w-0">
        <div>
          <Label>Effective from</Label>
          <select className="mt-1 w-full max-w-full rounded-md border px-3 py-2 text-sm" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)}>
            {days.filter((day) => day.status !== 'completed').map((day) => (
              <option key={day.id} value={day.dutyDate}>Day {day.dayIndex} — {day.dutyDate}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>Reason</Label>
          <select className="mt-1 w-full max-w-full rounded-md border px-3 py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value)}>
            {REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div>
          <Label>New driver</Label>
          <select className="mt-1 w-full max-w-full rounded-md border px-3 py-2 text-sm" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
            <option value="">Keep current driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>{driver.name}{driver.phone ? ` · ${driver.phone}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>New vehicle</Label>
          <select className="mt-1 w-full max-w-full rounded-md border px-3 py-2 text-sm" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
            <option value="">Keep current vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicleNumber}{vehicle.model ? ` · ${vehicle.model}` : ''}</option>
            ))}
          </select>
          {vehicles.length === 0 ? <p className="mt-1 text-xs text-gray-500">No fleet vehicles with a registration number were found.</p> : null}
        </div>
        {needsClosingKm ? (
          <div>
            <Label>Closing KM of the vehicle that is stopping</Label>
            <Input className="mt-1" value={closingKm} onChange={(event) => setClosingKm(event.target.value)} inputMode="numeric" placeholder="Do not reuse this on the next vehicle" />
          </div>
        ) : null}
        <div>
          <Label>Note</Label>
          <Input className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} />
        </div>
      </div>

      <Button type="button" onClick={() => { void submit(); }} disabled={saving}>
        {saving ? 'Saving…' : 'Confirm Assignment Change'}
      </Button>
    </div>
  );
}
