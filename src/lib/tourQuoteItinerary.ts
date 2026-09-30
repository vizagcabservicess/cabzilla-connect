import type { TourCartQuotationItineraryDay } from '@/components/pdf/TourCartQuotationPDF';

export function normalizeQuoteItinerary(raw: unknown): TourCartQuotationItineraryDay[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const day = item as Record<string, unknown>;
      const activities = Array.isArray(day.activities)
        ? day.activities.map((activity) => String(activity).trim()).filter(Boolean)
        : [];
      const title = String(day.title ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const description = String(day.description ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!title && !description && activities.length === 0) return null;
      return {
        day: Number(day.day) || index + 1,
        title,
        description,
        activities,
      };
    })
    .filter((day): day is TourCartQuotationItineraryDay => day !== null);
}

function isHaltLine(line: string): boolean {
  return /night halt|overnight stay|halt at/i.test(line);
}

function placesFromItineraryDay(
  day: TourCartQuotationItineraryDay | undefined,
  fallbackTitle = ''
): string[] {
  const activities = (day?.activities || []).map((line) => line.trim()).filter((line) => line && !isHaltLine(line));
  if (activities.length > 0) return activities;
  const description = String(day?.description || '').trim();
  if (description && description.length <= 80 && !/beaches|viewpoints?|museums|in one day/i.test(description)) {
    return [description];
  }
  const title = String(day?.title || fallbackTitle).trim();
  return title ? [title] : [];
}

export function flattenTourItineraryPlaces(
  tours: Array<{
    tourName: string;
    days?: number;
    description?: string;
    itinerary?: TourCartQuotationItineraryDay[];
  }>
): string[][] {
  const days: string[][] = [];
  for (const tour of tours) {
    const items =
      tour.itinerary && tour.itinerary.length > 0
        ? tour.itinerary
        : [
            {
              day: 1,
              title: tour.tourName,
              description: '',
              activities: tour.description ? [tour.description] : [],
            },
          ];
    const count = Number(tour.days) > 0 ? Number(tour.days) : Math.max(1, items.length);
    for (let index = 0; index < count; index += 1) {
      days.push(placesFromItineraryDay(items[index], index === 0 ? tour.tourName : ''));
    }
  }
  return days;
}

export function moveListItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function padPlacesByDay(
  current: string[][],
  dayCount: number,
  seed: string[][]
): string[][] {
  return Array.from({ length: Math.max(1, dayCount) }, (_, index) => {
    const existing = current[index];
    const hasEntered = Boolean(existing?.some((place) => place.trim()));
    if (hasEntered) return existing.length > 0 ? existing : [''];
    const seeded = (seed[index] || []).map((place) => place.trim()).filter(Boolean);
    if (seeded.length > 0) return seeded;
    return existing?.length ? existing : [''];
  });
}
