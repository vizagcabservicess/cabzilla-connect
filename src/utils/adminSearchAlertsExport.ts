import type { SearchAlert } from '@/services/api/searchAlertsAPI';
import { bookingsToCsv } from '@/utils/adminBookingsExport';

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const r = minutes % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h} hr`;
  return `${h} hr ${r} min`;
}

function formatRoute(alert: SearchAlert): string {
  const parts: string[] = [];
  if (alert.distanceKmOneWay != null && alert.distanceKmOneWay > 0) {
    parts.push(`~${Math.round(alert.distanceKmOneWay)} km`);
  }
  const dur = formatDuration(alert.durationMinutesOneWay);
  if (dur !== '—') parts.push(dur);
  if (parts.length === 0) return '—';
  const line = parts.join(' · ');
  if (alert.tripMode === 'round-trip' && alert.distanceKmOneWay != null) {
    return `${line} (RT ~${Math.round(alert.distanceKmOneWay * 2)} km)`;
  }
  return line;
}

function formatResults(alert: SearchAlert): string {
  if (alert.vehicleFares?.length) {
    return alert.vehicleFares.map((v) => `${v.name}: ${v.fareText}`).join('; ');
  }
  return alert.resultsShown || '—';
}

export function formatSearchAlertDateTime(value: string): string {
  if (!value) return '—';
  try {
    return new Date(value.replace(' ', 'T')).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return value;
  }
}

export function buildSearchAlertExportRows(alerts: SearchAlert[]): Record<string, string>[] {
  return alerts.map((a) => ({
    'Searched At': formatSearchAlertDateTime(a.searchedAt),
    'Guest Phone': a.guestPhone,
    Pickup: a.pickup,
    Drop: a.drop,
    'Trip Type': a.tripType.replace(/\n/g, ' '),
    Departure: a.departure,
    Route: formatRoute(a),
    'Results / Fares': formatResults(a),
  }));
}

export function searchAlertsToCsv(alerts: SearchAlert[]): string {
  return bookingsToCsv(buildSearchAlertExportRows(alerts));
}

export function searchAlertsExportFileSuffix(from?: string, to?: string): string {
  const a = (from ?? '').trim();
  const b = (to ?? '').trim();
  if (a && b) return `${a}_to_${b}`;
  if (a) return `from_${a}`;
  if (b) return `to_${b}`;
  return new Date().toISOString().slice(0, 10);
}

export function searchAlertMatchesTerm(alert: SearchAlert, term: string): boolean {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    alert.guestPhone,
    alert.pickup,
    alert.drop,
    alert.tripType,
    alert.departure,
    alert.resultsShown,
    alert.whatsappMessage,
    formatSearchAlertDateTime(alert.searchedAt),
    ...(alert.vehicleFares ?? []).flatMap((v) => [v.name, v.fareText]),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
