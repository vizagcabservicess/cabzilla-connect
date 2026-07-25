import { query, queryOne } from '../db/pool.js';
import type { NotificationType } from '../types/index.js';
import { newId } from '../utils/helpers.js';
import { realtimeHub } from '../websocket/hub.js';

export async function createNotification(input: {
  siteId: string;
  type: NotificationType;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<string> {
  const id = newId();
  await query(
    `INSERT INTO va_notifications (id, site_id, type, title, body, entity_type, entity_id, meta)
     VALUES (:id, :siteId, :type, :title, :body, :entityType, :entityId, :meta)`,
    {
      id,
      siteId: input.siteId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  );

  realtimeHub.broadcastToDashboard(input.siteId, {
    type: 'notification',
    payload: {
      id,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType,
      entityId: input.entityId,
      meta: input.meta,
      createdAt: new Date().toISOString(),
    },
  });

  return id;
}

export async function listNotifications(siteId: string, limit = 50) {
  return query(
    `SELECT * FROM va_notifications WHERE site_id = :siteId ORDER BY created_at DESC LIMIT :limit`,
    { siteId, limit },
  );
}

export async function markNotificationRead(id: string, siteId: string) {
  await query(`UPDATE va_notifications SET is_read = 1 WHERE id = :id AND site_id = :siteId`, {
    id,
    siteId,
  });
}

export async function unreadCount(siteId: string): Promise<number> {
  const row = await queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM va_notifications WHERE site_id = :siteId AND is_read = 0`,
    { siteId },
  );
  return Number(row?.c || 0);
}
