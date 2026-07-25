import { query, queryOne } from '../db/pool.js';
import type { ChatMessageType, ChatSenderType, ConversationStatus, OperatorStatus } from '../types/index.js';
import { newId, toMysqlDateTime } from '../utils/helpers.js';
import { presignGet, presignPut } from './s3.js';
import { createNotification } from './notifications.js';
import { realtimeHub } from '../websocket/hub.js';
import {
  generateAssistantReply,
  getOrCreateLead,
  markLeadTransferred,
  siteHasAiEnabled,
} from '../ai/assistant.js';

export interface ConversationRow {
  id: string;
  site_id: string;
  visitor_id: string;
  session_id: string | null;
  department_id: string | null;
  operator_id: string | null;
  status: ConversationStatus;
  subject: string | null;
  source: string | null;
  vehicle_interest: string | null;
  campaign: string | null;
  location_city: string | null;
  unread_visitor: number;
  unread_operator: number;
  ai_handled: number;
  transferred_from_ai: number;
  last_message_at: Date | string | null;
  closed_at: Date | string | null;
  created_at: Date | string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_type: ChatSenderType;
  sender_id: string | null;
  message_type: ChatMessageType;
  body: string | null;
  attachment_s3_key: string | null;
  attachment_mime: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  is_seen: number;
  seen_at: Date | string | null;
  meta: string | Record<string, unknown> | null;
  created_at: Date | string;
}

async function getSiteFlags(siteId: string) {
  return queryOne<{ chat_enabled: number; ai_chat_enabled: number }>(
    `SELECT chat_enabled, ai_chat_enabled FROM va_sites WHERE id = :siteId`,
    { siteId },
  );
}

export async function getWidgetData(siteId: string) {
  const site = await queryOne<{
    chat_enabled: number;
    ai_chat_enabled: number;
    name: string;
  }>(`SELECT chat_enabled, ai_chat_enabled, name FROM va_sites WHERE id = :siteId`, { siteId });

  const departments = await listDepartments(siteId);
  const onlineOps = await countOnlineOperatorsDb(siteId);
  const wsOnline = realtimeHub.countOnlineOperators(siteId);
  const operatorsOnline = Math.max(onlineOps, wsOnline);

  return {
    enabled: Boolean(site?.chat_enabled ?? 1),
    // Heuristic AI fallback works even without OpenAI — keep assistant on by default
    aiEnabled: site?.ai_chat_enabled == null ? true : Boolean(site.ai_chat_enabled),
    siteName: site?.name || 'Vizag Taxi Hub',
    operatorsOnline,
    departments,
    greeting:
      'Good day! I am VTH AI, your Vizag Taxi Hub assistant. I can help with airport transfers, local packages, outstation trips, and tours.',
    offlineMessage: 'We are currently offline. Leave your details and we will get back to you soon.',
    phone: '+91 99663 63662',
  };
}

export async function listDepartments(siteId: string) {
  return query(
    `SELECT id, name, description, is_active, sort_order
     FROM va_chat_departments
     WHERE site_id = :siteId AND is_active = 1
     ORDER BY sort_order ASC, name ASC`,
    { siteId },
  );
}

export async function countOnlineOperatorsDb(siteId: string): Promise<number> {
  const row = await queryOne<{ c: number }>(
    `SELECT COUNT(*) AS c FROM va_chat_operators
     WHERE site_id = :siteId AND status = 'online'
       AND (last_seen_at IS NULL OR last_seen_at >= UTC_TIMESTAMP() - INTERVAL 2 MINUTE)`,
    { siteId },
  );
  return Number(row?.c || 0);
}

export async function setOperatorStatus(operatorId: string, status: OperatorStatus): Promise<void> {
  await query(
    `UPDATE va_chat_operators SET status = :status, last_seen_at = UTC_TIMESTAMP() WHERE id = :id`,
    { id: operatorId, status },
  );
  const op = await queryOne<{ site_id: string }>(`SELECT site_id FROM va_chat_operators WHERE id = :id`, {
    id: operatorId,
  });
  if (op) {
    realtimeHub.broadcastToOperators(op.site_id, {
      type: 'operator.status',
      payload: { operatorId, status },
    });
    if (status === 'online') {
      await transferAiConversationsWhenOperatorOnline(op.site_id, operatorId);
    }
  }
}

export async function findOpenConversation(siteId: string, visitorId: string) {
  return queryOne<ConversationRow>(
    `SELECT * FROM va_chat_conversations
     WHERE site_id = :siteId AND visitor_id = :visitorId
       AND status IN ('open','pending','assigned','offline')
     ORDER BY last_message_at DESC, created_at DESC
     LIMIT 1`,
    { siteId, visitorId },
  );
}

export async function getConversation(id: string, siteId?: string) {
  if (siteId) {
    return queryOne<ConversationRow>(
      `SELECT * FROM va_chat_conversations WHERE id = :id AND site_id = :siteId`,
      { id, siteId },
    );
  }
  return queryOne<ConversationRow>(`SELECT * FROM va_chat_conversations WHERE id = :id`, { id });
}

export async function createConversation(input: {
  siteId: string;
  visitorId: string;
  sessionId?: string | null;
  departmentId?: string | null;
  subject?: string | null;
  source?: string | null;
  vehicleInterest?: string | null;
  campaign?: string | null;
  locationCity?: string | null;
}): Promise<ConversationRow> {
  const flags = await getSiteFlags(input.siteId);
  if (flags && !flags.chat_enabled) {
    throw new Error('Chat is disabled for this site');
  }

  const existing = await findOpenConversation(input.siteId, input.visitorId);
  if (existing) return existing;

  const operatorsOnline =
    realtimeHub.hasOnlineOperators(input.siteId) || (await countOnlineOperatorsDb(input.siteId)) > 0;
  const aiOn = flags ? siteHasAiEnabled(flags) : true;
  // AI-first: always open with VTH AI when enabled. Operators still get notified and can claim.
  const status: ConversationStatus = aiOn ? 'pending' : operatorsOnline ? 'open' : 'offline';

  const id = newId();
  await query(
    `INSERT INTO va_chat_conversations (
      id, site_id, visitor_id, session_id, department_id, status, subject, source,
      vehicle_interest, campaign, location_city, ai_handled, last_message_at
    ) VALUES (
      :id, :siteId, :visitorId, :sessionId, :departmentId, :status, :subject, :source,
      :vehicleInterest, :campaign, :locationCity, :aiHandled, UTC_TIMESTAMP()
    )`,
    {
      id,
      siteId: input.siteId,
      visitorId: input.visitorId,
      sessionId: input.sessionId ?? null,
      departmentId: input.departmentId ?? null,
      status,
      subject: input.subject ?? null,
      source: input.source ?? 'widget',
      vehicleInterest: input.vehicleInterest ?? null,
      campaign: input.campaign ?? null,
      locationCity: input.locationCity ?? null,
      aiHandled: aiOn ? 1 : 0,
    },
  );

  await createNotification({
    siteId: input.siteId,
    type: 'new_chat',
    title: 'New chat',
    body: aiOn
      ? 'Visitor chatting with VTH AI'
      : operatorsOnline
        ? 'Visitor started a conversation'
        : 'Visitor started a conversation (offline)',
    entityType: 'conversation',
    entityId: id,
    meta: { visitorId: input.visitorId, status },
  });

  const conv = (await getConversation(id))!;
  realtimeHub.broadcastToOperators(input.siteId, {
    type: 'chat.conversation.created',
    payload: conv,
  });

  if (aiOn) {
    await insertMessage({
      conversationId: id,
      senderType: 'ai',
      messageType: 'text',
      body: 'Hi! I am VTH AI, your Vizag Taxi Hub assistant. I can help with airport transfers, local packages, outstation trips, Tempo Travellers, Araku tours, and more. How can I help you today?',
      skipAi: true,
    });
  }

  return conv;
}

async function insertMessage(input: {
  conversationId: string;
  senderType: ChatSenderType;
  senderId?: string | null;
  messageType?: ChatMessageType;
  body?: string | null;
  attachmentS3Key?: string | null;
  attachmentMime?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  meta?: Record<string, unknown> | null;
  skipAi?: boolean;
}): Promise<MessageRow> {
  const conv = await getConversation(input.conversationId);
  if (!conv) throw new Error('Conversation not found');

  const id = newId();
  await query(
    `INSERT INTO va_chat_messages (
      id, conversation_id, sender_type, sender_id, message_type, body,
      attachment_s3_key, attachment_mime, attachment_name, attachment_size, meta
    ) VALUES (
      :id, :conversationId, :senderType, :senderId, :messageType, :body,
      :attachmentS3Key, :attachmentMime, :attachmentName, :attachmentSize, :meta
    )`,
    {
      id,
      conversationId: input.conversationId,
      senderType: input.senderType,
      senderId: input.senderId ?? null,
      messageType: input.messageType ?? 'text',
      body: input.body ?? null,
      attachmentS3Key: input.attachmentS3Key ?? null,
      attachmentMime: input.attachmentMime ?? null,
      attachmentName: input.attachmentName ?? null,
      attachmentSize: input.attachmentSize ?? null,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  );

  const unreadVisitorInc = input.senderType === 'visitor' ? 0 : 1;
  const unreadOperatorInc = input.senderType === 'visitor' ? 1 : 0;

  await query(
    `UPDATE va_chat_conversations SET
      last_message_at = UTC_TIMESTAMP(),
      unread_visitor = unread_visitor + :uv,
      unread_operator = unread_operator + :uo,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = :id`,
    { id: input.conversationId, uv: unreadVisitorInc, uo: unreadOperatorInc },
  );

  const message = (await queryOne<MessageRow>(`SELECT * FROM va_chat_messages WHERE id = :id`, { id }))!;
  const enriched = await enrichMessage(message);

  const envelope = {
    type: 'chat.message',
    payload: { conversationId: input.conversationId, message: enriched },
  };
  realtimeHub.sendToConversation(input.conversationId, envelope);
  realtimeHub.broadcastToOperators(conv.site_id, envelope);
  realtimeHub.sendToVisitor(conv.site_id, conv.visitor_id, envelope);

  if (input.senderType === 'visitor' && !input.skipAi) {
    await maybeAiReply(conv, input.body || '');
  }

  return message;
}

async function enrichMessage(message: MessageRow) {
  let attachmentUrl: string | null = null;
  if (message.attachment_s3_key) {
    attachmentUrl = await presignGet(message.attachment_s3_key, 3600);
  }
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderType: message.sender_type,
    senderId: message.sender_id,
    messageType: message.message_type,
    body: message.body,
    attachmentUrl,
    attachmentMime: message.attachment_mime,
    attachmentName: message.attachment_name,
    attachmentSize: message.attachment_size,
    isSeen: Boolean(message.is_seen),
    seenAt: message.seen_at,
    meta:
      typeof message.meta === 'string'
        ? (JSON.parse(message.meta) as Record<string, unknown>)
        : message.meta,
    createdAt: message.created_at,
  };
}

async function maybeAiReply(conv: ConversationRow, visitorText: string): Promise<void> {
  const flags = await getSiteFlags(conv.site_id);
  if (!flags || !siteHasAiEnabled(flags)) return;

  // AI-first always. Only stop after an operator has claimed the chat.
  if (conv.operator_id && conv.status === 'assigned') return;

  const operatorsOnline =
    realtimeHub.hasOnlineOperators(conv.site_id) || (await countOnlineOperatorsDb(conv.site_id)) > 0;

  const historyRows = await query<MessageRow[]>(
    `SELECT * FROM va_chat_messages
     WHERE conversation_id = :id AND message_type = 'text' AND body IS NOT NULL
     ORDER BY created_at DESC LIMIT 20`,
    { id: conv.id },
  );

  const history = [...historyRows].reverse().map((m) => ({
    role: (m.sender_type === 'visitor' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.body || '',
  }));

  if (!conv.ai_handled) {
    await query(`UPDATE va_chat_conversations SET ai_handled = 1, status = 'pending' WHERE id = :id`, {
      id: conv.id,
    });
  }

  const result = await generateAssistantReply({
    siteId: conv.site_id,
    conversationId: conv.id,
    visitorId: conv.visitor_id,
    visitorMessage: visitorText,
    history,
  });

  // Avoid duplicate identical AI bubbles (double-send / race)
  const lastAi = historyRows.find((m) => m.sender_type === 'ai' || m.sender_type === 'system');
  if (lastAi && lastAi.body === result.reply) {
    return;
  }

  await insertMessage({
    conversationId: conv.id,
    senderType: 'ai',
    messageType: 'text',
    body: result.reply,
    meta: { leadComplete: result.leadComplete, suggestTransfer: result.suggestTransfer },
    skipAi: true,
  });

  if (result.lead.customerName || result.lead.phone) {
    await query(
      `UPDATE va_visitors SET
        name = COALESCE(:name, name),
        phone = COALESCE(:phone, phone)
      WHERE id = :id`,
      {
        id: conv.visitor_id,
        name: result.lead.customerName,
        phone: result.lead.phone,
      },
    );
  }

  if (result.suggestTransfer && operatorsOnline) {
    await transferConversationToAvailableOperator(conv.id, conv.site_id);
  }
}

export async function sendVisitorMessage(input: {
  conversationId: string;
  visitorId: string;
  body?: string | null;
  messageType?: ChatMessageType;
  attachmentS3Key?: string | null;
  attachmentMime?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  meta?: Record<string, unknown> | null;
}) {
  const conv = await getConversation(input.conversationId);
  if (!conv || conv.visitor_id !== input.visitorId) throw new Error('Conversation not found');
  return insertMessage({
    conversationId: input.conversationId,
    senderType: 'visitor',
    senderId: input.visitorId,
    messageType: input.messageType ?? 'text',
    body: input.body,
    attachmentS3Key: input.attachmentS3Key,
    attachmentMime: input.attachmentMime,
    attachmentName: input.attachmentName,
    attachmentSize: input.attachmentSize,
    meta: input.meta,
  });
}

export async function sendOperatorMessage(input: {
  conversationId: string;
  operatorId: string;
  body?: string | null;
  messageType?: ChatMessageType;
  attachmentS3Key?: string | null;
  attachmentMime?: string | null;
  attachmentName?: string | null;
  attachmentSize?: number | null;
  meta?: Record<string, unknown> | null;
}) {
  const conv = await getConversation(input.conversationId);
  if (!conv) throw new Error('Conversation not found');

  if (!conv.operator_id) {
    await assignOperator(input.conversationId, input.operatorId);
  }

  return insertMessage({
    conversationId: input.conversationId,
    senderType: 'operator',
    senderId: input.operatorId,
    messageType: input.messageType ?? 'text',
    body: input.body,
    attachmentS3Key: input.attachmentS3Key,
    attachmentMime: input.attachmentMime,
    attachmentName: input.attachmentName,
    attachmentSize: input.attachmentSize,
    meta: input.meta,
  });
}

export async function listMessages(conversationId: string, limit = 100, before?: string) {
  const rows = await query<MessageRow[]>(
    `SELECT * FROM va_chat_messages
     WHERE conversation_id = :conversationId
       AND (:before IS NULL OR created_at < :before)
     ORDER BY created_at DESC
     LIMIT :limit`,
    { conversationId, before: before ?? null, limit },
  );
  const enriched = await Promise.all([...rows].reverse().map(enrichMessage));
  return enriched;
}

export async function markSeen(input: {
  conversationId: string;
  viewer: 'visitor' | 'operator';
  upToMessageId?: string;
}) {
  const now = toMysqlDateTime();
  if (input.upToMessageId) {
    await query(
      `UPDATE va_chat_messages SET is_seen = 1, seen_at = :now
       WHERE conversation_id = :conversationId
         AND id = :messageId
         AND is_seen = 0`,
      { conversationId: input.conversationId, messageId: input.upToMessageId, now },
    );
  } else {
    const opposite: ChatSenderType = input.viewer === 'visitor' ? 'operator' : 'visitor';
    // Also mark AI as seen by visitor
    await query(
      `UPDATE va_chat_messages SET is_seen = 1, seen_at = :now
       WHERE conversation_id = :conversationId
         AND is_seen = 0
         AND (
           sender_type = :opposite
           OR (:viewer = 'visitor' AND sender_type IN ('operator','ai','system'))
           OR (:viewer = 'operator' AND sender_type = 'visitor')
         )`,
      {
        conversationId: input.conversationId,
        now,
        opposite,
        viewer: input.viewer,
      },
    );
  }

  if (input.viewer === 'visitor') {
    await query(`UPDATE va_chat_conversations SET unread_visitor = 0 WHERE id = :id`, {
      id: input.conversationId,
    });
  } else {
    await query(`UPDATE va_chat_conversations SET unread_operator = 0 WHERE id = :id`, {
      id: input.conversationId,
    });
  }

  const envelope = {
    type: 'chat.seen',
    payload: {
      conversationId: input.conversationId,
      viewer: input.viewer,
      at: new Date().toISOString(),
    },
  };
  realtimeHub.sendToConversation(input.conversationId, envelope);
}

export function broadcastTyping(input: {
  conversationId: string;
  siteId: string;
  visitorId: string;
  who: 'visitor' | 'operator' | 'ai';
  isTyping: boolean;
  operatorId?: string;
}) {
  const envelope = {
    type: 'chat.typing',
    payload: {
      conversationId: input.conversationId,
      who: input.who,
      isTyping: input.isTyping,
      operatorId: input.operatorId,
    },
  };
  realtimeHub.sendToConversation(input.conversationId, envelope);
  if (input.who === 'visitor') {
    realtimeHub.broadcastToOperators(input.siteId, envelope);
  } else {
    realtimeHub.sendToVisitor(input.siteId, input.visitorId, envelope);
  }
}

export async function assignOperator(conversationId: string, operatorId: string) {
  const conv = await getConversation(conversationId);
  if (!conv) throw new Error('Conversation not found');

  const wasAi = Boolean(conv.ai_handled) && !conv.transferred_from_ai;

  await query(
    `UPDATE va_chat_conversations SET
      operator_id = :operatorId,
      status = 'assigned',
      transferred_from_ai = IF(ai_handled = 1, 1, transferred_from_ai),
      ai_handled = 0
    WHERE id = :id`,
    { id: conversationId, operatorId },
  );

  if (wasAi) {
    const lead = await getOrCreateLead({
      siteId: conv.site_id,
      conversationId,
      visitorId: conv.visitor_id,
    });
    await markLeadTransferred(lead.id);
    await insertMessage({
      conversationId,
      senderType: 'system',
      messageType: 'system',
      body: 'An operator has joined the conversation.',
      skipAi: true,
    });
  }

  const updated = await getConversation(conversationId);
  realtimeHub.broadcastToOperators(conv.site_id, {
    type: 'chat.assigned',
    payload: updated,
  });
  realtimeHub.sendToVisitor(conv.site_id, conv.visitor_id, {
    type: 'chat.assigned',
    payload: updated,
  });
  return updated;
}

export async function transferConversationToAvailableOperator(conversationId: string, siteId: string) {
  const op = await queryOne<{ id: string }>(
    `SELECT id FROM va_chat_operators
     WHERE site_id = :siteId AND status = 'online'
     ORDER BY last_seen_at DESC
     LIMIT 1`,
    { siteId },
  );
  if (!op) return null;
  return assignOperator(conversationId, op.id);
}

export async function transferAiConversationsWhenOperatorOnline(siteId: string, operatorId: string) {
  const rows = await query<Array<{ id: string }>>(
    `SELECT id FROM va_chat_conversations
     WHERE site_id = :siteId
       AND ai_handled = 1
       AND status IN ('open','pending','offline')
       AND (operator_id IS NULL OR operator_id = '')
     ORDER BY last_message_at ASC
     LIMIT 20`,
    { siteId },
  );

  for (const row of rows) {
    await assignOperator(row.id, operatorId);
    await insertMessage({
      conversationId: row.id,
      senderType: 'system',
      messageType: 'system',
      body: 'Connecting you to a live operator now…',
      skipAi: true,
    });
  }
}

export async function resolveConversation(conversationId: string, status: ConversationStatus = 'resolved') {
  await query(
    `UPDATE va_chat_conversations SET status = :status, closed_at = UTC_TIMESTAMP() WHERE id = :id`,
    { id: conversationId, status },
  );
  const conv = await getConversation(conversationId);
  if (conv) {
    realtimeHub.broadcastToOperators(conv.site_id, { type: 'chat.resolved', payload: conv });
    realtimeHub.sendToVisitor(conv.site_id, conv.visitor_id, { type: 'chat.resolved', payload: conv });
  }
  return conv;
}

export async function listInbox(
  siteId: string,
  opts: { status?: string; operatorId?: string; limit?: number; offset?: number } = {},
) {
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;
  return query(
    `SELECT c.*,
            v.name AS visitor_name, v.email AS visitor_email, v.phone AS visitor_phone,
            v.city AS visitor_city, v.is_returning,
            o.name AS operator_name
     FROM va_chat_conversations c
     INNER JOIN va_visitors v ON v.id = c.visitor_id
     LEFT JOIN va_chat_operators o ON o.id = c.operator_id
     WHERE c.site_id = :siteId
       AND (:status IS NULL OR c.status = :status)
       AND (:operatorId IS NULL OR c.operator_id = :operatorId)
     ORDER BY c.last_message_at DESC, c.created_at DESC
     LIMIT :limit OFFSET :offset`,
    {
      siteId,
      status: opts.status ?? null,
      operatorId: opts.operatorId ?? null,
      limit,
      offset,
    },
  );
}

export async function getUnreadBadge(siteId: string, visitorId?: string, operatorId?: string) {
  if (visitorId) {
    const row = await queryOne<{ c: number }>(
      `SELECT COALESCE(SUM(unread_visitor), 0) AS c
       FROM va_chat_conversations
       WHERE site_id = :siteId AND visitor_id = :visitorId AND status NOT IN ('resolved','missed')`,
      { siteId, visitorId },
    );
    return { unread: Number(row?.c || 0) };
  }
  if (operatorId) {
    const row = await queryOne<{ c: number }>(
      `SELECT COALESCE(SUM(unread_operator), 0) AS c
       FROM va_chat_conversations
       WHERE site_id = :siteId
         AND (operator_id = :operatorId OR operator_id IS NULL)
         AND status IN ('open','pending','assigned','offline')`,
      { siteId, operatorId },
    );
    return { unread: Number(row?.c || 0) };
  }
  const row = await queryOne<{ c: number }>(
    `SELECT COALESCE(SUM(unread_operator), 0) AS c
     FROM va_chat_conversations
     WHERE site_id = :siteId AND status IN ('open','pending','assigned','offline')`,
    { siteId },
  );
  return { unread: Number(row?.c || 0) };
}

export async function getVisitorInfo(visitorId: string, siteId: string) {
  const visitor = await queryOne(`SELECT * FROM va_visitors WHERE id = :id AND site_id = :siteId`, {
    id: visitorId,
    siteId,
  });
  if (!visitor) return null;

  const notes = await listNotes(visitorId);
  const tags = await listVisitorTags(visitorId);
  const conversations = await query(
    `SELECT id, status, last_message_at, created_at, ai_handled, operator_id
     FROM va_chat_conversations WHERE visitor_id = :visitorId ORDER BY created_at DESC LIMIT 20`,
    { visitorId },
  );
  const sessions = await query(
    `SELECT id, started_at, ended_at, landing_page, utm_campaign, device_type, city
     FROM va_sessions WHERE visitor_id = :visitorId ORDER BY started_at DESC LIMIT 10`,
    { visitorId },
  );

  return { visitor, notes, tags, conversations, sessions };
}

export async function createUploadUrl(input: {
  siteId: string;
  conversationId: string;
  fileName: string;
  contentType: string;
  size?: number;
}) {
  const key = `chat/${input.siteId}/${input.conversationId}/${newId()}-${input.fileName.replace(/[^\w.\-]+/g, '_')}`;
  const uploadUrl = await presignPut(key, input.contentType, 900);
  return {
    uploadUrl,
    s3Key: key,
    contentType: input.contentType,
    expiresIn: 900,
    maxSize: input.size ?? null,
  };
}

export async function listCannedReplies(siteId: string, departmentId?: string) {
  return query(
    `SELECT * FROM va_chat_canned_replies
     WHERE site_id = :siteId
       AND (:departmentId IS NULL OR department_id IS NULL OR department_id = :departmentId)
     ORDER BY title ASC`,
    { siteId, departmentId: departmentId ?? null },
  );
}

export async function createCannedReply(input: {
  siteId: string;
  title: string;
  body: string;
  shortcut?: string | null;
  departmentId?: string | null;
}) {
  const id = newId();
  await query(
    `INSERT INTO va_chat_canned_replies (id, site_id, department_id, title, body, shortcut)
     VALUES (:id, :siteId, :departmentId, :title, :body, :shortcut)`,
    {
      id,
      siteId: input.siteId,
      departmentId: input.departmentId ?? null,
      title: input.title,
      body: input.body,
      shortcut: input.shortcut ?? null,
    },
  );
  return queryOne(`SELECT * FROM va_chat_canned_replies WHERE id = :id`, { id });
}

export async function deleteCannedReply(id: string, siteId: string) {
  await query(`DELETE FROM va_chat_canned_replies WHERE id = :id AND site_id = :siteId`, { id, siteId });
}

export async function addNote(visitorId: string, note: string, operatorId?: string) {
  const id = newId();
  await query(
    `INSERT INTO va_visitor_notes (id, visitor_id, operator_id, note)
     VALUES (:id, :visitorId, :operatorId, :note)`,
    { id, visitorId, operatorId: operatorId ?? null, note },
  );
  return queryOne(`SELECT * FROM va_visitor_notes WHERE id = :id`, { id });
}

export async function listNotes(visitorId: string) {
  return query(
    `SELECT n.*, o.name AS operator_name
     FROM va_visitor_notes n
     LEFT JOIN va_chat_operators o ON o.id = n.operator_id
     WHERE n.visitor_id = :visitorId
     ORDER BY n.created_at DESC`,
    { visitorId },
  );
}

export async function ensureTag(siteId: string, name: string, color?: string) {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM va_visitor_tags WHERE site_id = :siteId AND name = :name`,
    { siteId, name },
  );
  if (existing) return existing.id;
  const id = newId();
  await query(
    `INSERT INTO va_visitor_tags (id, site_id, name, color) VALUES (:id, :siteId, :name, :color)`,
    { id, siteId, name, color: color || '#2563eb' },
  );
  return id;
}

export async function tagVisitor(siteId: string, visitorId: string, tagName: string, color?: string) {
  const tagId = await ensureTag(siteId, tagName, color);
  await query(
    `INSERT IGNORE INTO va_visitor_tag_map (visitor_id, tag_id) VALUES (:visitorId, :tagId)`,
    { visitorId, tagId },
  );
  return listVisitorTags(visitorId);
}

export async function untagVisitor(visitorId: string, tagId: string) {
  await query(`DELETE FROM va_visitor_tag_map WHERE visitor_id = :visitorId AND tag_id = :tagId`, {
    visitorId,
    tagId,
  });
}

export async function listVisitorTags(visitorId: string) {
  return query(
    `SELECT t.* FROM va_visitor_tags t
     INNER JOIN va_visitor_tag_map m ON m.tag_id = t.id
     WHERE m.visitor_id = :visitorId
     ORDER BY t.name ASC`,
    { visitorId },
  );
}

export async function listSiteTags(siteId: string) {
  return query(`SELECT * FROM va_visitor_tags WHERE site_id = :siteId ORDER BY name ASC`, { siteId });
}

export async function submitOfflineForm(input: {
  siteId: string;
  visitorId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  message: string;
  pageUrl?: string | null;
}) {
  const id = newId();
  await query(
    `INSERT INTO va_offline_forms (id, site_id, visitor_id, name, email, phone, message, page_url)
     VALUES (:id, :siteId, :visitorId, :name, :email, :phone, :message, :pageUrl)`,
    {
      id,
      siteId: input.siteId,
      visitorId: input.visitorId ?? null,
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      message: input.message,
      pageUrl: input.pageUrl ?? null,
    },
  );

  if (input.visitorId) {
    await query(
      `UPDATE va_visitors SET
        name = COALESCE(:name, name),
        email = COALESCE(:email, email),
        phone = COALESCE(:phone, phone)
      WHERE id = :id`,
      {
        id: input.visitorId,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
      },
    );
  }

  await createNotification({
    siteId: input.siteId,
    type: 'missed_chat',
    title: 'Offline form submitted',
    body: `${input.name}: ${input.message.slice(0, 120)}`,
    entityType: 'offline_form',
    entityId: id,
  });

  return queryOne(`SELECT * FROM va_offline_forms WHERE id = :id`, { id });
}

export async function listOfflineForms(siteId: string, limit = 50) {
  return query(
    `SELECT * FROM va_offline_forms WHERE site_id = :siteId ORDER BY created_at DESC LIMIT :limit`,
    { siteId, limit },
  );
}

export async function exportConversation(conversationId: string, siteId: string) {
  const conv = await getConversation(conversationId, siteId);
  if (!conv) return null;
  const messages = await listMessages(conversationId, 5000);
  const visitor = await getVisitorInfo(conv.visitor_id, siteId);
  return {
    exportedAt: new Date().toISOString(),
    conversation: conv,
    visitor,
    messages,
  };
}

export async function updateVisitorContact(
  visitorId: string,
  siteId: string,
  patch: { name?: string; email?: string; phone?: string },
) {
  await query(
    `UPDATE va_visitors SET
      name = COALESCE(:name, name),
      email = COALESCE(:email, email),
      phone = COALESCE(:phone, phone)
    WHERE id = :id AND site_id = :siteId`,
    {
      id: visitorId,
      siteId,
      name: patch.name ?? null,
      email: patch.email ?? null,
      phone: patch.phone ?? null,
    },
  );
  return queryOne(`SELECT * FROM va_visitors WHERE id = :id`, { id: visitorId });
}

export interface OperatorRow {
  id: string;
  site_id: string;
  user_id: number | null;
  name: string;
  email: string;
  avatar_url: string | null;
  status: OperatorStatus;
  department_ids: string | null;
  last_seen_at: Date | string | null;
}

export async function findOrCreateOperator(input: {
  siteId: string;
  email: string;
  name: string;
  userId?: number | null;
}): Promise<OperatorRow | null> {
  const email = (input.email || '').trim();
  const name =
    (input.name && String(input.name).trim()) ||
    (email.includes('@') ? email.split('@')[0]! : '') ||
    'Operator';

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM va_chat_operators WHERE site_id = :siteId AND email = :email`,
    { siteId: input.siteId, email },
  );
  if (existing) {
    await query(
      `UPDATE va_chat_operators SET name = :name, user_id = COALESCE(:userId, user_id), last_seen_at = UTC_TIMESTAMP()
       WHERE id = :id`,
      { id: existing.id, name, userId: input.userId ?? null },
    );
    return queryOne<OperatorRow>(`SELECT * FROM va_chat_operators WHERE id = :id`, { id: existing.id });
  }
  const id = newId();
  await query(
    `INSERT INTO va_chat_operators (id, site_id, user_id, name, email, status, last_seen_at)
     VALUES (:id, :siteId, :userId, :name, :email, 'offline', UTC_TIMESTAMP())`,
    {
      id,
      siteId: input.siteId,
      userId: input.userId ?? null,
      name,
      email,
    },
  );
  return queryOne<OperatorRow>(`SELECT * FROM va_chat_operators WHERE id = :id`, { id });
}

export async function listOperators(siteId: string) {
  return query(
    `SELECT id, name, email, avatar_url, status, department_ids, last_seen_at
     FROM va_chat_operators WHERE site_id = :siteId ORDER BY name ASC`,
    { siteId },
  );
}
