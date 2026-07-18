/** Auto-generated labels stored in special_requests (never show as customer notes). */
const SYSTEM_META_LABELS =
  'Trip|Mode|Distance|Search results|Website fare|Source|Package|Return|Itinerary';

const SYSTEM_META_FRAGMENT_RE =
  /^(?:round\s*trip|one\s*way|\(?\s*~?\d+(?:\.\d+)?\s*km(?:\s+one\s+way)?\)?|\d+(?:\.\d+)?\s*km(?:\s+one\s+way)?\)?)$/i;

/** Keep only free-text the customer typed — strip search-alert / system meta. */
export function stripSmartBudgetSystemMeta(special: string | null | undefined): string {
  if (!special) return '';
  let text = special.trim();

  if (/Source:\s*Search alert/i.test(text)) {
    return '';
  }

  text = text.replace(/Distance\s*:\s*~?[\d.]+\s*km(?:\s*\([^)]*\))?/gi, '');
  text = text.replace(
    new RegExp(
      `(?:^|\\s·\\s)?(?:${SYSTEM_META_LABELS})\\s*:\\s*.*?(?=\\s*(?:${SYSTEM_META_LABELS})\\s*:|$)`,
      'gi'
    ),
    ''
  );

  return text
    .split(/\s*·\s*/)
    .map((p) => p.trim())
    .filter((part) => part.length > 0 && !SYSTEM_META_FRAGMENT_RE.test(part))
    .join(' · ')
    .replace(/^[·\s]+|[·\s]+$/g, '')
    .trim();
}

export type SmartBudgetTripDisplayMeta = {
  tripType: string | null;
  packageLabel: string | null;
  kilometers: string | null;
};

/** Parse trip type, local package hours, and km from special_requests / drop. */
export function parseSmartBudgetTripDisplayMeta(
  special: string | null | undefined,
  dropLocation?: string | null
): SmartBudgetTripDisplayMeta {
  const text = (special || '').trim();
  const drop = (dropLocation || '').trim();
  const blob = `${text} ${drop}`;

  let tripType: string | null = null;
  const tripMatch = text.match(
    /Trip\s*:\s*(.+?)(?=\s*·\s*(?:Mode|Distance|Search results|Website fare|Source|Package|Return|Itinerary)\s*:|$)/i
  );
  if (tripMatch?.[1]) {
    tripType = tripMatch[1].trim().replace(/\s*·\s*/g, ' · ');
  } else {
    const modeMatch = text.match(
      /Mode\s*:\s*(.+?)(?=\s*·\s*(?:Trip|Distance|Search results|Website fare|Source|Package|Return|Itinerary)\s*:|$)/i
    );
    if (modeMatch?.[1]) {
      const mode = modeMatch[1].trim().toLowerCase();
      if (mode.includes('round')) tripType = 'Round trip';
      else if (mode.includes('one')) tripType = 'One way';
      else tripType = modeMatch[1].trim();
    }
  }

  let packageLabel: string | null = null;
  const pkg = blob.match(/(\d+)\s*Hours?\s*\/\s*(\d+)\s*KM/i);
  if (pkg) {
    packageLabel = `${pkg[1]} Hours / ${pkg[2]} KM`;
  }

  let kilometers: string | null = null;
  const distMatch = text.match(/Distance\s*:\s*(~?[\d.]+)\s*km(?:\s*\(([^)]*)\))?/i);
  if (distMatch) {
    const km = distMatch[1].replace(/^~/, '');
    const detail = (distMatch[2] || '').trim();
    kilometers = /round\s*trip/i.test(detail) ? `~${km} km (round trip)` : `~${km} km`;
  } else if (pkg?.[2]) {
    kilometers = `~${pkg[2]} km`;
  }

  return { tripType, packageLabel, kilometers };
}
