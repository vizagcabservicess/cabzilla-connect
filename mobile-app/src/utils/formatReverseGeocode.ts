import type { LocationGeocodedAddress } from 'expo-location';

/**
 * Human-readable place line for fuel station / location display.
 */
export function formatPlaceFromGeocode(addr: LocationGeocodedAddress | undefined): string | undefined {
  if (!addr) return undefined;
  const parts = [addr.name, addr.street, addr.district, addr.city, addr.region, addr.subregion]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter((s) => s.length > 0);
  const uniq: string[] = [];
  for (const p of parts) {
    const prev = uniq[uniq.length - 1];
    if (!prev || prev.toLowerCase() !== p.toLowerCase()) uniq.push(p);
  }
  const line = uniq.slice(0, 5).join(', ');
  return line.length > 0 ? line.slice(0, 200) : undefined;
}
