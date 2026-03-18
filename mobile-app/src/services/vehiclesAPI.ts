/**
 * Vehicles API - same endpoints as web app
 */
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';

const BASE =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? ''
    : (API_BASE_URL || 'https://www.vizagtaxihub.com');

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
}

const ASSET_BASE = 'https://vizagtaxihub.com';
const FALLBACK_VEHICLES: Vehicle[] = [
  { id: 'sedan', name: 'Swift Dzire', capacity: 4, luggageCapacity: 3, fuelType: 'Petrol', amenities: ['AC', 'Music System', 'Charging Point'], price: 4200, pricePerKm: 14, image: `${ASSET_BASE}/cars/sedan.png` },
  { id: 'ertiga', name: 'Ertiga', capacity: 6, luggageCapacity: 3, fuelType: 'CNG', amenities: ['AC', 'Music System', 'Charging Point'], price: 5400, pricePerKm: 18, image: `${ASSET_BASE}/cars/ertiga.png` },
  { id: 'glanza', name: 'Toyota Glanza', capacity: 4, luggageCapacity: 2, fuelType: 'Petrol', amenities: ['AC', 'Music System', 'Charging Point'], price: 4200, pricePerKm: 14, image: `${ASSET_BASE}/uploads/toyota-glanza-vizagtaxihub.png` },
  { id: 'innova_crysta', name: 'Innova Crysta', capacity: 7, luggageCapacity: 4, fuelType: 'Diesel', amenities: ['AC', 'Music System', 'Charging Point', 'Extra Legroom'], price: 6000, pricePerKm: 20, image: `${ASSET_BASE}/uploads/img_68a32a68407e75.04067794.png` },
  { id: 'tempo_traveller', name: 'Tempo Traveller', capacity: 17, luggageCapacity: 8, fuelType: 'Diesel', amenities: ['AC', 'Music System', 'Charging Point', 'Pushback Seats'], price: 10500, pricePerKm: 35, image: `${ASSET_BASE}/cars/tempo.png` },
];

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

/** Resolve image URL - convert relative paths to absolute */
function resolveImageUrl(raw: string | undefined): string | undefined {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return undefined;
  const trimmed = raw.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = BASE || API_BASE_URL || 'https://www.vizagtaxihub.com';
  return `${base.replace(/\/$/, '')}${path}`;
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
        return arr.map((v: any) => {
          const id = String(v.id || v.vehicleId || '').toLowerCase().replace(/-/g, '_');
          const fallback = FALLBACK_VEHICLES.find(f => f.name.toLowerCase().includes((v.name || '').toLowerCase()) || f.id === id);
          const rawImage = v.image || fallback?.image;
          const image = resolveImageUrl(rawImage);
          return {
            id: v.id || v.vehicleId,
            name: v.name || fallback?.name || 'Cab',
            capacity: v.capacity ?? fallback?.capacity ?? 4,
            luggageCapacity: v.luggageCapacity ?? fallback?.luggageCapacity ?? 2,
            fuelType: v.fuelType ?? fallback?.fuelType ?? 'Petrol',
            amenities: v.amenities ?? fallback?.amenities ?? ['AC', 'Music System', 'Charging Point'],
            price: v.price || v.basePrice || 0,
            pricePerKm: v.pricePerKm ?? v.price_per_km ?? fallback?.pricePerKm,
            image,
          };
        });
      }
    } catch {
      continue;
    }
  }
  return FALLBACK_VEHICLES;
}
