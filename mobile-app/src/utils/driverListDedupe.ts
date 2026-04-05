export function normalizePhoneKey(phone: string | undefined | null): string {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d;
}

export function dedupeDriversByPhoneOrEmail<T extends { id: number; phone?: string; email?: string }>(
  rows: T[]
): T[] {
  const best = new Map<string, T>();
  for (const row of rows) {
    const phoneKey = normalizePhoneKey(row.phone);
    const emailKey = String(row.email ?? '')
      .trim()
      .toLowerCase();
    const key =
      phoneKey.length >= 10 ? `p:${phoneKey}` : emailKey.length > 0 ? `e:${emailKey}` : `id:${row.id}`;
    const prev = best.get(key);
    if (!prev || row.id < prev.id) {
      best.set(key, row);
    }
  }
  return Array.from(best.values()).sort((a, b) => a.id - b.id);
}
