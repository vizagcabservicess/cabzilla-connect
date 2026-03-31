import { hourlyPackages } from '@/lib/packageData';
import type { Booking } from '@/types/api';
import { normalizeTripTypeForConfirmation } from '@/utils/localPackageLimitsForConfirmation';

/** When trip_type is wrong but DB has standard local package caps, still show Local on invoice. */
function bookingHasKnownLocalHourlyCaps(booking: Booking): boolean {
  if (booking.tour_id ?? booking.tourId) {
    return false;
  }
  const h = Number(booking.hoursIncluded ?? booking.hours_included);
  const km = Number(booking.kmIncluded ?? booking.km_included);
  if (!Number.isFinite(h) || !Number.isFinite(km) || h <= 0 || km <= 0) {
    return false;
  }
  return hourlyPackages.some((p) => p.hours === h && p.kilometers === km);
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ');
}

/**
 * Server invoice lists "No. of Hours" / "No. of Kilometers" even when the admin booking JSON omits those fields.
 */
function tryParseLocalHoursKmFromInvoiceHtml(html: string): { hours: number; km: number } | null {
  let h: number | null = null;
  let km: number | null = null;
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const plain = stripHtmlTags(m[1]).replace(/\s+/g, ' ').trim();
    const lower = plain.toLowerCase();
    if (/no\.?\s*of\s*hours?\b/i.test(lower)) {
      const nums = plain.match(/\d+/g);
      if (nums?.length) {
        h = parseInt(nums[nums.length - 1]!, 10);
      }
    }
    if (/no\.?\s*of\s*kilometers?\b/i.test(lower) || /no\.?\s*of\s*kms?\b/i.test(lower)) {
      const nums = plain.match(/\d+/g);
      if (nums?.length) {
        km = parseInt(nums[nums.length - 1]!, 10);
      }
    }
  }
  if (h != null && km != null && h > 0 && km > 0) {
    return { hours: h, km: km };
  }
  return null;
}

function enrichBookingWithParsedInvoiceCaps(html: string, booking: Booking): Booking {
  if (bookingHasKnownLocalHourlyCaps(booking)) {
    return booking;
  }
  const parsed = tryParseLocalHoursKmFromInvoiceHtml(html);
  if (!parsed) {
    return booking;
  }
  const { hours, km } = parsed;
  if (!hourlyPackages.some((p) => p.hours === hours && p.kilometers === km)) {
    return booking;
  }
  return {
    ...booking,
    hoursIncluded: hours,
    kmIncluded: km,
  };
}

/**
 * Customer-facing trip type line for invoice HTML (fixes DB mislabels e.g. local hourly stored as outstation).
 */
export function getInvoiceTripTypeDisplay(booking: Booking): string {
  const raw = String(booking.tripType ?? booking.trip_type ?? '').trim();
  const tourRef = booking.tour_id ?? booking.tourId;
  const modeRaw = String(booking.tripMode ?? booking.trip_mode ?? '').toLowerCase();
  const isRound = modeRaw.includes('round');
  const modeLabel = isRound ? 'Round trip' : 'One way';

  if (tourRef || raw.toLowerCase() === 'tour') {
    const name = String(booking.tourName ?? booking.tour_name ?? '').trim();
    return name ? `Tour: ${name} (${modeLabel})` : `Tour (${modeLabel})`;
  }

  const normalized = normalizeTripTypeForConfirmation(raw, booking).toLowerCase();
  const isLocal =
    normalized === 'local' || bookingHasKnownLocalHourlyCaps(booking);

  if (isLocal) {
    // Invoice Trip Summary already lists hours/km; keep trip type label short.
    return 'Local';
  }

  if (normalized === 'airport' || raw.toLowerCase().includes('airport')) {
    return `Airport transfer (${modeLabel})`;
  }

  if (normalized === 'outstation' || raw.toLowerCase().includes('outstation')) {
    return `Outstation (${modeLabel})`;
  }

  if (raw) {
    const titled = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    return `${titled} (${modeLabel})`;
  }

  return `— (${modeLabel})`;
}

function isTripTypeLabelText(text: string): boolean {
  return /^trip\s*type\s*:?\s*$/i.test(text.replace(/\s+/g, ' ').trim());
}

/**
 * Trip Summary uses `<p class="compact-p"><strong>Trip Type:</strong> Outstation ...</p>` (not table cells).
 */
function patchCompactPTripType(paragraph: Element, line: string): boolean {
  const strongs = paragraph.querySelectorAll('strong');
  for (let i = 0; i < strongs.length; i++) {
    const strong = strongs[i]!;
    if (!isTripTypeLabelText(String(strong.textContent || ''))) {
      continue;
    }
    while (strong.nextSibling) {
      strong.nextSibling.remove();
    }
    const doc = paragraph.ownerDocument;
    if (doc) {
      paragraph.appendChild(doc.createTextNode(` ${line}`));
    }
    return true;
  }
  return false;
}

function patchInvoiceTripTypeWithDom(doc: Document, line: string): boolean {
  let changed = false;

  doc.querySelectorAll('p.compact-p, p[class*="compact"]').forEach((p) => {
    if (patchCompactPTripType(p, line)) {
      changed = true;
    }
  });

  doc.querySelectorAll('tr').forEach((row) => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length < 2) {
      return;
    }
    const label = (cells[0].textContent || '').replace(/\s+/g, ' ').trim();
    if (isTripTypeLabelText(label)) {
      cells[1].textContent = line;
      changed = true;
    }
  });

  doc.querySelectorAll('.detail-item').forEach((item) => {
    const labelEl = item.querySelector('.detail-label');
    const valueEl = item.querySelector('.detail-value');
    if (!labelEl || !valueEl) {
      return;
    }
    const label = (labelEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (isTripTypeLabelText(label)) {
      valueEl.textContent = line;
      changed = true;
    }
  });

  doc.querySelectorAll('dt').forEach((dt) => {
    const label = (dt.textContent || '').replace(/\s+/g, ' ').trim();
    if (!isTripTypeLabelText(label)) {
      return;
    }
    let next: Element | null = dt.nextElementSibling;
    while (next && next.tagName !== 'DD') {
      next = next.nextElementSibling;
    }
    if (next) {
      next.textContent = line;
      changed = true;
    }
  });

  doc.querySelectorAll('table.two-col tr').forEach((row) => {
    const tds = row.querySelectorAll('td');
    if (tds.length === 1) {
      const t = (tds[0].textContent || '').replace(/\s+/g, ' ').trim();
      if ((/^local$/i.test(t) || /^local\s*\(/i.test(t)) && !/hourly/i.test(t)) {
        tds[0].textContent = line;
        changed = true;
      }
      return;
    }
    if (tds.length === 2) {
      const t0 = (tds[0].textContent || '').replace(/\s+/g, ' ').trim();
      const t1 = (tds[1].textContent || '').replace(/\s+/g, ' ').trim();
      if (
        !t0 &&
        (/^local$/i.test(t1) || /^local\s*\(/i.test(t1)) &&
        !/hourly/i.test(t1)
      ) {
        tds[1].textContent = line;
        changed = true;
      }
    }
  });

  return changed;
}

function patchInvoiceTripTypeWithRegex(html: string, line: string): string {
  let patched = html.replace(
    /(<p[^>]*\bcompact-p\b[^>]*>\s*<strong>\s*Trip\s*Type\s*:?\s*<\/strong>)\s*[^<]*/gi,
    `$1 ${line}`
  );
  if (patched !== html) {
    return patched;
  }
  patched = html.replace(
    /(<p[^>]*\bcompact-p\b[^>]*>[\s\S]*?<strong>\s*Trip\s*Type\s*:?\s*<\/strong>)\s*([\s\S]*?)(<\/p>)/gi,
    (_, a: string, _mid: string, c: string) => `${a} ${line}${c}`
  );
  if (patched !== html) {
    return patched;
  }

  const reTd =
    /(<td[^>]*>[\s\S]*?Trip\s*Type\s*:?[\s\S]*?<\/td>\s*<td[^>]*>)([\s\S]*?)(<\/td>)/gi;
  patched = html.replace(reTd, (_, a: string, _mid: string, c: string) => `${a}${line}${c}`);
  if (patched !== html) {
    return patched;
  }

  const reTh =
    /(<th[^>]*>[\s\S]*?Trip\s*Type\s*:?[\s\S]*?<\/th>\s*<td[^>]*>)([\s\S]*?)(<\/td>)/gi;
  patched = html.replace(reTh, (_, a: string, _mid: string, c: string) => `${a}${line}${c}`);
  if (patched !== html) {
    return patched;
  }

  const reDetail =
    /(<div[^>]*\bdetail-label\b[^>]*>[\s\S]*?Trip\s*Type\s*:?[\s\S]*?<\/div>\s*<div[^>]*\bdetail-value\b[^>]*>)([\s\S]*?)(<\/div>)/gi;
  return html.replace(reDetail, (_, a: string, _mid: string, c: string) => `${a}${line}${c}`);
}

/**
 * Rewrite Trip Type everywhere it appears in server-generated invoice HTML.
 */
export function patchInvoiceHtmlTripTypeCell(html: string, booking: Booking): string {
  if (!html) {
    return html;
  }
  const enriched = enrichBookingWithParsedInvoiceCaps(html, booking);
  const line = getInvoiceTripTypeDisplay(enriched);

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (patchInvoiceTripTypeWithDom(doc, line)) {
        return doc.documentElement.outerHTML;
      }
    } catch {
      /* fall through */
    }
  }

  return patchInvoiceTripTypeWithRegex(html, line);
}
