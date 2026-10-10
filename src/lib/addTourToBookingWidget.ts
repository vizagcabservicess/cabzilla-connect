import { toast } from 'sonner';
import type { Location } from '@/lib/locationData';
import { startingTourPrice } from '@/lib/tourVehiclePrice';
import { generateTourUrl, getTourIdVariantsForSlug } from '@/utils/tourUrlUtils';

export const VTH_ADD_TOUR_TO_WIDGET_EVENT = 'vth-add-tour-to-widget';
export const VTH_TOUR_CART_CHANGED_EVENT = 'vth-tour-cart-changed';
export const VTH_TOUR_LIST_PANEL_OPEN_EVENT = 'vth-tour-list-panel-open';
export const VTH_TOUR_CART_PROCEED_EVENT = 'vth-tour-cart-proceed';
export const TOUR_CART_STORAGE_KEY = 'tourCart';

export type TourWidgetAddPayload = {
  tourId: string;
  tourName: string;
  imageUrl?: string;
  minPrice?: number;
  days?: number;
  timeDuration?: string;
};

export type TourWidgetAddSource = {
  tourId?: string;
  id?: string;
  tourName?: string;
  name?: string;
  image?: string;
  imageUrl?: string;
  days?: number;
  timeDuration?: string;
  minPrice?: number;
  pricing?: Record<string, number>;
};

export type TourCartChangedDetail = {
  items: TourWidgetAddPayload[];
};

export function normalizeTourForWidget(tour: TourWidgetAddSource | null | undefined): TourWidgetAddPayload | null {
  if (!tour) return null;
  const rawId = String(tour.tourId || tour.id || '').trim();
  const tourName = String(tour.tourName || tour.name || '').trim();
  if (!rawId || !tourName) return null;
  const tourId = rawId;
  const imageUrl = String(tour.imageUrl || tour.image || '').trim();
  const timeDuration = String(tour.timeDuration || '').trim();
  const days = Number(tour.days);
  const minPrice = startingTourPrice(tour.pricing) || Number(tour.minPrice) || 0;
  return {
    tourId,
    tourName,
    ...(imageUrl ? { imageUrl } : {}),
    ...(timeDuration ? { timeDuration } : {}),
    ...(Number.isFinite(days) && days > 0 ? { days } : {}),
    ...(minPrice > 0 ? { minPrice } : {}),
  };
}

export function openTourListPanel(): void {
  window.dispatchEvent(new CustomEvent(VTH_TOUR_LIST_PANEL_OPEN_EVENT));
}

function mergeTourPayload(
  current: TourWidgetAddPayload,
  next: TourWidgetAddPayload
): TourWidgetAddPayload {
  return {
    ...current,
    tourName: next.tourName || current.tourName,
    imageUrl: next.imageUrl || current.imageUrl,
    timeDuration: next.timeDuration || current.timeDuration,
    days: next.days || current.days,
    minPrice: next.minPrice || current.minPrice,
  };
}

export function tourWidgetDropLocation(payload: TourWidgetAddPayload): Location {
  return {
    id: `tour_${payload.tourId}`,
    name: payload.tourName,
    city: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    lat: 17.7215,
    lng: 83.2248,
    type: 'other',
    popularityScore: 50,
    address: payload.tourName,
    isInVizag: true,
  };
}

function dispatchTourCartChanged(items: TourWidgetAddPayload[]): void {
  window.dispatchEvent(
    new CustomEvent<TourCartChangedDetail>(VTH_TOUR_CART_CHANGED_EVENT, { detail: { items } })
  );
}

function parseTourCartJson(raw: string | null): TourWidgetAddPayload[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const items: TourWidgetAddPayload[] = [];
    for (const entry of parsed) {
      const item = normalizeTourForWidget(entry as TourWidgetAddSource);
      if (!item || seen.has(item.tourId)) continue;
      seen.add(item.tourId);
      items.push(item);
    }
    return items;
  } catch {
    return [];
  }
}

function storageGet(storage: Storage): string | null {
  try {
    return storage.getItem(TOUR_CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, value: string): void {
  try {
    storage.setItem(TOUR_CART_STORAGE_KEY, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function storageRemove(storage: Storage): void {
  try {
    storage.removeItem(TOUR_CART_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readTourCart(): TourWidgetAddPayload[] {
  const localRaw = storageGet(localStorage);
  if (localRaw !== null) {
    return parseTourCartJson(localRaw);
  }
  const fromSession = parseTourCartJson(storageGet(sessionStorage));
  if (fromSession.length > 0) {
    storageSet(localStorage, JSON.stringify(fromSession));
    return fromSession;
  }
  return [];
}

export function writeTourCart(items: TourWidgetAddPayload[]): TourWidgetAddPayload[] {
  const raw = JSON.stringify(items);
  storageSet(localStorage, raw);
  storageSet(sessionStorage, raw);
  dispatchTourCartChanged(items);
  return items;
}

export function clearTourCart(): void {
  writeTourCart([]);
  writeTourCartPreferredVehicle(null);
  clearTourCartTripExtras();
  try {
    const dropRaw = sessionStorage.getItem('dropLocation');
    if (dropRaw) {
      const drop = JSON.parse(dropRaw) as { id?: string };
      if (String(drop?.id || '').startsWith('tour_')) {
        sessionStorage.removeItem('dropLocation');
      }
    }
  } catch {
    /* ignore */
  }
  toast.message('Tour list cleared');
}

export function tourCartHas(tourId: string, items = readTourCart(), tourName?: string): boolean {
  const trimmed = tourId.trim();
  if (!trimmed && !tourName) return false;
  return Boolean(findCatalogTour(items, trimmed || String(tourName), tourName));
}

type TourDestinationRule = { id: string; label: string; pattern: RegExp };

const TOUR_DESTINATION_RULES: TourDestinationRule[] = [
  { id: 'araku', label: 'Araku Valley', pattern: /araku/i },
  { id: 'lambasingi', label: 'Lambasingi', pattern: /lambasingi/i },
  { id: 'vanajangi', label: 'Vanajangi', pattern: /vanajangi|vanjangi/i },
  { id: 'maredumilli', label: 'Maredumilli', pattern: /maredumilli/i },
  { id: 'srikakulam-temples', label: 'Arasavalli & Srikurmam', pattern: /srikurmam|arasavalli/i },
];

export function tourDestinationIds(tourName: string, tourId = ''): string[] {
  const blob = `${tourId} ${tourName}`;
  const ids = TOUR_DESTINATION_RULES.filter((rule) => rule.pattern.test(blob)).map((rule) => rule.id);
  if (/north\s*city|vizag[\s_-]*north/i.test(blob)) ids.push('vizag-north');
  if (/south\s*city|vizag[\s_-]*south/i.test(blob)) ids.push('vizag-south');
  const isVizagArakuStay =
    /3\s*d\s*[/&]?\s*2\s*n|3d-2n|3d_2n/i.test(blob) ||
    (/3\s*days?/i.test(blob) && /2\s*nights?/i.test(blob)) ||
    ((/3\s*days?/i.test(blob) || /3d/i.test(blob)) &&
      /araku/i.test(blob) &&
      /vizag|visakhapatnam/i.test(blob));
  if (isVizagArakuStay) {
    ids.push('araku', 'vizag-north', 'vizag-south');
  }
  return [...new Set(ids)];
}

export function findOverlappingCartTour(
  tourName: string,
  items = readTourCart(),
  tourId = ''
): { item: TourWidgetAddPayload; label: string } | null {
  const incoming = tourDestinationIds(tourName, tourId);
  if (incoming.length === 0) return null;
  for (const item of items) {
    const existing = tourDestinationIds(item.tourName, item.tourId);
    const hit = incoming.find((id) => existing.includes(id));
    if (!hit) continue;
    const label =
      hit === 'vizag-north'
        ? 'Vizag North City Tour'
        : hit === 'vizag-south'
          ? 'Vizag South City Tour'
          : TOUR_DESTINATION_RULES.find((rule) => rule.id === hit)?.label || hit;
    return { item, label };
  }
  return null;
}

export function isTourBlockedByCart(
  tourId: string,
  tourName: string,
  items = readTourCart()
): boolean {
  if (tourCartHas(tourId, items, tourName)) return true;
  return Boolean(findOverlappingCartTour(tourName, items, tourId));
}

/** Append a tour if it is not already listed. Returns the next cart and whether it was new. */
export function appendTourToCart(payload: TourWidgetAddPayload): {
  items: TourWidgetAddPayload[];
  added: boolean;
  overlap?: { item: TourWidgetAddPayload; label: string };
} {
  const current = readTourCart();
  if (tourCartHas(payload.tourId, current, payload.tourName)) {
    const items = writeTourCart(
      current.map((item) =>
        item.tourId === payload.tourId ? mergeTourPayload(item, payload) : item
      )
    );
    return { items, added: false };
  }
  const overlap = findOverlappingCartTour(payload.tourName, current, payload.tourId);
  if (overlap) {
    return { items: current, added: false, overlap };
  }
  const items = writeTourCart([...current, payload]);
  return { items, added: true };
}

export function moveTourInCart(fromIndex: number, toIndex: number): TourWidgetAddPayload[] {
  const current = readTourCart();
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return current;
  }
  const items = [...current];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);
  return writeTourCart(items);
}

export function removeTourFromCart(tourId: string, tourName?: string): TourWidgetAddPayload[] {
  const current = readTourCart();
  const match = findCatalogTour(current, tourId, tourName);
  if (!match) {
    return writeTourCart(current.filter((item) => item.tourId !== tourId));
  }
  return writeTourCart(current.filter((item) => item.tourId !== match.tourId));
}

export function writeTourToBookingSession(payload: TourWidgetAddPayload): Location {
  const loc = tourWidgetDropLocation(payload);
  try {
    sessionStorage.setItem('tripType', 'tour');
    sessionStorage.setItem('dropLocation', JSON.stringify(loc));
  } catch {
    /* ignore quota / private mode */
  }
  return loc;
}

export function seedTourCartFromDrop(_drop: Location | null | undefined): TourWidgetAddPayload[] {
  return readTourCart();
}

type NavigateFn = (to: string, options?: { state?: unknown }) => void;

/**
 * Adds a tour package to the homepage Tour booking widget cart.
 * Same drop shape as Hero `applyHeroTourPackageSelection`.
 */
export function addTourToBookingWidget(tour: TourWidgetAddSource): boolean {
  const payload = normalizeTourForWidget(tour);
  if (!payload) {
    toast.error('Could not add this tour. Please try another package.');
    return false;
  }

  const { items, added, overlap } = appendTourToCart(payload);
  window.dispatchEvent(new CustomEvent(VTH_ADD_TOUR_TO_WIDGET_EVENT, { detail: payload }));

  if (added) {
    toast.success(`${payload.tourName} added to your trip`, {
      description: items.length === 1 ? 'Open My trip to review or add more.' : `${items.length} tours in your trip`,
    });
  } else if (overlap) {
    toast.message(`${overlap.label} is already in your trip`, {
      description: overlap.item.tourName.trim(),
    });
    return false;
  } else {
    toast.message(`${payload.tourName} is already in your trip`);
  }
  return true;
}

function readStoredTourPickup(): Location | null {
  const place = readTourCartTripExtras()?.tripPlan?.pickupPlace;
  if (place?.id) return place;
  try {
    const raw = sessionStorage.getItem('pickupLocation');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Location;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredTourPickupDate(): Date | null {
  const plan = readTourCartTripExtras()?.tripPlan;
  if (plan?.pickupDate && /^\d{4}-\d{2}-\d{2}$/.test(plan.pickupDate)) {
    const [year, month, day] = plan.pickupDate.split('-').map(Number);
    const match = /^(\d{1,2}):(\d{2})$/.exec(plan.pickupTime || '');
    const date = new Date(
      year,
      month - 1,
      day,
      match ? Number(match[1]) : 0,
      match ? Number(match[2]) : 0,
      0,
      0
    );
    if (!Number.isNaN(date.getTime())) return date;
  }
  try {
    const raw = sessionStorage.getItem('pickupDate');
    if (!raw) return null;
    const date = new Date(JSON.parse(raw) as string);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/** Stay on /tours and collect pickup location + date/time for the cart. */
export function proceedTourCartToBooking(options?: {
  navigate?: NavigateFn;
  preferredVehicle?: TourCartPreferredVehicle | null;
}): boolean {
  const items = readTourCart();
  if (items.length === 0) {
    toast.error('Add at least one tour to continue');
    return false;
  }
  const payload = items[0];
  writeTourToBookingSession(payload);
  if (options?.preferredVehicle?.id) {
    writeTourCartPreferredVehicle(options.preferredVehicle);
  }
  const preferredVehicle = readTourCartPreferredVehicle();
  const cartTourIds = items.map((item) => item.tourId);
  const onTours =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/tours');
  if (options?.navigate) {
    const pickupLocation = readStoredTourPickup();
    const pickupDate = readStoredTourPickupDate();
    options.navigate('/tours', {
      replace: onTours,
      state: {
        cartTourIds,
        proceedCheckout: true,
        proceedAt: Date.now(),
        preferredVehicleId: preferredVehicle?.id,
        preferredVehicleName: preferredVehicle?.name,
        ...(pickupLocation ? { pickupLocation } : {}),
        ...(pickupDate ? { pickupDate } : {}),
      },
    });
    return true;
  }
  window.dispatchEvent(new CustomEvent(VTH_TOUR_CART_PROCEED_EVENT, { detail: payload }));
  return true;
}

/** Removes a tour from the homepage Tour widget cart. Click the blue check to unselect. */
export function unselectTourFromBookingWidget(tour: TourWidgetAddSource): boolean {
  const payload = normalizeTourForWidget(tour);
  if (!payload) return false;
  if (!tourCartHas(payload.tourId, undefined, payload.tourName)) return false;
  const items = removeTourFromCart(payload.tourId, payload.tourName);
  const suffix = items.length > 0 ? ` · ${items.length} remaining` : '';
  toast.message(`${payload.tourName} unselected${suffix}`);
  return true;
}

function tourLookupKeys(tourId: string, tourName?: string): string[] {
  const raw = tourId.trim();
  const name = (tourName || '').trim();
  const keys = new Set<string>();
  if (raw) {
    keys.add(raw);
    keys.add(raw.replace(/-/g, '_'));
    keys.add(raw.replace(/_/g, '-'));
  }
  const slug = generateTourUrl({ tourId: raw, id: raw, tourName: name || raw });
  if (slug) {
    keys.add(slug);
    for (const variant of getTourIdVariantsForSlug(slug)) {
      if (variant) keys.add(variant);
    }
  }
  const canonical = normalizeTourForWidget({ tourId: raw || name, tourName: name || raw });
  if (canonical?.tourId) keys.add(canonical.tourId);
  if (name) keys.add(`name:${name.toLowerCase()}`);
  return [...keys];
}

export function findCatalogTour<T extends { tourId: string; tourName?: string; name?: string }>(
  tours: T[],
  tourId: string,
  tourName?: string
): T | undefined {
  const needle = new Set(tourLookupKeys(tourId, tourName).map((key) => key.toLowerCase()));
  if (needle.size === 0) return undefined;
  return tours.find((tour) => {
    const name = tour.tourName || tour.name;
    return tourLookupKeys(tour.tourId, name).some((key) => needle.has(key.toLowerCase()));
  });
}

export function filterToursByCartIds<T extends { tourId: string; tourName?: string }>(
  tours: T[],
  cartIds: string[],
  cartItems?: Array<{ tourId: string; tourName: string }>
): T[] {
  if (cartIds.length === 0) return tours;
  const toursByKey = new Map<string, T>();
  for (const tour of tours) {
    for (const key of tourLookupKeys(tour.tourId, tour.tourName)) {
      if (!toursByKey.has(key)) toursByKey.set(key, tour);
    }
  }
  const result: T[] = [];
  const seen = new Set<string>();
  cartIds.forEach((cartId, index) => {
    const trimmed = cartId.trim();
    if (!trimmed) return;
    const cartName =
      cartItems?.find((item) => tourLookupKeys(item.tourId, item.tourName).includes(trimmed))?.tourName ||
      cartItems?.[index]?.tourName;
    const keys = tourLookupKeys(trimmed, cartName);
    let match: T | undefined;
    for (const key of keys) {
      match = toursByKey.get(key);
      if (match) break;
    }
    if (!match || seen.has(match.tourId)) return;
    seen.add(match.tourId);
    result.push(match);
  });
  return result;
}

export const TOUR_CART_PREFERRED_VEHICLE_KEY = 'tourCartPreferredVehicle';

export type TourCartPreferredVehicle = {
  id: string;
  name?: string;
};

export function writeTourCartPreferredVehicle(
  vehicle: TourCartPreferredVehicle | null
): void {
  try {
    if (!vehicle?.id) {
      sessionStorage.removeItem(TOUR_CART_PREFERRED_VEHICLE_KEY);
      return;
    }
    sessionStorage.setItem(
      TOUR_CART_PREFERRED_VEHICLE_KEY,
      JSON.stringify({ id: vehicle.id, name: vehicle.name || '' })
    );
  } catch {
    /* ignore */
  }
}

export function readTourCartPreferredVehicle(): TourCartPreferredVehicle | null {
  try {
    const raw = sessionStorage.getItem(TOUR_CART_PREFERRED_VEHICLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TourCartPreferredVehicle;
    const id = String(parsed?.id || '').trim();
    if (!id) return null;
    const name = String(parsed?.name || '').trim();
    return name ? { id, name } : { id };
  } catch {
    return null;
  }
}

export function vehicleMatchesPreferred(
  vehicle: { id?: string; vehicleId?: string; name?: string },
  preferred: TourCartPreferredVehicle | null
): boolean {
  if (!preferred) return false;
  const needle = new Set(
    [preferred.id, preferred.name]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
  );
  if (needle.size === 0) return false;
  return [vehicle.id, vehicle.vehicleId, vehicle.name].some((value) =>
    needle.has(String(value || '').trim().toLowerCase())
  );
}

export const TOUR_CART_CHECKOUT_KEY = 'tourCartCheckout';

export type TourCartCheckoutLine = {
  tourId: string;
  tourName: string;
  dateIso: string;
  vehicleName: string | null;
  price: number;
  distance?: number;
};

export type TourCartCheckoutSnapshot = {
  pickupLocation: Location;
  cartTourIds: string[];
  activeTourId: string;
  lines: TourCartCheckoutLine[];
  datesByTourId: Record<string, string>;
  vehiclesByTourId: Record<string, unknown>;
  additionalAirportFare?: number;
  airportTransfers?: TourCartAirportTransfer[];
};

export const TOUR_CART_TRIP_EXTRAS_KEY = 'tourCartTripExtras';

export type TourCartAirportTransfer = {
  direction: 'from-airport' | 'to-airport';
  placeName: string;
  pickupDate: string;
  pickupTime: string;
  fare?: number;
  distanceKm?: number;
  place?: Location;
};

export type TourCartTripExtras = {
  tripPlan?: {
    pickupLocation: string;
    pickupDate: string;
    pickupTime: string;
    tourDuration: string;
    pickupPlace?: Location;
  };
  airportTransfers: TourCartAirportTransfer[];
  additionalAirportFare: number;
};

export function writeTourCartTripExtras(extras: TourCartTripExtras): void {
  try {
    sessionStorage.setItem(TOUR_CART_TRIP_EXTRAS_KEY, JSON.stringify(extras));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readTourCartTripExtras(): TourCartTripExtras | null {
  try {
    const raw = sessionStorage.getItem(TOUR_CART_TRIP_EXTRAS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TourCartTripExtras;
    if (!parsed || !Array.isArray(parsed.airportTransfers)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearTourCartTripExtras(): void {
  try {
    sessionStorage.removeItem(TOUR_CART_TRIP_EXTRAS_KEY);
  } catch {
    /* ignore */
  }
}

export function writeTourCartCheckout(snapshot: TourCartCheckoutSnapshot): void {
  try {
    sessionStorage.setItem(TOUR_CART_CHECKOUT_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readTourCartCheckout(): TourCartCheckoutSnapshot | null {
  try {
    const raw = sessionStorage.getItem(TOUR_CART_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TourCartCheckoutSnapshot;
    if (!parsed || !Array.isArray(parsed.cartTourIds) || !Array.isArray(parsed.lines)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearTourCartCheckout(): void {
  try {
    sessionStorage.removeItem(TOUR_CART_CHECKOUT_KEY);
  } catch {
    /* ignore */
  }
}
