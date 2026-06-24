import { hourlyPackages } from '@/lib/packageData';
import type { Booking } from '@/types/api';
import type { TripSummaryOverrides } from '@/utils/invoiceTripSummaryDefaults';
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
 * Insert billing address into Customer Details when missing from server HTML.
 */
export function patchInvoiceHtmlBillingAddress(html: string, billingAddress: string): string {
  const value = billingAddress.trim();
  if (!html || !value || /billing\s*address\s*:/i.test(html)) {
    return html;
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const paragraphs = Array.from(doc.querySelectorAll('p.compact-p, p[class*="compact"]'));
      const emailParagraph = paragraphs.find((p) =>
        /^email\s*:?\s*$/i.test((p.querySelector('strong')?.textContent ?? '').replace(/\s+/g, ' ').trim())
      );
      if (emailParagraph) {
        const billing = doc.createElement('p');
        billing.className = emailParagraph.className || 'compact-p';
        const strong = doc.createElement('strong');
        strong.textContent = 'Billing Address:';
        billing.appendChild(strong);
        billing.appendChild(doc.createTextNode(` ${value}`));
        emailParagraph.insertAdjacentElement('afterend', billing);
        return doc.documentElement.outerHTML;
      }
    } catch {
      /* fall through */
    }
  }

  return html.replace(
    /(<p class="compact-p"><strong>Email:<\/strong>[\s\S]*?<\/p>)/i,
    `$1<p class="compact-p"><strong>Billing Address:</strong> ${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
  );
}

/**
 * Replace invoice number in server-generated HTML using stored admin override.
 */
export function patchInvoiceHtmlInvoiceNumber(html: string, invoiceNumber: string): string {
  const value = invoiceNumber.trim();
  if (!html || !value) {
    return html;
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      let changed = false;

      doc.querySelectorAll('p.compact-p, p[class*="compact"]').forEach((p) => {
        const strong = p.querySelector('strong');
        if (!strong) {
          return;
        }
        const label = (strong.textContent || '').replace(/\s+/g, ' ').trim();
        if (!/^invoice\s*#\s*:?\s*$/i.test(label)) {
          return;
        }
        while (strong.nextSibling) {
          strong.nextSibling.remove();
        }
        p.appendChild(doc.createTextNode(` ${value}`));
        changed = true;
      });

      if (changed) {
        return doc.documentElement.outerHTML;
      }
    } catch {
      /* fall through */
    }
  }

  const escaped = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return html.replace(
    /(<p class="compact-p"><strong>Invoice\s*#:<\/strong>)\s*[^<]*/i,
    `$1 ${escaped}`
  );
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

function isTripSummaryLabel(text: string, pattern: RegExp): boolean {
  return pattern.test(text.replace(/\s+/g, ' ').trim());
}

function patchCompactPTripSummaryField(paragraph: Element, pattern: RegExp, value: string): boolean {
  const strongs = paragraph.querySelectorAll('strong');
  for (let i = 0; i < strongs.length; i++) {
    const strong = strongs[i]!;
    if (!isTripSummaryLabel(String(strong.textContent || ''), pattern)) {
      continue;
    }
    while (strong.nextSibling) {
      strong.nextSibling.remove();
    }
    const doc = paragraph.ownerDocument;
    if (doc) {
      paragraph.appendChild(doc.createTextNode(` ${value}`));
    }
    return true;
  }
  return false;
}

function isVehicleNoLabel(text: string): boolean {
  return /^vehicle\s*no\.?\s*:?\s*$/i.test(text.replace(/\s+/g, ' ').trim());
}

function isVehicleTypeLabel(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return /^vehicle\s*:?\s*$/i.test(normalized) && !/^vehicle\s*no/i.test(normalized);
}

function removeVehicleNoParagraphs(doc: Document): boolean {
  let changed = false;
  doc.querySelectorAll('p.compact-p, p[class*="compact"]').forEach((p) => {
    const strong = p.querySelector('strong');
    if (strong && isVehicleNoLabel(String(strong.textContent || ''))) {
      p.remove();
      changed = true;
    }
  });
  return changed;
}

function patchVehicleNoInParagraph(paragraph: Element, value: string): boolean {
  const strongs = paragraph.querySelectorAll('strong');
  for (let i = 0; i < strongs.length; i++) {
    const strong = strongs[i]!;
    if (!isVehicleNoLabel(String(strong.textContent || ''))) {
      continue;
    }
    while (strong.nextSibling) {
      strong.nextSibling.remove();
    }
    const doc = paragraph.ownerDocument;
    if (doc) {
      paragraph.appendChild(doc.createTextNode(` ${value}`));
    }
    return true;
  }
  return false;
}

function insertVehicleNoAfterVehicleLine(doc: Document, value: string): boolean {
  const paragraphs = doc.querySelectorAll('p.compact-p, p[class*="compact"]');
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i]!;
    const strong = p.querySelector('strong');
    if (!strong || !isVehicleTypeLabel(String(strong.textContent || ''))) {
      continue;
    }
    const newP = doc.createElement('p');
    newP.className = p.className || 'compact-p';
    const newStrong = doc.createElement('strong');
    newStrong.textContent = 'Vehicle No.:';
    newP.appendChild(newStrong);
    newP.appendChild(doc.createTextNode(` ${value}`));
    p.insertAdjacentElement('afterend', newP);
    return true;
  }
  return false;
}

function patchInvoiceVehicleNumberWithDom(doc: Document, vehicleNumber?: string): boolean {
  if (vehicleNumber === undefined) {
    return false;
  }
  const trimmed = vehicleNumber.trim();
  if (trimmed === '') {
    return removeVehicleNoParagraphs(doc);
  }

  let changed = false;
  doc.querySelectorAll('p.compact-p, p[class*="compact"]').forEach((p) => {
    if (patchVehicleNoInParagraph(p, trimmed)) {
      changed = true;
    }
  });

  if (!changed) {
    changed = insertVehicleNoAfterVehicleLine(doc, trimmed);
  }
  return changed;
}

/**
 * Insert, update, or remove the vehicle registration line in invoice HTML.
 */
export function patchInvoiceHtmlVehicleNumber(html: string, vehicleNumber?: string): string {
  if (!html || vehicleNumber === undefined) {
    return html;
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (patchInvoiceVehicleNumberWithDom(doc, vehicleNumber)) {
        return doc.documentElement.outerHTML;
      }
    } catch {
      /* fall through */
    }
  }

  if (vehicleNumber.trim() === '') {
    return html.replace(
      /<p class="compact-p"><strong>Vehicle\s*No\.?:<\/strong>[\s\S]*?<\/p>\s*/gi,
      ''
    );
  }

  const escaped = vehicleNumber
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const vehicleNoLine = `<p class="compact-p"><strong>Vehicle No.:</strong> ${escaped}</p>`;

  if (/Vehicle\s*No\.?:/i.test(html)) {
    return html.replace(
      /<p class="compact-p"><strong>Vehicle\s*No\.?:<\/strong>[\s\S]*?<\/p>/i,
      vehicleNoLine
    );
  }

  return html.replace(
    /(<p class="compact-p"><strong>Vehicle:<\/strong>[\s\S]*?<\/p>)/i,
    `$1${vehicleNoLine}`
  );
}

function patchInvoiceTripSummaryWithDom(doc: Document, overrides: Partial<TripSummaryOverrides>): boolean {
  const fields: Array<{ pattern: RegExp; value?: string }> = [
    { pattern: /^trip\s*type\s*:?\s*$/i, value: overrides.tripType },
    { pattern: /^date\s*:?\s*$/i, value: overrides.tripDate },
    { pattern: /^vehicle\s*:?\s*$/i, value: overrides.vehicleType },
    { pattern: /^no\.?\s*of\s*hours?\s*:?\s*$/i, value: overrides.noOfHours },
    { pattern: /^no\.?\s*of\s*kilometers?\s*:?\s*$/i, value: overrides.noOfKilometers },
    { pattern: /^no\.?\s*of\s*kms?\s*:?\s*$/i, value: overrides.noOfKilometers },
  ];

  let changed = false;

  doc.querySelectorAll('p.compact-p, p[class*="compact"]').forEach((p) => {
    fields.forEach(({ pattern, value }) => {
      if (value != null && value !== '' && patchCompactPTripSummaryField(p, pattern, value)) {
        changed = true;
      }
    });
  });

  doc.querySelectorAll('tr').forEach((row) => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length < 2) {
      return;
    }
    const label = (cells[0].textContent || '').replace(/\s+/g, ' ').trim();
    fields.forEach(({ pattern, value }) => {
      if (value != null && value !== '' && isTripSummaryLabel(label, pattern)) {
        cells[1].textContent = value;
        changed = true;
      }
    });
  });

  if (overrides.vehicleNumber !== undefined) {
  changed = patchInvoiceVehicleNumberWithDom(doc, overrides.vehicleNumber) || changed;
  }

  return changed;
}

/**
 * Rewrite Trip Summary fields in server-generated invoice HTML using admin overrides.
 */
export function patchInvoiceHtmlTripSummary(
  html: string,
  overrides: Partial<TripSummaryOverrides>
): string {
  if (!html) {
    return html;
  }

  const hasOverride = Object.entries(overrides).some(([key, value]) => {
    if (key === 'vehicleNumber') {
      return value !== undefined;
    }
    return value != null && String(value).trim() !== '';
  });
  if (!hasOverride) {
    return html;
  }

  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (patchInvoiceTripSummaryWithDom(doc, overrides)) {
        return doc.documentElement.outerHTML;
      }
    } catch {
      /* fall through */
    }
  }

  let patched = html;
  if (overrides.vehicleNumber !== undefined) {
    patched = patchInvoiceHtmlVehicleNumber(patched, overrides.vehicleNumber);
  }

  return patched;
}
