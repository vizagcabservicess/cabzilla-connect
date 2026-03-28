/**
 * Parse odometer km reading from OCR text (dashboard photos).
 */
function resolveConflictingKmReadings(kmVals: number[]): number {
  const uniq = [...new Set(kmVals.filter((n) => n >= 1000 && n <= 9_999_999))];
  if (uniq.length === 0) return 0;
  const fiveKm = uniq.filter((n) => n >= 10_000 && n <= 99_999);
  const sixKm = uniq.filter((n) => n >= 100_000 && n <= 999_999);
  if (fiveKm.length > 0 && sixKm.length > 0) {
    const fm = Math.max(...fiveKm);
    for (const sv of sixKm) {
      const lo = Math.floor(fm * 1.72);
      const hi = Math.floor(fm * 3.7);
      if (sv > lo && sv < hi) return fm;
    }
  }
  return Math.max(...uniq);
}

export function parseOdometerFromText(text: string): number | null {
  const normalized = text.replace(/[０-９]/g, (ch) => String('０１２３４５６７８９'.indexOf(ch)));
  const stripped = normalized.replace(/\b\d{1,3}\s*-\s*\d{2,4}\b/gu, ' ');
  const kmGlobal = [...stripped.matchAll(/(\d{1,3}(?:,\d{3})*|\d{4,7})\s*[.,]*\s*k\s*ms?\b/gis)];
  if (kmGlobal.length > 0) {
    const vals = kmGlobal
      .map((m) => parseInt(m[1]!.replace(/,/g, ''), 10))
      .filter((n) => n >= 1000 && n <= 9_999_999);
    if (vals.length > 0) return resolveConflictingKmReadings(vals);
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
      const kmBoost = /^\s*[.,]*\s*k\s*ms?\b/i.test(after) ? 1_000_000 : 0;
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
  if (fiveOk.length === 1) return fiveOk[0]!.v;

  const six = [...stripped.matchAll(/\b(\d{6})\b/g)]
    .map((m) => ({ v: parseInt(m[1]!, 10), idx: m.index ?? 0 }))
    .filter((x) => x.v >= 100_000 && x.v <= 999_999);
  if (fiveOk.length >= 1 && six.length >= 1) {
    const fiveMax = Math.max(...fiveOk.map((p) => p.v));
    const sixMax = Math.max(...six.map((p) => p.v));
    const lo = Math.floor(fiveMax * 1.72);
    const hi = Math.floor(fiveMax * 3.7);
    if (sixMax > fiveMax && sixMax > lo && sixMax < hi) {
      const fiveHasKm = fiveOk.some((p) => {
        const after = stripped.slice(p.idx + String(p.v).length, p.idx + String(p.v).length + 72);
        return /^\s*[.,]*\s*k\s*ms?\b/i.test(after);
      });
      const sixHasKm = six.some((p) => {
        const after = stripped.slice(p.idx + String(p.v).length, p.idx + String(p.v).length + 72);
        return /^\s*[.,]*\s*k\s*ms?\b/i.test(after);
      });
      if (fiveHasKm || !sixHasKm) {
        let best = fiveOk[0]!.v;
        let bestScore = Number.NEGATIVE_INFINITY;
        for (const p of fiveOk) {
          const after = stripped.slice(p.idx + String(p.v).length, p.idx + String(p.v).length + 72);
          const kmBoost = /^\s*[.,]*\s*k\s*ms?\b/i.test(after) ? 1_000_000 : 0;
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
    }
  }

  const raw = stripped.replace(/\s/g, ' ');
  const matches = raw.match(/\d{4,7}/g);
  if (!matches || matches.length === 0) return null;
  const numbers = matches.map((m) => parseInt(m, 10)).filter((n) => n >= 1000 && n <= 9999999);
  if (numbers.length === 0) return null;
  const hasLarge = numbers.some((n) => n >= 10000);
  const candidates = hasLarge ? numbers.filter((n) => n < 800 || n > 6000) : numbers;
  const pool = candidates.length > 0 ? candidates : numbers;
  const large = pool.filter((n) => n >= 10000);
  if (large.length > 1) {
    return Math.min(...large);
  }
  return Math.max(...pool);
}
