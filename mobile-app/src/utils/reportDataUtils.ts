/**
 * Normalize API / PHP payloads (camelCase + occasional snake_case) for admin reports.
 */
import { format, parseISO, isValid } from 'date-fns';

export function pickNum(obj: Record<string, unknown> | undefined | null, ...keys: string[]): number {
  if (!obj) return 0;
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = parseFloat(String(v).replace(/,/g, ''));
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

export function pickStr(obj: Record<string, unknown> | undefined | null, ...keys: string[]): string {
  if (!obj) return '';
  for (const k of keys) {
    const v = obj[k];
    if (v == null || v === '') continue;
    return String(v).trim();
  }
  return '';
}

export function formatReportDateLabel(raw: string | undefined | null): string {
  if (raw == null || raw === '') return '—';
  try {
    const d = parseISO(String(raw).slice(0, 10));
    if (isValid(d)) return format(d, 'dd MMM yyyy');
  } catch {
    /* fall through */
  }
  return String(raw);
}

export function normalizeReportPayload(
  reportType: string,
  raw: unknown
): Record<string, unknown> | null {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  if (Array.isArray(raw)) {
    if (reportType === 'vehicles') {
      return { vehicles: raw as unknown[] };
    }
    return { items: raw as unknown[] };
  }
  return raw as Record<string, unknown>;
}
