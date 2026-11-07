/**
 * Vehicles API - same endpoints as web app
 */
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import { resolveVehicleImageUrl } from '../utils/mediaUrl';

const BASE =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? ''
    : (API_BASE_URL || 'https://www.vizagtaxihub.com');

export interface VehicleInactiveRange {
  from: string;
  to: string;
  reason?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  capacity: number;
  luggageCapacity?: number;
  fuelType?: string;
  amenities?: string[];
  price: number;
  pricePerKm?: number;
  image?: string;
  isActive?: boolean;
  inactiveDates?: VehicleInactiveRange[];
}

const FALLBACK_VEHICLES: Vehicle[] = [
  { id: 'sedan', name: 'Swift Dzire', capacity: 4, luggageCapacity: 3, fuelType: 'Petrol', amenities: ['AC', 'Music System', 'Charging Point'], price: 4200, pricePerKm: 14 },
  { id: 'ertiga', name: 'Ertiga', capacity: 6, luggageCapacity: 3, fuelType: 'CNG', amenities: ['AC', 'Music System', 'Charging Point'], price: 5400, pricePerKm: 18 },
  { id: 'glanza', name: 'Toyota Glanza', capacity: 4, luggageCapacity: 2, fuelType: 'Petrol', amenities: ['AC', 'Music System', 'Charging Point'], price: 4200, pricePerKm: 14 },
  { id: 'innova_crysta', name: 'Innova Crysta', capacity: 7, luggageCapacity: 4, fuelType: 'Diesel', amenities: ['AC', 'Music System', 'Charging Point', 'Extra Legroom'], price: 6000, pricePerKm: 20 },
  { id: 'tempo_traveller', name: 'Tempo Traveller', capacity: 17, luggageCapacity: 8, fuelType: 'Diesel', amenities: ['AC', 'Music System', 'Charging Point', 'Pushback Seats'], price: 10500, pricePerKm: 35 },
].map((vehicle) => ({ ...vehicle, image: resolveVehicleImageUrl(vehicle) }));

const endpoints = [
  `${BASE}/api/admin/direct-vehicle-modify.php?action=load`,
  `${BASE}/api/admin/vehicles-data.php`,
  `${BASE}/api/admin/direct-vehicle-pricing.php?action=load_vehicles`,
  `${BASE}/api/admin/get-vehicles.php`,
];

function withCacheBust(url: string): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_t=${Date.now()}`;
}

function readIsActive(vehicle: Record<string, unknown>): boolean {
  const value = vehicle.isActive !== undefined ? vehicle.isActive : vehicle.is_active;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return true;
}

function readInactiveDates(vehicle: Record<string, unknown>): VehicleInactiveRange[] {
  let raw: unknown = vehicle.inactiveDates ?? vehicle.inactive_dates;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const range = row as { from?: unknown; to?: unknown; reason?: unknown };
    const from = range.from instanceof Date ? range.from.toISOString() : String(range.from ?? '');
    const to = range.to instanceof Date ? range.to.toISOString() : String(range.to ?? '');
    if (!from || !to) return [];
    const reason = range.reason ? String(range.reason) : undefined;
    return [{ from, to, ...(reason ? { reason } : {}) }];
  });
}

export async function loadVehicles(): Promise<Vehicle[]> {
  for (const url of endpoints) {
    try {
      const res = await fetch(withCacheBust(url), {
        headers: { 'X-Force-Refresh': 'true', 'Cache-Control': 'no-cache' },
      });
      const text = await res.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html>')) continue;
      const data = JSON.parse(text);
      const arr = data.vehicles || data.data || data;
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((raw: Record<string, unknown>) => {
          const id = String(raw.id || raw.vehicleId || '').toLowerCase().replace(/-/g, '_');
          const name = typeof raw.name === 'string' ? raw.name : '';
          const fallback = FALLBACK_VEHICLES.find(f => f.name.toLowerCase().includes(name.toLowerCase()) || f.id === id);
          const image = resolveVehicleImageUrl({
            id: String(raw.id || raw.vehicleId || ''),
            vehicleId: raw.vehicleId == null ? undefined : String(raw.vehicleId),
            name: name || fallback?.name,
            image: (typeof raw.image === 'string' ? raw.image : undefined) || fallback?.image,
          });
          const pricePerKm = raw.pricePerKm ?? raw.price_per_km ?? fallback?.pricePerKm;
          return {
            id: String(raw.id || raw.vehicleId || ''),
            name: name || fallback?.name || 'Cab',
            capacity: Number(raw.capacity ?? fallback?.capacity ?? 4),
            luggageCapacity: Number(raw.luggageCapacity ?? fallback?.luggageCapacity ?? 2),
            fuelType: String(raw.fuelType ?? fallback?.fuelType ?? 'Petrol'),
            amenities: Array.isArray(raw.amenities)
              ? raw.amenities.map(String)
              : (fallback?.amenities ?? ['AC', 'Music System', 'Charging Point']),
            price: Number(raw.price || raw.basePrice || 0),
            pricePerKm: pricePerKm == null ? undefined : Number(pricePerKm),
            image,
            isActive: readIsActive(raw),
            inactiveDates: readInactiveDates(raw),
          };
        });
      }
    } catch {
      continue;
    }
  }
  return FALLBACK_VEHICLES;
}

export async function loadFleetUnits(): Promise<Array<{
  name?: string;
  model?: string;
  vehicleType?: string;
  cabTypeId?: string;
  status?: string;
  isActive?: boolean;
}>> {
  try {
    const res = await fetch(withCacheBust(`${BASE}/api/admin/fleet_vehicles.php/vehicles?includeInactive=true`), {
      headers: { 'Cache-Control': 'no-cache' },
    });
    const text = await res.text();
    if (text.includes('<!DOCTYPE') || text.includes('<html>')) return [];
    const data = JSON.parse(text) as { vehicles?: unknown; data?: unknown };
    const list = data.vehicles ?? data.data ?? [];
    if (!Array.isArray(list)) return [];
    return list.map((row: Record<string, unknown>) => ({
      name: row.name == null ? undefined : String(row.name),
      model: row.model == null ? undefined : String(row.model),
      vehicleType: row.vehicleType == null ? undefined : String(row.vehicleType),
      cabTypeId: row.cabTypeId == null ? undefined : String(row.cabTypeId),
      status: row.status == null ? undefined : String(row.status),
      isActive: row.isActive === false || row.isActive === 0 || row.is_active === 0 || row.is_active === false
        ? false
        : true,
    }));
  } catch {
    return [];
  }
}
