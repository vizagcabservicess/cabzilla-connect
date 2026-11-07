export type VehicleAvailability = {
  isActive?: boolean;
  inactiveDates?: Array<{ from?: Date | string; to?: Date | string }>;
};

export type FleetUnitStatus = {
  name?: string;
  model?: string;
  vehicleType?: string;
  cabTypeId?: string;
  status?: string;
  isActive?: boolean;
};

/** Same grouping the booking list uses: Urbania, bus, and the Urbania name are one type. */
export function catalogVehicleKey(id?: string, name?: string): string {
  const rawId = String(id ?? '').toLowerCase().replace(/[\s-]+/g, '_');
  const rawName = String(name ?? '').toLowerCase();
  if (rawName.includes('aura') || rawName.includes('amaze') || rawId === 'amaze' || rawId === 'hyundai_aura') return 'amaze';
  if (rawName.includes('urbania') || rawId === 'bus' || rawId === 'urbania') return 'urbania';
  if (rawName.includes('hycross') || rawId === 'mpv' || rawId === 'innova_hycross') return 'mpv';
  if (rawName.includes('glanza') || rawId === 'toyota_glanza' || rawId === 'glanza') return 'toyota_glanza';
  if (rawName.includes('ertiga') || rawId === 'ertiga') return 'ertiga';
  if ((rawName.includes('innova') || rawName.includes('crysta') || rawId === 'innova_crysta') && !rawName.includes('hycross')) return 'innova_crysta';
  if (rawName.includes('tempo') || rawName.includes('traveller') || rawId === 'tempo_traveller' || rawId === 'tempo') return 'tempo_traveller';
  if (rawName.includes('swift') || rawName.includes('dzire') || rawId === 'swift_dzire') return 'sedan';
  if (rawId === 'minivan') return 'ertiga';
  if (rawId === 'suv') return 'innova_crysta';
  if (rawId === 'sedan' || rawId === 'hatchback') return 'sedan';
  if (rawId === 'toyota') return 'toyota_glanza';
  return rawId || rawName.replace(/\s+/g, '_');
}

/**
 * Hide a booking option when the fleet has that type and none of those vehicles are Active.
 * A type with no fleet rows stays available.
 */
export function hideInactiveFleetTypes<T extends { id?: string; name?: string }>(
  vehicles: T[],
  units: FleetUnitStatus[]
): T[] {
  if (units.length === 0) return vehicles;
  const known = new Set<string>();
  const active = new Set<string>();
  for (const unit of units) {
    const label = [unit.name, unit.model].filter(Boolean).join(' ');
    const key = catalogVehicleKey(unit.cabTypeId || unit.vehicleType, label);
    if (!key) continue;
    known.add(key);
    const status = String(unit.status ?? 'Active').toLowerCase();
    if (status === 'active' && unit.isActive !== false) active.add(key);
  }
  return vehicles.filter((vehicle) => {
    const key = catalogVehicleKey(vehicle.id, vehicle.name);
    if (!known.has(key)) return true;
    return active.has(key);
  });
}

function isUsableDate(date: Date | undefined | null): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function parseRangeDate(value: Date | string | undefined): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isVehicleAvailableOnDate(vehicle: VehicleAvailability, date: Date): boolean {
  if (!isUsableDate(date)) return vehicle.isActive !== false;
  if (vehicle.isActive === false) return false;

  const checkDate = startOfDay(date);
  for (const inactivePeriod of vehicle.inactiveDates ?? []) {
    const fromDate = parseRangeDate(inactivePeriod.from);
    const toDate = parseRangeDate(inactivePeriod.to);
    if (!fromDate || !toDate) continue;
    if (checkDate >= startOfDay(fromDate) && checkDate <= endOfDay(toDate)) return false;
  }
  return true;
}

export function filterAvailableVehicles<T extends VehicleAvailability>(
  vehicles: T[],
  date?: Date | null,
  endDate?: Date | null
): T[] {
  if (!isUsableDate(date)) {
    return vehicles.filter((vehicle) => vehicle.isActive !== false);
  }
  const end = isUsableDate(endDate) ? endDate : date;
  return vehicles.filter((vehicle) => {
    const current = startOfDay(date);
    const last = startOfDay(end);
    while (current <= last) {
      if (!isVehicleAvailableOnDate(vehicle, current)) return false;
      current.setDate(current.getDate() + 1);
    }
    return true;
  });
}
