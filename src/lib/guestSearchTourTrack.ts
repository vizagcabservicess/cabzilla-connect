import type { CabType } from '@/types/cab';
import type { Location } from '@/lib/locationData';
import {
  filterToursByCartIds,
  normalizeTourForWidget,
  readTourCart,
  type TourWidgetAddPayload,
} from '@/lib/addTourToBookingWidget';
import { buildTourCartFareLinesForGuestTrack, type VehicleFareLine } from '@/lib/guestSearchFareLines';
import { tourDetailAPI } from '@/services/api/tourDetailAPI';

export type TourGuestSearchTrack = {
  drop: string;
  distanceKm: number;
  vehicleFares: VehicleFareLine[] | null;
  tourCount: number;
};

function cartFromDrop(dropLocation: Location | null | undefined): TourWidgetAddPayload[] {
  const id = String(dropLocation?.id || '');
  const name = String(dropLocation?.name || '').trim();
  if (!id.startsWith('tour_') || !name) return [];
  const payload = normalizeTourForWidget({ tourId: id.slice('tour_'.length), tourName: name });
  return payload ? [payload] : [];
}

function uniqueCartItems(
  items: TourWidgetAddPayload[],
  dropLocation: Location | null | undefined
): TourWidgetAddPayload[] {
  const stored = items.length > 0 ? items : cartFromDrop(dropLocation);
  const seen = new Set<string>();
  const out: TourWidgetAddPayload[] = [];
  for (const item of stored) {
    if (seen.has(item.tourId)) continue;
    seen.add(item.tourId);
    out.push(item);
  }
  if (out.length > 0) return out;
  const dropName = dropLocation?.name?.trim();
  return dropName ? [{ tourId: dropLocation?.id || dropName, tourName: dropName }] : [];
}

/**
 * WhatsApp search alerts must list every selected tour and combined catalog fares,
 * not only the active widget drop (whose pin is in Vizag and yields ~8 km).
 */
export async function resolveTourGuestSearchTrack(
  dropLocation: Location | null | undefined,
  cabs: CabType[]
): Promise<TourGuestSearchTrack | null> {
  const cart = uniqueCartItems(readTourCart(), dropLocation);
  if (cart.length === 0) return null;

  let catalog: Awaited<ReturnType<typeof tourDetailAPI.getTours>> = [];
  try {
    catalog = await tourDetailAPI.getTours();
  } catch {
    catalog = [];
  }

  const matched = filterToursByCartIds(
    catalog,
    cart.map((item) => item.tourId),
    cart
  );

  const drop = cart.map((item) => item.tourName).join(' + ');
  const distanceKm = matched.reduce((sum, tour) => {
    const km = Number(tour.distance);
    return sum + (Number.isFinite(km) && km > 0 ? km : 0);
  }, 0);

  const vehicleFares =
    matched.length > 0 && cabs.length > 0
      ? buildTourCartFareLinesForGuestTrack(cabs, matched)
      : null;

  return {
    drop,
    distanceKm,
    vehicleFares,
    tourCount: cart.length,
  };
}
