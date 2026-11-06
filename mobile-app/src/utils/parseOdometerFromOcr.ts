/**
 * Parse odometer km reading from OCR text (dashboard photos).
 * Total odometer is usually the largest plausible number; 6-digit (100k–999k km) is common in India.
 */

function rpmContextNear(text: string, idx: number, len: number): boolean {
  const ctx = text.slice(Math.max(0, idx - 30), idx + len + 30);
  return /x\s*1000|\b1000\s*r\s*\/\s*min|\brpm\b|r\/min|rev\/?\s*min|×\s*1000/i.test(ctx);
}

/** When several "NNN km" fragments exist, total odometer is typically the largest. */
function resolveKmTaggedValues(vals: number[]): number {
  const uniq = [...new Set(vals.filter((n) => n >= 1 && n <= 9_999_999))];
  if (uniq.length === 0) return 0;
  return Math.max(...uniq);
}

function normalizeOdometerText(text: string): string {
  const normalized = text.replace(/[０-９]/g, (ch) => String('０１２３４５６７８９'.indexOf(ch)));
  let collapsed = normalized.replace(/(\d),(\d{3})\b/g, '$1$2');
  for (let i = 0; i < 6; i++) {
    const next = collapsed.replace(/\b(\d{1,3})\s+(\d{3})\b/gu, '$1$2');
    if (next === collapsed) break;
    collapsed = next;
  }
  return collapsed.replace(/\b\d{1,3}\s*-\s*\d{2,4}\b/gu, ' ');
}

/** The number printed next to km. Range and the odometer can both match; the larger one is the total. */
export function kmLabeledOdometer(text: string): number | null {
  const stripped = normalizeOdometerText(text);
  const kmGlobal = [
    ...stripped.matchAll(/(\d{1,3}(?:,\d{3})*|\d{1,7})\s*[.,]*\s*k\s*m?s?\b/gi),
  ];
  const vals = kmGlobal
    .map((m) => parseInt(m[1]!.replace(/,/g, ''), 10))
    .filter((n) => n >= 1 && n <= 9_999_999);
  const picked = resolveKmTaggedValues(vals);
  return picked > 0 ? picked : null;
}

export function parseOdometerFromText(text: string): number | null {
  const labeled = kmLabeledOdometer(text);
  if (labeled != null) return labeled;
  const stripped = normalizeOdometerText(text);

  // "189531 km" / "189 531 km" / "189531km"
  const kmGlobal = [
    ...stripped.matchAll(
      /(\d{1,3}(?:,\d{3})*|\d{4,7})\s*[.,]*\s*k\s*m?s?\b/gi
    ),
  ];
  if (kmGlobal.length > 0) {
    const vals = kmGlobal
      .map((m) => parseInt(m[1]!.replace(/,/g, ''), 10))
      .filter((n) => n >= 1000 && n <= 9_999_999);
    if (vals.length > 0) {
      const v = resolveKmTaggedValues(vals);
      if (v > 0) return v;
    }
  }

  // Six-digit total km (e.g. 189531) — prefer before any 5-digit (trip meters, misreads)
  const six = [...stripped.matchAll(/\b(\d{6})\b/g)]
    .map((m) => ({
      v: parseInt(m[1]!, 10),
      idx: m.index ?? 0,
    }))
    .filter((x) => x.v >= 100_000 && x.v <= 999_999);
  if (six.length > 0) {
    const notRpm = six.filter((p) => !rpmContextNear(stripped, p.idx, String(p.v).length));
    const pool = notRpm.length > 0 ? notRpm : six;
    return Math.max(...pool.map((p) => p.v));
  }

  const five = [...stripped.matchAll(/\b(\d{5})\b/g)].map((m) => ({
    v: parseInt(m[1], 10),
    idx: m.index ?? 0,
  }));
  const fiveOk = five.filter((x) => x.v >= 10_000 && x.v <= 99_999);
  if (fiveOk.length >= 2) {
    let best = fiveOk[0]!.v;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const p of fiveOk) {
      const after = stripped.slice(p.idx + String(p.v).length, p.idx + String(p.v).length + 72);
      const kmBoost = /^\s*[.,]*\s*k\s*m?s?\b/i.test(after) ? 1_000_000 : 0;
      const ctx = stripped.slice(Math.max(0, p.idx - 20), p.idx + String(p.v).length + 40);
      const rpmPen = /x\s*1000|\brpm\b|\/\s*min|rev\/?\s*min/i.test(ctx) ? 500_000 : 0;
      const score = kmBoost - rpmPen + p.idx;
      if (score > bestScore) {
        bestScore = score;
        best = p.v;
      }
    }
    return best;
  }
  if (fiveOk.length === 1) {
    const p = fiveOk[0]!;
    if (rpmContextNear(stripped, p.idx, 5)) return null;
    return p.v;
  }

  const raw = stripped.replace(/\s/g, ' ');
  const matches = raw.match(/\d{4,7}/g);
  if (!matches || matches.length === 0) return null;
  const numbers = matches.map((m) => parseInt(m, 10)).filter((n) => n >= 1000 && n <= 9_999_999);
  if (numbers.length === 0) return null;
  const hasLarge = numbers.some((n) => n >= 10_000);
  const candidates = hasLarge ? numbers.filter((n) => n < 800 || n > 6000) : numbers;
  const pool = candidates.length > 0 ? candidates : numbers;
  const large = pool.filter((n) => n >= 10_000);
  if (large.length > 0) {
    // The km total is longer than the trip meter (6604 above 100305 km).
    return Math.max(...large);
  }
  return Math.max(...pool);
}

function digitCount(value: number): number {
  return String(Math.round(value)).length;
}

/**
 * A number printed with km is the odometer, at any length.
 * Expo Go often gets the trip meter from the server and the full km total from photo text.
 * The longer text reading wins in that case. A short reading is kept when it is the only one.
 */
export function chooseOdometerReading(
  fromText: number | null,
  fromVision: number | null,
  kmLabeled: number | null = null,
): number | null {
  if (kmLabeled != null && kmLabeled >= 1 && (fromVision == null || kmLabeled >= fromVision)) {
    return kmLabeled;
  }
  if (fromVision != null && fromText != null && fromVision !== fromText && digitCount(fromText) > digitCount(fromVision)) {
    return fromText;
  }
  if (fromVision != null && fromVision >= 1) return fromVision;
  if (fromText != null && fromText >= 1) return fromText;
  return null;
}
