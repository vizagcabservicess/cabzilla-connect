import { useEffect, useState } from 'react';
import { formatDutyDuration, formatGps, formatReportingTime, formatServerDateTime, mapsUrl } from '@/lib/eventDuty';
import type { EventGps } from '@/types/eventDuty';

function shortGeocodeLabel(result: google.maps.GeocoderResult): string {
  const want = ['neighborhood', 'sublocality_level_1', 'sublocality', 'locality'];
  const parts: string[] = [];
  for (const component of result.address_components || []) {
    const name = component.long_name?.trim();
    if (!name) continue;
    if (component.types.some((type) => want.includes(type)) && !parts.includes(name)) {
      parts.push(name);
    }
  }
  if (parts.length) {
    return parts.slice(0, 3).join(', ');
  }
  return result.formatted_address.replace(/,?\s*India$/i, '').trim() || result.formatted_address;
}

export function GpsLink({ gps, label }: { gps?: EventGps | null; label?: string }) {
  const [place, setPlace] = useState(gps?.address?.trim() || '');
  useEffect(() => {
    setPlace(gps?.address?.trim() || '');
    if (!gps || gps.address?.trim()) {
      return;
    }
    const maps = window.google?.maps;
    if (!maps?.Geocoder) {
      return;
    }
    let cancelled = false;
    const geocoder = new maps.Geocoder();
    geocoder.geocode({ location: { lat: gps.lat, lng: gps.lng } }, (results, status) => {
      if (cancelled || status !== 'OK' || !results?.[0]) {
        return;
      }
      setPlace(shortGeocodeLabel(results[0]));
    });
    return () => {
      cancelled = true;
    };
  }, [gps]);

  const url = mapsUrl(gps);
  if (!url || !gps) {
    return <div className="text-muted-foreground">Location not captured</div>;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline break-words">
      {label || place || formatGps(gps)}
    </a>
  );
}

export function DutyStamp({
  label,
  at,
  gps,
}: {
  label: string;
  at?: string | null;
  gps?: EventGps | null;
}) {
  return (
    <div className="text-xs space-y-1 min-w-[10rem]">
      <div>
        <span className="text-muted-foreground">{label} </span>
        {at ? formatServerDateTime(at) : 'Not yet'}
      </div>
      {at ? <GpsLink gps={gps} /> : <div className="text-muted-foreground">—</div>}
    </div>
  );
}

export function DutyDuration({ start, end }: { start?: string | null; end?: string | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!start || end) {
      return;
    }
    const id = window.setInterval(() => setTick((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, [start, end]);
  const label = formatDutyDuration(start, end);
  return <div className="text-xs whitespace-nowrap">{label || '—'}</div>;
}

export function DutyReportDetails({
  scheduledTime,
  reportedAt,
  gps,
  closedAt,
  closingGps,
}: {
  scheduledTime?: string | null;
  reportedAt?: string | null;
  gps?: EventGps | null;
  closedAt?: string | null;
  closingGps?: EventGps | null;
}) {
  return (
    <div className="text-xs space-y-2 min-w-[11rem]">
      {scheduledTime ? (
        <div className="text-muted-foreground">Due {formatReportingTime(scheduledTime)}</div>
      ) : null}
      <DutyStamp label="Reported" at={reportedAt} gps={gps} />
      <DutyStamp label="Closed" at={closedAt} gps={closingGps} />
      <div>
        <span className="text-muted-foreground">Total time </span>
        <DutyDuration start={reportedAt} end={closedAt} />
      </div>
    </div>
  );
}
