import {
  normalizeTourForWidget,
  openTourListPanel,
  readTourCart,
  writeTourCart,
  type TourWidgetAddPayload,
} from '@/lib/addTourToBookingWidget';
import { generateTourUrl, getTourDisplayName } from '@/utils/tourUrlUtils';

export const BUILD_TRIP_QUERY = 'buildTrip';
export const BUILD_TRIP_TOURS_QUERY = 'tours';
export const BUILD_TRIP_NAMES_QUERY = 'names';
export const VTH_OPEN_LIVE_CHAT_EVENT = 'vth-open-live-chat';

const PUBLIC_SITE_ORIGIN = 'https://vizagtaxihub.com';

function publicSiteOrigin(): string {
  if (typeof window === 'undefined') return PUBLIC_SITE_ORIGIN;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return PUBLIC_SITE_ORIGIN;
  return window.location.origin;
}

function decodeShareValue(raw: string): string {
  let value = raw.trim();
  for (let i = 0; i < 3; i++) {
    try {
      const next = decodeURIComponent(value.replace(/\+/g, ' '));
      if (next === value) break;
      value = next;
    } catch {
      break;
    }
  }
  return value.trim();
}

export function parseSharedBuildTours(search: string | URLSearchParams): TourWidgetAddPayload[] {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const ids = String(params.get(BUILD_TRIP_TOURS_QUERY) || '')
    .split(',')
    .map((id) => decodeShareValue(id))
    .filter(Boolean);
  const names = String(params.get(BUILD_TRIP_NAMES_QUERY) || '')
    .split('|')
    .map((name) => decodeShareValue(name));
  const items: TourWidgetAddPayload[] = [];
  const seen = new Set<string>();
  ids.forEach((tourId, index) => {
    const tourName = names[index] || getTourDisplayName(tourId) || tourId;
    const item = normalizeTourForWidget({
      tourId,
      tourName,
    });
    if (!item || seen.has(item.tourId)) return;
    seen.add(item.tourId);
    items.push(item);
  });
  return items;
}

export function buildYourTripPath(items: TourWidgetAddPayload[] = readTourCart()): string {
  const params = new URLSearchParams();
  params.set(BUILD_TRIP_QUERY, '1');
  if (items.length > 0) {
    params.set(
      BUILD_TRIP_TOURS_QUERY,
      items.map((item) => generateTourUrl(item)).join(',')
    );
    params.set(BUILD_TRIP_NAMES_QUERY, items.map((item) => item.tourName).join('|'));
  }
  return `/?${params.toString()}`;
}

export function buildYourTripShareUrl(items: TourWidgetAddPayload[] = readTourCart()): string {
  return `${publicSiteOrigin()}${buildYourTripPath(items)}`;
}

export function isBuildTripDeepLink(search: string | URLSearchParams): boolean {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  return params.get(BUILD_TRIP_QUERY) === '1';
}

export function scrollToBuildYourTrip(): void {
  document.getElementById('home-destinations')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

export function applySharedBuildTrip(search: string | URLSearchParams): TourWidgetAddPayload[] {
  const items = parseSharedBuildTours(search);
  if (items.length > 0) writeTourCart(items);
  return items;
}

export function openLiveChatAssistant(): void {
  window.dispatchEvent(new CustomEvent(VTH_OPEN_LIVE_CHAT_EVENT));
}

export function shareBuildYourTripLink(items: TourWidgetAddPayload[] = readTourCart()): string {
  const url = buildYourTripShareUrl(items);
  const message = [
    items.length > 0
      ? `Your Vizag trip (${items.length} tour${items.length === 1 ? '' : 's'}):`
      : 'Plan your Vizag trip and add tours here:',
    ...items.map((item) => `• ${item.tourName}`),
    '',
    url,
  ].join('\n');
  void navigator.clipboard?.writeText(url).catch(() => undefined);
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  return url;
}
