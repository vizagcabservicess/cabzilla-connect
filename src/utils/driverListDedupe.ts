/** Last 10 digits for Indian mobile matching across formatting variants. */
export function normalizePhoneKey(phone: string | undefined | null): string {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d;
}

/**
 * Collapse duplicate driver rows (same phone or email, different `id`) — keeps the lowest `id`.
 */
export function dedupeDriversByPhoneOrEmail<
  T extends { id: number | string; phone?: string; email?: string },
>(rows: T[]): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const phoneKey = normalizePhoneKey(row.phone);
    const emailKey = String(row.email ?? '')
      .trim()
      .toLowerCase();
    const key =
      phoneKey.length >= 10 ? `p:${phoneKey}` : emailKey.length > 0 ? `e:${emailKey}` : `id:${row.id}`;
    const prev = best.get(key);
    if (!prev || Number(row.id) < Number(prev.id)) {
      best.set(key, row);
    }
  }
  return Array.from(best.values()).sort((a, b) => Number(a.id) - Number(b.id));
}
