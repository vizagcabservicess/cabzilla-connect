import { query, queryOne } from '../db/pool.js';
import { newId } from '../utils/helpers.js';

export interface FunnelStep {
  name: string;
  event: string;
  match?: {
    path?: string;
    pathContains?: string;
    name?: string;
  };
}

export interface FunnelRow {
  id: string;
  site_id: string;
  name: string;
  steps: FunnelStep[] | string;
  is_default: number;
}

function parseSteps(steps: FunnelStep[] | string): FunnelStep[] {
  if (Array.isArray(steps)) return steps;
  try {
    const parsed = JSON.parse(steps) as FunnelStep[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listFunnels(siteId: string) {
  const rows = await query<FunnelRow[]>(
    `SELECT id, site_id, name, steps, is_default FROM va_funnels WHERE site_id = :siteId ORDER BY is_default DESC, name ASC`,
    { siteId },
  );
  return rows.map((r) => ({ ...r, steps: parseSteps(r.steps) }));
}

export async function getFunnel(id: string, siteId: string) {
  const row = await queryOne<FunnelRow>(
    `SELECT id, site_id, name, steps, is_default FROM va_funnels WHERE id = :id AND site_id = :siteId`,
    { id, siteId },
  );
  if (!row) return null;
  return { ...row, steps: parseSteps(row.steps) };
}

export async function createFunnel(input: {
  siteId: string;
  name: string;
  steps: FunnelStep[];
  isDefault?: boolean;
}) {
  const id = newId();
  if (input.isDefault) {
    await query(`UPDATE va_funnels SET is_default = 0 WHERE site_id = :siteId`, { siteId: input.siteId });
  }
  await query(
    `INSERT INTO va_funnels (id, site_id, name, steps, is_default)
     VALUES (:id, :siteId, :name, :steps, :isDefault)`,
    {
      id,
      siteId: input.siteId,
      name: input.name,
      steps: JSON.stringify(input.steps),
      isDefault: input.isDefault ? 1 : 0,
    },
  );
  return getFunnel(id, input.siteId);
}

export async function updateFunnel(
  id: string,
  siteId: string,
  patch: { name?: string; steps?: FunnelStep[]; isDefault?: boolean },
) {
  const existing = await getFunnel(id, siteId);
  if (!existing) return null;
  if (patch.isDefault) {
    await query(`UPDATE va_funnels SET is_default = 0 WHERE site_id = :siteId`, { siteId });
  }
  await query(
    `UPDATE va_funnels SET
      name = COALESCE(:name, name),
      steps = COALESCE(:steps, steps),
      is_default = COALESCE(:isDefault, is_default)
    WHERE id = :id AND site_id = :siteId`,
    {
      id,
      siteId,
      name: patch.name ?? null,
      steps: patch.steps ? JSON.stringify(patch.steps) : null,
      isDefault: typeof patch.isDefault === 'boolean' ? (patch.isDefault ? 1 : 0) : null,
    },
  );
  return getFunnel(id, siteId);
}

export async function deleteFunnel(id: string, siteId: string) {
  await query(`DELETE FROM va_funnels WHERE id = :id AND site_id = :siteId`, { id, siteId });
}

function stepMatchesEvent(
  step: FunnelStep,
  ev: { event_type: string; event_name: string | null; page_path: string | null },
): boolean {
  if (ev.event_type !== step.event) return false;
  const match = step.match;
  if (!match) return true;
  if (match.name && ev.event_name !== match.name) return false;
  if (match.path && ev.page_path !== match.path) return false;
  if (match.pathContains && !(ev.page_path || '').includes(match.pathContains)) return false;
  return true;
}

export interface FunnelAnalyticsResult {
  funnelId: string;
  name: string;
  from: string;
  to: string;
  steps: Array<{
    name: string;
    event: string;
    visitors: number;
    sessions: number;
    conversionFromPrevious: number;
    dropoffFromPrevious: number;
    avgTimeFromPreviousMs: number | null;
  }>;
  overallConversion: number;
}

export async function analyzeFunnel(params: {
  siteId: string;
  funnelId: string;
  from: string;
  to: string;
}): Promise<FunnelAnalyticsResult | null> {
  const funnel = await getFunnel(params.funnelId, params.siteId);
  if (!funnel) return null;

  const steps = funnel.steps;
  const events = await query<
    Array<{
      session_id: string;
      visitor_id: string;
      event_type: string;
      event_name: string | null;
      page_path: string | null;
      occurred_at: Date | string;
    }>
  >(
    `SELECT session_id, visitor_id, event_type, event_name, page_path, occurred_at
     FROM va_events
     WHERE site_id = :siteId
       AND occurred_at BETWEEN :from AND :to
     ORDER BY session_id, occurred_at ASC`,
    {
      siteId: params.siteId,
      from: `${params.from} 00:00:00`,
      to: `${params.to} 23:59:59.999`,
    },
  );

  type SessionProgress = {
    visitorId: string;
    stepTimes: Array<number | null>;
  };

  const bySession = new Map<string, SessionProgress>();

  for (const ev of events) {
    let prog = bySession.get(ev.session_id);
    if (!prog) {
      prog = { visitorId: ev.visitor_id, stepTimes: steps.map(() => null) };
      bySession.set(ev.session_id, prog);
    }
    const t = new Date(ev.occurred_at).getTime();
    for (let i = 0; i < steps.length; i++) {
      if (prog.stepTimes[i] != null) continue;
      const prevOk = i === 0 || prog.stepTimes[i - 1] != null;
      if (!prevOk) break;
      if (stepMatchesEvent(steps[i]!, ev)) {
        prog.stepTimes[i] = t;
      }
    }
  }

  const stepStats = steps.map((step, index) => {
    let sessions = 0;
    const visitors = new Set<string>();
    const deltas: number[] = [];

    for (const prog of bySession.values()) {
      const t = prog.stepTimes[index];
      if (t == null) continue;
      sessions += 1;
      visitors.add(prog.visitorId);
      if (index > 0) {
        const prev = prog.stepTimes[index - 1];
        if (prev != null && t >= prev) deltas.push(t - prev);
      }
    }

    const prevSessions =
      index === 0
        ? sessions
        : [...bySession.values()].filter((p) => p.stepTimes[index - 1] != null).length;

    const conversionFromPrevious = prevSessions > 0 ? sessions / prevSessions : 0;
    const dropoffFromPrevious = prevSessions > 0 ? 1 - conversionFromPrevious : 0;
    const avgTimeFromPreviousMs =
      deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : null;

    return {
      name: step.name,
      event: step.event,
      visitors: visitors.size,
      sessions,
      conversionFromPrevious,
      dropoffFromPrevious,
      avgTimeFromPreviousMs,
    };
  });

  const first = stepStats[0]?.sessions || 0;
  const last = stepStats[stepStats.length - 1]?.sessions || 0;

  return {
    funnelId: funnel.id,
    name: funnel.name,
    from: params.from,
    to: params.to,
    steps: stepStats,
    overallConversion: first > 0 ? last / first : 0,
  };
}
