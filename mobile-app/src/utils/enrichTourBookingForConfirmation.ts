import { tourAPI, type TourDetail, type TourInfo } from '../services/tourAPI';

type Booking = Record<string, unknown>;

function isGenericTourName(name: string): boolean {
  const n = String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return n === '' || n === 'tour' || n === 'package' || n === 'tour package' || n === 'tour packages';
}

function isTourBooking(booking: Booking): boolean {
  const t = String(booking.tripType ?? booking.trip_type ?? '').toLowerCase();
  if (t === 'tour') return true;
  const tid = String(booking.tour_id ?? booking.tourId ?? '').trim();
  return Boolean(tid);
}

function contextBlob(booking: Booking): string {
  const inc = booking.inclusions;
  const incText = Array.isArray(inc) ? inc.join('\n') : String(inc ?? '');
  return [
    booking.adminNotes,
    booking.admin_notes,
    booking.special_notes,
    booking.additionalRequirements,
    booking.additional_requirements,
    booking.tour_name,
    booking.tourName,
    booking.dropLocation,
    incText,
  ]
    .map((x) => (x == null ? '' : String(x)))
    .join('\n')
    .toLowerCase();
}

function vehiclePrice(pricing: Record<string, number> | undefined, vehicleLabel: string): number | null {
  if (!pricing || typeof pricing !== 'object') return null;
  const vl = vehicleLabel.toLowerCase();
  const matchesKey = (key: string): boolean => {
    const k = key.toLowerCase();
    if (vl.includes('tempo') || vl.includes('traveller')) {
      return k.includes('tempo') || k.includes('traveller');
    }
    if (vl.includes('crysta') || vl.includes('innova')) {
      return k.includes('innova') || k.includes('crysta');
    }
    if (vl.includes('ertiga')) return k.includes('ertiga');
    if (
      vl.includes('swift') ||
      vl.includes('dzire') ||
      vl.includes('amaze') ||
      vl.includes('sedan') ||
      vl.includes('glanza')
    ) {
      return k.includes('sedan') || k.includes('amaze') || k.includes('toyota') || k.includes('glanza');
    }
    return false;
  };
  for (const [k, v] of Object.entries(pricing)) {
    if (!matchesKey(k)) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function pickTour(tours: TourInfo[], booking: Booking): TourInfo | null {
  if (!tours.length) return null;
  const blob = contextBlob(booking);
  if (blob.includes('araku') || blob.includes('borra') || blob.includes('padmapuram') || blob.includes('katiki')) {
    const araku = tours.find((t) => {
      const id = String(t.id || '').toLowerCase();
      const name = String(t.name || '').toLowerCase();
      return (id === 'araku' || name.includes('araku valley')) && !name.includes('3 day') && !name.includes('3d');
    });
    if (araku) return araku;
  }
  if (blob.includes('lambasingi')) {
    const hit = tours.find((t) => String(t.name || '').toLowerCase().includes('lambasingi'));
    if (hit) return hit;
  }

  const d = Math.round(Number(booking.distance) || 0);
  if (d <= 0) return null;
  const kmTol = 8;
  let candidates = tours.filter((t) => {
    const td = Math.round(Number(t.distance) || 0);
    if (td <= 0) return false;
    return Math.abs(td - d) <= kmTol || Math.abs(td * 2 - d) <= Math.max(kmTol, Math.round(d * 0.12));
  });
  if (candidates.length === 1) return candidates[0] ?? null;
  if (candidates.length === 0) return null;

  const fare = Number(booking.fare ?? booking.totalAmount ?? 0) || 0;
  const vehicleLabel = String(booking.vehicle_type ?? booking.cabType ?? '');
  if (fare > 0) {
    const tol = Math.max(100, fare * 0.06);
    const byPrice = candidates.filter((t) => {
      const p = vehiclePrice(t.pricing, vehicleLabel);
      return p != null && Math.abs(p - fare) <= tol;
    });
    if (byPrice.length === 1) return byPrice[0] ?? null;
    if (byPrice.length > 1) candidates = byPrice;
  }

  if (blob.includes('araku') || blob.includes('borra') || blob.includes('padmapuram')) {
    const araku = candidates.find((t) => String(t.name || '').toLowerCase().includes('araku valley'));
    if (araku) return araku;
  }
  return null;
}

function mergeDetail(booking: Booking, detail: TourDetail): Booking {
  const name = String(booking.tour_name ?? booking.tourName ?? '').trim();
  const out: Booking = { ...booking };
  if (!out.tour_id && detail.tourId) out.tour_id = detail.tourId;
  if (!out.tourId && detail.tourId) out.tourId = detail.tourId;
  if (!name || isGenericTourName(name)) {
    out.tour_name = detail.tourName;
    out.tourName = detail.tourName;
  }
  const existingItin = booking.tour_itinerary ?? booking.tourItinerary;
  const hasItin = Array.isArray(existingItin) && existingItin.length > 0;
  if (!hasItin && Array.isArray(detail.itinerary) && detail.itinerary.length > 0) {
    out.tour_itinerary = detail.itinerary;
    out.tourItinerary = detail.itinerary;
  }
  if (Array.isArray(detail.inclusions) && detail.inclusions.length) {
    out.tour_inclusions = detail.inclusions;
  }
  if (Array.isArray(detail.exclusions) && detail.exclusions.length) {
    out.tour_exclusions = detail.exclusions;
  }
  if (detail.days != null) {
    out.tourDays = detail.days;
    out.tour_days = detail.days;
  }
  if (detail.timeDuration) {
    out.tourDurationLabel = detail.timeDuration;
    out.tour_duration = detail.timeDuration;
  }
  return out;
}

export async function enrichTourBookingFromCatalog(booking: Booking): Promise<Booking> {
  if (!isTourBooking(booking)) return booking;
  const tid = String(booking.tour_id ?? booking.tourId ?? '').trim();
  const name = String(booking.tour_name ?? booking.tourName ?? '').trim();
  const existingItin = booking.tour_itinerary ?? booking.tourItinerary;
  const hasItin = Array.isArray(existingItin) && existingItin.length > 0;
  if (hasItin && tid && !isGenericTourName(name)) return booking;

  try {
    let detail: TourDetail | null = tid ? await tourAPI.getTourDetail(tid) : null;
    if (!detail) {
      const tours = await tourAPI.getAvailableTours();
      const picked = pickTour(tours, booking);
      if (picked?.id) detail = await tourAPI.getTourDetail(String(picked.id));
    }
    if (!detail) return booking;
    return mergeDetail(booking, detail);
  } catch {
    return booking;
  }
}
