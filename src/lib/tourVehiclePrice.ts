export type VehiclePriceRef = {
  id?: string;
  vehicleId?: string;
  vehicle_id?: string;
};

function vehicleLookupIds(vehicle: VehiclePriceRef): string[] {
  return [vehicle.vehicleId, vehicle.vehicle_id, vehicle.id]
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);
}

function positivePriceEntries(
  pricing: Record<string, number> | undefined
): Array<[string, number]> {
  if (!pricing) return [];
  return Object.entries(pricing)
    .map(([key, value]) => [key, Number(value)] as [string, number])
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0);
}

export function tourPriceForVehicle(
  pricing: Record<string, number> | undefined,
  vehicle: VehiclePriceRef
): number {
  if (!pricing) return 0;
  const ids = vehicleLookupIds(vehicle);
  if (ids.length === 0) return 0;
  for (const [key, value] of Object.entries(pricing)) {
    const amount = Number(value);
    if (ids.includes(key.toLowerCase()) && Number.isFinite(amount) && amount > 0) {
      return amount;
    }
  }
  return 0;
}

export function combinedTourPriceForVehicle(
  tours: Array<{ pricing?: Record<string, number> }>,
  vehicle: VehiclePriceRef
): number {
  return tours.reduce((sum, tour) => sum + tourPriceForVehicle(tour.pricing, vehicle), 0);
}

/**
 * Lowest bookable tour fare for "Starting from".
 * Prefer current fleet vehicle ids (same keys as Vehicle Pricing).
 * Ignore leftover generic `sedan` rates when named sedan-class cars have prices.
 */
export function startingTourPrice(
  pricing: Record<string, number> | undefined,
  vehicles?: VehiclePriceRef[]
): number {
  const entries = positivePriceEntries(pricing);
  if (entries.length === 0) return 0;

  if (vehicles && vehicles.length > 0) {
    const ids = new Set(vehicles.flatMap(vehicleLookupIds));
    const fleet = entries.filter(([key]) => ids.has(key.toLowerCase()));
    if (fleet.length > 0) {
      return Math.min(...fleet.map(([, amount]) => amount));
    }
  }

  const keys = entries.map(([key]) => key.toLowerCase());
  const isLegacySedanAlias = (key: string) =>
    /^(sedan|amaze|toyota|hatchback|swift)$/.test(key);
  const hasNamedSedan = keys.some(
    (key) => /dzire|aura|glanza|hyundai/.test(key) && !isLegacySedanAlias(key)
  );
  const withoutLegacySedan = hasNamedSedan
    ? entries.filter(([key]) => !isLegacySedanAlias(key.toLowerCase()))
    : entries;
  const pool = withoutLegacySedan.length > 0 ? withoutLegacySedan : entries;
  return Math.min(...pool.map(([, amount]) => amount));
}

export function fleetPricingSnapshot(
  pricing: Record<string, number> | undefined,
  vehicles: VehiclePriceRef[]
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const vehicle of vehicles) {
    const key = String(vehicle.vehicle_id || vehicle.vehicleId || vehicle.id || '').trim();
    if (!key) continue;
    const amount = tourPriceForVehicle(pricing, vehicle);
    if (amount > 0) next[key] = amount;
  }
  return next;
}
