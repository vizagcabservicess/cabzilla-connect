import { query } from '../db/pool.js';
import type { DeviceType, HeatmapType, IncomingEvent } from '../types/index.js';
import { clamp, pathFromUrl } from '../utils/helpers.js';

const GRID = 40;

function bucket(value: number, max: number): number {
  if (max <= 0) return 0;
  return clamp(Math.floor((value / max) * GRID), 0, GRID - 1);
}

function dayFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export async function upsertHeatmapFromEvents(siteId: string, events: IncomingEvent[]): Promise<void> {
  for (const ev of events) {
    const path = ev.pagePath || pathFromUrl(ev.pageUrl);
    if (!path) continue;

    const day = dayFromIso(ev.occurredAt);
    const campaign = typeof ev.meta?.campaign === 'string' ? ev.meta.campaign : null;
    const device = (ev.meta?.deviceType as DeviceType) || 'unknown';
    const vw = ev.viewportW || 1920;
    const vh = ev.viewportH || 1080;

    if ((ev.type === 'click' || ev.type === 'double_click' || ev.type === 'right_click') && ev.x != null && ev.y != null) {
      await bumpHeat({
        siteId,
        path,
        device,
        type: 'click',
        bx: bucket(ev.x, vw),
        by: bucket(ev.y, Math.max(vh, ev.y)),
        day,
        campaign,
      });
    }

    if (ev.type === 'mouse_move' && ev.x != null && ev.y != null) {
      // Sample moves lightly — only even buckets to reduce write volume
      const bx = bucket(ev.x, vw);
      const by = bucket(ev.y, Math.max(vh, ev.y));
      if ((bx + by) % 2 === 0) {
        await bumpHeat({
          siteId,
          path,
          device,
          type: 'move',
          bx,
          by,
          day,
          campaign,
        });
      }
    }

    if (ev.type === 'scroll' && ev.scrollDepth != null) {
      const by = clamp(Math.floor((ev.scrollDepth / 100) * GRID), 0, GRID - 1);
      await bumpHeat({
        siteId,
        path,
        device,
        type: 'scroll',
        bx: 0,
        by,
        day,
        campaign,
      });
    }
  }
}

async function bumpHeat(p: {
  siteId: string;
  path: string;
  device: DeviceType;
  type: HeatmapType;
  bx: number;
  by: number;
  day: string;
  campaign: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO va_heatmap_points (
      site_id, page_path, device_type, heatmap_type, bucket_x, bucket_y, intensity, day_date, campaign
    ) VALUES (
      :siteId, :path, :device, :type, :bx, :by, 1, :day, :campaign
    ) ON DUPLICATE KEY UPDATE intensity = intensity + 1`,
    {
      siteId: p.siteId,
      path: p.path,
      device: p.device,
      type: p.type,
      bx: p.bx,
      by: p.by,
      day: p.day,
      campaign: p.campaign,
    },
  );
}

export async function getHeatmap(params: {
  siteId: string;
  pagePath: string;
  type: HeatmapType;
  device?: DeviceType | 'all';
  from: string;
  to: string;
  campaign?: string | null;
}) {
  const rows = await query<
    Array<{
      bucket_x: number;
      bucket_y: number;
      intensity: number;
      device_type: DeviceType;
    }>
  >(
    `SELECT bucket_x, bucket_y, SUM(intensity) AS intensity, device_type
     FROM va_heatmap_points
     WHERE site_id = :siteId
       AND page_path = :pagePath
       AND heatmap_type = :type
       AND day_date BETWEEN :from AND :to
       AND (:device = 'all' OR device_type = :device)
       AND (:campaign IS NULL OR campaign = :campaign)
     GROUP BY bucket_x, bucket_y, device_type`,
    {
      siteId: params.siteId,
      pagePath: params.pagePath,
      type: params.type,
      from: params.from,
      to: params.to,
      device: params.device || 'all',
      campaign: params.campaign ?? null,
    },
  );

  return {
    grid: GRID,
    points: rows.map((r) => ({
      x: r.bucket_x,
      y: r.bucket_y,
      intensity: Number(r.intensity),
      deviceType: r.device_type,
    })),
  };
}
