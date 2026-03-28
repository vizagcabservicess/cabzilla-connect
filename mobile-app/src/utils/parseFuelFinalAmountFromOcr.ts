/**
 * Final payable fuel amount from receipt / POS / pump OCR (Indian formats).
 */

const INSTRUMENT_NOISE =
  /\b(card\s*(no\.?|number)|masked|last\s*4|exp(\s|\.|\/)|cvv|\bbank\s+tid|acquiring\s+bank|app\s+label|\bvisa\b|mastercard|rupay|\btxn\s*id|transaction\s*id|\border\s*id|\brrn\b|auth[- ]?code|\bmid\b\s*[:.\-]|\btid\b\s*[:.\-]|\baid\b|\bA\d{12,}\b)/i;

const NET_TOTAL_LABELS = /\b(net\s+amount|total\s+sale|total\s+amount|grand\s+total|sale\s+amount)\b/i;

const PREFERRED_LABEL =
  /\b(net\s+amount|total\s+sale|total\s+amount|payment\s+successful|paid\s+at|\bpaid\b|total\b|\bamount\b)/i;

const THERMAL_TOTAL_LABEL = /\b(total\s+sale|net\s+amount|total\s+amount|grand\s+total)\b/i;

function normalizeOcrRupeeText(text: string): string {
  let t = text
    .replace(/(?<![A-Za-z0-9₹/])\$(?=\d)/gu, '₹ ')
    .replace(/(?<![A-Za-z0-9₹/])\((?=(\d{2,5})(?:\.\d{1,2})?\b)/gu, (full, digits: string) => {
      if (digits.length === 4) {
        const n = parseInt(digits, 10);
        if (n >= 1990 && n <= 2100) return full;
      }
      return '₹ ';
    })
    .replace(/(?<![A-Za-z/])Rs\.?\s*(?=\d)/giu, '₹ ')
    .replace(/\bINR\s+(?=\d)/giu, '₹ ');
  // Paytm: ₹3,379 — strip thousands commas so \d+ matches the full integer.
  t = t.replace(/(₹\s*|Rs\.?\s*)((?:\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?)\b/giu, (_, p1: string, p2: string) => p1 + p2.replace(/,/g, ''));
  return normalizeOcrRupeeGlyphAsLeadingOnePaytm(t);
}

const SPEEDOMETER_TICKS = new Set([20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220]);

function ocrReceiptHasStrongSpeedometerCluster(text: string): boolean {
  let n = 0;
  for (const ln of text.split(/\r?\n/)) {
    const t = ln.trim();
    if (!/^(\d{2,3})$/.test(t)) continue;
    const v = parseInt(t, 10);
    if (SPEEDOMETER_TICKS.has(v)) n++;
  }
  return n >= 3;
}

function filterSpeedometerTicksFromAmounts(amounts: number[], text: string): number[] {
  if (amounts.length === 0 || !ocrReceiptHasStrongSpeedometerCluster(text)) return amounts;
  const nonTick = amounts.filter((v) => !SPEEDOMETER_TICKS.has(Math.round(v)));
  return nonTick.length > 0 ? nonTick : amounts;
}

/** Paytm: ₹389 OCR'd as "1389" (rupee glyph → leading 1). Suffix 50–499 only (see PHP). */
function normalizeOcrRupeeGlyphAsLeadingOnePaytm(text: string): string {
  if (!text || !/paytm|\b9tm\b/i.test(text)) return text;
  return text
    .split(/\r?\n/)
    .map((ln) => {
      const t = ln.trim();
      const m = t.match(/^1(\d{3})$/);
      if (!m) return ln;
      const rest = parseInt(m[1], 10);
      if (rest >= 50 && rest <= 499) return String(rest);
      return ln;
    })
    .join('\n');
}

/** IndianOil / IOCL thermal: label line then ₹ or bare total on following lines. */
function extractFuelThermalLabeledTotal(lines: string[]): number | null {
  const n = lines.length;
  for (let li = 0; li < n; li++) {
    const ln = lines[li].replace(/\s+/g, ' ').trim();
    if (!ln || INSTRUMENT_NOISE.test(ln)) continue;
    if (!THERMAL_TOTAL_LABEL.test(ln)) continue;
    const same = ln.match(/(?:₹|Rs\.?|INR)\s*((?:\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.\d{1,2})?)/iu);
    if (same) {
      const v = stripMoney(same[1]);
      if (v >= 5 && v <= 100_000) return round2(v);
    }
    for (let lj = li + 1; lj <= Math.min(li + 28, n - 1); lj++) {
      let next = lines[lj].replace(/\s+/g, ' ').trim();
      if (!next) continue;
      if (/^[\-\s_.:=]+$/u.test(next)) continue;
      if (INSTRUMENT_NOISE.test(next)) continue;
      const ru = next.match(/^(?:₹|Rs\.?|INR|\$)\s*((?:\d{1,3}(?:,\d{3})+|\d{1,6})(?:\.\d{1,2})?)\s*$/iu);
      if (ru) {
        const v = stripMoney(ru[1]);
        if (v >= 5 && v <= 100_000) return round2(v);
      }
      const bare = next.match(/^\s*((?:\d{1,3}(?:,\d{3})+|\d{2,6})\.\d{2})\s*$/);
      if (bare) {
        const v = stripMoney(bare[1]);
        if (v >= 100 && v <= 100_000) return round2(v);
      }
    }
  }
  return null;
}

function stripMoney(s: string): number {
  const t = s.replace(/,/g, '').replace(/^0+(?=\d)/, '');
  const n = parseFloat(t);
  return n;
}

/** True if this ₹/Rs amount is in a unit-rate / qty context, not the final total on the same line. */
function isRateyAmountPrefix(before: string, line: string, matchStart: number): boolean {
  if (/\b(total\s+sale|total\s+amount|net\s+amount)\b/i.test(before)) return false;
  if (/\bamount\s*\(\s*rs\.?\s*\)\s*:/i.test(before)) return false;
  if (/\btotal\b/i.test(before)) return false;
  if (/\bpayment\s+successful\b/i.test(line) && matchStart < 80) return false;
  return /\brate\b|amt\/qty|rs\/l|\/\s*l\b|per\s*l|\/kg\b|per\s*kg/i.test(before);
}

function isRupeeDateDayNoise(line: string): boolean {
  if (!/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(line)) return false;
  return /(?:₹|Rs\.?)\s*([1-9]|[12]\d|3[01])\b/i.test(line);
}

function isCalendarDateLine(line: string): boolean {
  if (/\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+[,\s]*\d{2,4}\b/i.test(line))
    return true;
  if (/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i.test(line)) return true;
  if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(line)) return true;
  return false;
}

/** EMV AID …0031010 → spurious 1010 in digit scans; pairs with fragment "10" looked like a valid (min,max) AID heuristic. */
function isAidGhostTotal(v: number): boolean {
  return Math.abs(v - 1010) < 0.01;
}

/** Match PHP pickPlausibleReceiptTotalFromAmounts for POS/Paytm slips. */
function pickPlausibleReceiptTotalsFromAmounts(vals: number[]): number | null {
  let v = vals.filter((x) => x >= 10 && x <= 500_000);
  if (v.length === 0) return null;
  v = [...new Set(v)].sort((a, b) => a - b);
  const n0 = v.length;
  const min0 = v[0];
  const max0 = v[n0 - 1];
  if (n0 >= 2) {
    let otherPlausible = false;
    for (const x of v) {
      if (isAidGhostTotal(x)) continue;
      if (x >= 100 && x <= 50_000) otherPlausible = true;
    }
    if (otherPlausible) v = v.filter((x) => !isAidGhostTotal(x));
  }
  if (n0 >= 2 && isAidGhostTotal(max0) && min0 < 100) {
    v = v.filter((x) => !isAidGhostTotal(x));
    if (v.length === 0 || (v.length === 1 && v[0] < 100)) return null;
  }
  v.sort((a, b) => a - b);
  const n = v.length;
  if (n === 1) return round2(v[0]);
  const minV = v[0];
  const maxV = v[n - 1];
  if (minV < 1000 && maxV >= 9000 && maxV <= 9999 && maxV >= minV * 3) return round2(minV);
  if (maxV >= minV * 4 && minV <= 2000 && maxV >= 8000) return round2(minV);
  if (n === 2 && minV >= 100 && minV <= 550 && maxV >= 1000 && maxV <= 1300 && maxV - minV >= 450) return round2(minV);
  if (n === 2 && minV <= 550 && maxV >= 1400 && maxV <= 4999 && maxV - minV >= 900) return round2(minV);
  return round2(maxV);
}

function paytmHeaderAnchorLineIndex(lines: string[]): number {
  let idx = lines.findIndex((l) => /payment\s+successful/i.test(l));
  if (idx >= 0) return idx;
  idx = lines.findIndex((l) => /\b9tm\b/i.test(l));
  if (idx >= 0) return idx;
  idx = lines.findIndex((l) => /\bpaytm\b/i.test(l));
  return idx;
}

function extractPaytmHeaderAmount(lines: string[]): number | null {
  const idx = paytmHeaderAnchorLineIndex(lines);
  if (idx < 0) return null;
  const cands: number[] = [];
  for (let j = idx; j < Math.min(idx + 16, lines.length); j++) {
    const line = lines[j];
    if (j > idx && INSTRUMENT_NOISE.test(line)) break;
    if (isRupeeDateDayNoise(line) || isCalendarDateLine(line)) continue;
    const ru = line.match(/(?:₹|Rs\.?|\$)\s*((?:\d{1,3}(?:,\d{3})+|\d{1,7})(?:\.\d{1,2})?)/i);
    if (ru) {
      const v = stripMoney(ru[1]);
      if (v >= 5 && v <= 500_000 && !isYearNoise(v)) cands.push(v);
    }
    const lone = line.trim().match(/^((?:\d{1,3}(?:,\d{3})+|\d{3,7})(?:\.\d{1,2})?)$/);
    if (lone) {
      let prevNonEmpty = '';
      for (let k = j - 1; k >= idx; k--) {
        if (lines[k] !== '') {
          prevNonEmpty = lines[k];
          break;
        }
      }
      if (/paid\s+at\b/i.test(prevNonEmpty)) continue;
      const v = stripMoney(lone[1]);
      if (v >= 100 && v <= 500_000) cands.push(v);
    }
  }
  if (cands.length === 0) return null;
  const filtered = filterSpeedometerTicksFromAmounts(cands, lines.join('\n'));
  return pickPlausibleReceiptTotalsFromAmounts(filtered);
}

function isYearNoise(v: number): boolean {
  return v >= 2018 && v <= 2035 && Number.isInteger(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Single final amount or null (no currency + label match found).
 */
export function parseFuelFinalAmountFromText(text: string): number | null {
  if (!text?.trim()) return null;
  const normalized = normalizeOcrRupeeText(text);
  const lines = normalized.split(/\r?\n/).map((l) => l.trim());

  type Cand = { v: number; netTotal: boolean; preferred: boolean; ratey: boolean };
  const push = (list: Cand[], v: number, line: string, matchStart: number) => {
    if (!Number.isFinite(v) || v < 1 || v > 1_000_000 || isYearNoise(v)) return;
    const before = line.slice(0, matchStart);
    const netTotal = NET_TOTAL_LABELS.test(line);
    const preferred = PREFERRED_LABEL.test(line);
    const ratey = isRateyAmountPrefix(before, line, matchStart);
    list.push({ v: round2(v), netTotal, preferred, ratey });
  };

  const cands: Cand[] = [];

  const thermal = extractFuelThermalLabeledTotal(lines);
  if (thermal != null) {
    cands.push({ v: thermal, netTotal: true, preferred: true, ratey: false });
  }

  for (const line of lines) {
    if (!line || INSTRUMENT_NOISE.test(line)) continue;
    if (isRupeeDateDayNoise(line)) continue;

    const patterns: RegExp[] = [
      /(?:₹|Rs\.?|INR|Rupees)\s*:?\s*(\d[\d,]*(?:\.\d{1,4})?)/gi,
      /\b(?:net\s+amount|total\s+sale|total\s+amount|sale\s+amount)\s*:?\s*(?:₹|Rs\.?|INR)?\s*(\d[\d,]*(?:\.\d{1,4})?)/gi,
      /\bamount\s*\(\s*rs\.?\s*\)\s*:?\s*(\d[\d,]*(?:\.\d{1,4})?)/gi,
      /\b(?:amount|amt)\b\s*:?\s*(?:₹|Rs\.?)?\s*(\d[\d,]*(?:\.\d{1,4})?)/gi,
    ];

    for (const re of patterns) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(line)) !== null) {
        const numIdx = m.index + m[0].indexOf(m[1]);
        push(cands, stripMoney(m[1]), line, numIdx);
      }
    }
  }

  const paytm = extractPaytmHeaderAmount(lines);
  if (paytm != null) {
    cands.push({ v: paytm, netTotal: false, preferred: true, ratey: false });
  }

  if (cands.length === 0) return null;

  const nonRate = cands.filter((c) => !c.ratey);
  const pool = nonRate.length > 0 ? nonRate : cands;

  const netOnes = pool.filter((c) => c.netTotal);
  if (netOnes.length > 0) return round2(Math.max(...netOnes.map((c) => c.v)));

  const pref = pool.filter((c) => c.preferred);
  if (pref.length > 0) {
    const pickedPref = pickPlausibleReceiptTotalsFromAmounts(pref.map((c) => c.v));
    if (pickedPref != null) return pickedPref;
  }

  const pickedPool = pickPlausibleReceiptTotalsFromAmounts(pool.map((c) => c.v));
  return pickedPool != null ? pickedPool : round2(Math.max(...pool.map((c) => c.v)));
}
