/**
 * Kilometres and drive time for Visakhapatnam outstation pages.
 * Values come from the stored route list, the same figures the route pages use.
 * A range such as "3-4 Hours" becomes the midpoint, then the nearest half hour.
 */
import { popularRoutes } from '../lib/routeData';
import { slugify } from '../lib/slugify';

export type OutstationDistance = {
  place: string;
  km: number;
  hoursLabel: string;
};

export type OutstationDistanceCopy = {
  place: string;
  title: string;
  h1: string;
  lead: string;
  description: string;
  km: number | null;
  hoursLabel: string | null;
};

function roundToHalfHour(hours: number): number {
  return Math.round(hours * 2) / 2;
}

export function formatDriveHours(hours: number): string {
  const rounded = roundToHalfHour(hours);
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${label} hrs`;
}

export function parseStoredKm(distance: string): number | null {
  const match = distance.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const km = Math.round(Number(match[1]));
  return km > 0 ? km : null;
}

export function parseStoredHours(time: string): number | null {
  const range = time.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (range) {
    const midpoint = (Number(range[1]) + Number(range[2])) / 2;
    return roundToHalfHour(midpoint);
  }
  const single = time.match(/(\d+(?:\.\d+)?)/);
  if (!single) return null;
  return roundToHalfHour(Number(single[1]));
}

export function lookupVizagOutstation(placeSlug: string): OutstationDistance | null {
  const route = popularRoutes.find(
    (item) => slugify(item.from) === 'visakhapatnam' && slugify(item.to) === placeSlug,
  );
  if (!route) return null;
  const km = parseStoredKm(route.distance);
  const hours = parseStoredHours(route.time);
  if (km == null || hours == null) return null;
  return {
    place: route.to,
    km,
    hoursLabel: formatDriveHours(hours),
  };
}

export function vizagOutstationPaths(): string[] {
  return popularRoutes
    .filter((item) => slugify(item.from) === 'visakhapatnam')
    .map((item) => `/outstation-taxi/visakhapatnam-to-${slugify(item.to)}`);
}

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function outstationDistanceCopy(placeSlug: string): OutstationDistanceCopy {
  const stats = lookupVizagOutstation(placeSlug);
  const place = stats?.place ?? titleCaseSlug(placeSlug);
  if (!stats) {
    return {
      place,
      title: `Vizag to ${place} Distance by Road & Cab Fare | Vizag Taxi Hub`,
      h1: `Visakhapatnam to ${place} Distance by Road`,
      lead: `Check the road distance and cab fare from Visakhapatnam to ${place} with Vizag Taxi Hub.`,
      description: `Road distance and cab fare from Visakhapatnam to ${place}. One way and round trip with Vizag Taxi Hub. Check your fare and book online.`,
      km: null,
      hoursLabel: null,
    };
  }

  return {
    place,
    title: `Vizag to ${place} Distance: ${stats.km} km, ${stats.hoursLabel} by Road | Cab`,
    h1: `Visakhapatnam to ${place} Distance – ${stats.km} km by Road`,
    lead: `The road distance from Visakhapatnam to ${place} is ${stats.km} km, about ${stats.hoursLabel} by car.`,
    description: `Visakhapatnam to ${place} is ${stats.km} km by road, about ${stats.hoursLabel} by car. Book a cab with Vizag Taxi Hub.`,
    km: stats.km,
    hoursLabel: stats.hoursLabel,
  };
}
