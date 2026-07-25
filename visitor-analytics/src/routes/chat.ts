import { Router } from 'express';
import { z } from 'zod';
import {
  asyncHandler,
  requireOperator,
  requireSiteKey,
  type AuthedRequest,
} from '../middleware/auth.js';
import {
  addNote,
  assignOperator,
  broadcastTyping,
  createCannedReply,
  createConversation,
  createUploadUrl,
  deleteCannedReply,
  exportConversation,
  getConversation,
  getUnreadBadge,
  getVisitorInfo,
  getWidgetData,
  listCannedReplies,
  listDepartments,
  listInbox,
  listMessages,
  listNotes,
  listOfflineForms,
  listOperators,
  listSiteTags,
  listVisitorTags,
  markSeen,
  resolveConversation,
  sendOperatorMessage,
  sendVisitorMessage,
  submitOfflineForm,
  tagVisitor,
  untagVisitor,
  updateVisitorContact,
} from '../services/chat.js';
import type { ChatMessageType, ConversationStatus } from '../types/index.js';

const router = Router();

const messageTypeSchema = z.enum(['text', 'image', 'file', 'voice', 'emoji', 'system']);

// ---------------------------------------------------------------------------
// Public / visitor (site key)
// ---------------------------------------------------------------------------

router.get(
  '/widget',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getWidgetData(req.siteId!));
  }),
);

router.get(
  '/departments',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ departments: await listDepartments(req.siteId!) });
  }),
);

router.get(
  '/unread',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const visitorId = z.string().uuid().parse(req.query.visitorId);
    res.json(await getUnreadBadge(req.siteId!, visitorId));
  }),
);

router.post(
  '/conversations',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        visitorId: z.string().uuid(),
        sessionId: z.string().uuid().optional().nullable(),
        departmentId: z.string().uuid().optional().nullable(),
        subject: z.string().max(255).optional().nullable(),
        source: z.string().max(80).optional().nullable(),
        vehicleInterest: z.string().max(80).optional().nullable(),
        campaign: z.string().max(255).optional().nullable(),
        locationCity: z.string().max(120).optional().nullable(),
      })
      .parse(req.body);

    const conversation = await createConversation({
      siteId: req.siteId!,
      visitorId: body.visitorId,
      sessionId: body.sessionId,
      departmentId: body.departmentId,
      subject: body.subject,
      source: body.source,
      vehicleInterest: body.vehicleInterest,
      campaign: body.campaign,
      locationCity: body.locationCity,
    });
    res.status(201).json({ conversation });
  }),
);

router.get(
  '/conversations/:id',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const visitorId = z.string().uuid().parse(req.query.visitorId);
    const conversation = await getConversation(req.params.id!, req.siteId!);
    if (!conversation || conversation.visitor_id !== visitorId) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ conversation });
  }),
);

router.get(
  '/conversations/:id/messages',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const visitorId = z.string().uuid().parse(req.query.visitorId);
    const conversation = await getConversation(req.params.id!, req.siteId!);
    if (!conversation || conversation.visitor_id !== visitorId) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const before = (req.query.before as string) || undefined;
    res.json({ messages: await listMessages(req.params.id!, limit, before) });
  }),
);

router.post(
  '/conversations/:id/messages',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        visitorId: z.string().uuid(),
        body: z.string().max(8000).optional().nullable(),
        messageType: messageTypeSchema.optional(),
        attachmentS3Key: z.string().max(512).optional().nullable(),
        attachmentMime: z.string().max(120).optional().nullable(),
        attachmentName: z.string().max(255).optional().nullable(),
        attachmentSize: z.number().int().optional().nullable(),
        meta: z.record(z.unknown()).optional().nullable(),
      })
      .parse(req.body);

    const message = await sendVisitorMessage({
      conversationId: req.params.id!,
      visitorId: body.visitorId,
      body: body.body,
      messageType: (body.messageType || 'text') as ChatMessageType,
      attachmentS3Key: body.attachmentS3Key,
      attachmentMime: body.attachmentMime,
      attachmentName: body.attachmentName,
      attachmentSize: body.attachmentSize,
      meta: body.meta,
    });
    res.status(201).json({ message });
  }),
);

router.post(
  '/conversations/:id/typing',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        visitorId: z.string().uuid(),
        isTyping: z.boolean(),
      })
      .parse(req.body);
    const conversation = await getConversation(req.params.id!, req.siteId!);
    if (!conversation || conversation.visitor_id !== body.visitorId) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    broadcastTyping({
      conversationId: conversation.id,
      siteId: req.siteId!,
      visitorId: body.visitorId,
      who: 'visitor',
      isTyping: body.isTyping,
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/conversations/:id/seen',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        visitorId: z.string().uuid(),
        upToMessageId: z.string().uuid().optional(),
      })
      .parse(req.body);
    const conversation = await getConversation(req.params.id!, req.siteId!);
    if (!conversation || conversation.visitor_id !== body.visitorId) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    await markSeen({
      conversationId: conversation.id,
      viewer: 'visitor',
      upToMessageId: body.upToMessageId,
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/upload-url',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        conversationId: z.string().uuid(),
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1).max(120),
        size: z.number().int().positive().optional(),
      })
      .parse(req.body);
    const result = await createUploadUrl({
      siteId: req.siteId!,
      conversationId: body.conversationId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
    });
    res.json(result);
  }),
);

router.post(
  '/offline-form',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        visitorId: z.string().uuid().optional().nullable(),
        name: z.string().min(1).max(160),
        email: z.string().email().optional().nullable(),
        phone: z.string().max(40).optional().nullable(),
        message: z.string().min(1).max(4000),
        pageUrl: z.string().max(2048).optional().nullable(),
      })
      .parse(req.body);
    const form = await submitOfflineForm({
      siteId: req.siteId!,
      visitorId: body.visitorId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      message: body.message,
      pageUrl: body.pageUrl,
    });
    res.status(201).json({ form });
  }),
);

router.patch(
  '/visitors/:id',
  requireSiteKey,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        name: z.string().max(160).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(40).optional(),
      })
      .parse(req.body);
    const visitor = await updateVisitorContact(req.params.id!, req.siteId!, body);
    res.json({ visitor });
  }),
);

// ---------------------------------------------------------------------------
// Operator (JWT)
// ---------------------------------------------------------------------------

router.get(
  '/inbox',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const conversations = await listInbox(req.siteId!, {
      status: (req.query.status as string) || undefined,
      operatorId: (req.query.operatorId as string) || undefined,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json({ conversations });
  }),
);

router.get(
  '/operator/unread',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json(await getUnreadBadge(req.siteId!, undefined, req.operator?.operatorId));
  }),
);

router.get(
  '/operator/conversations/:id',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const conversation = await getConversation(req.params.id!, req.siteId!);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ conversation });
  }),
);

router.get(
  '/operator/conversations/:id/messages',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const conversation = await getConversation(req.params.id!, req.siteId!);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const before = (req.query.before as string) || undefined;
    res.json({ messages: await listMessages(req.params.id!, limit, before) });
  }),
);

router.post(
  '/operator/conversations/:id/messages',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const operatorId = req.operator?.operatorId;
    if (!operatorId) {
      res.status(400).json({ error: 'Missing operator id' });
      return;
    }
    const body = z
      .object({
        body: z.string().max(8000).optional().nullable(),
        messageType: messageTypeSchema.optional(),
        attachmentS3Key: z.string().max(512).optional().nullable(),
        attachmentMime: z.string().max(120).optional().nullable(),
        attachmentName: z.string().max(255).optional().nullable(),
        attachmentSize: z.number().int().optional().nullable(),
        meta: z.record(z.unknown()).optional().nullable(),
      })
      .parse(req.body);

    const message = await sendOperatorMessage({
      conversationId: req.params.id!,
      operatorId,
      body: body.body,
      messageType: (body.messageType || 'text') as ChatMessageType,
      attachmentS3Key: body.attachmentS3Key,
      attachmentMime: body.attachmentMime,
      attachmentName: body.attachmentName,
      attachmentSize: body.attachmentSize,
      meta: body.meta,
    });
    res.status(201).json({ message });
  }),
);

router.post(
  '/operator/conversations/:id/typing',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const isTyping = z.boolean().parse(req.body.isTyping);
    const conversation = await getConversation(req.params.id!, req.siteId!);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    broadcastTyping({
      conversationId: conversation.id,
      siteId: req.siteId!,
      visitorId: conversation.visitor_id,
      who: 'operator',
      isTyping,
      operatorId: req.operator?.operatorId,
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/operator/conversations/:id/seen',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    await markSeen({
      conversationId: req.params.id!,
      viewer: 'operator',
      upToMessageId: req.body.upToMessageId,
    });
    res.json({ ok: true });
  }),
);

router.post(
  '/operator/conversations/:id/assign',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const operatorId = z.string().uuid().parse(req.body.operatorId || req.operator?.operatorId);
    const conversation = await assignOperator(req.params.id!, operatorId);
    res.json({ conversation });
  }),
);

router.post(
  '/operator/conversations/:id/resolve',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const status = z
      .enum(['resolved', 'missed', 'open', 'pending', 'assigned', 'offline'])
      .optional()
      .parse(req.body.status);
    const conversation = await resolveConversation(
      req.params.id!,
      (status || 'resolved') as ConversationStatus,
    );
    res.json({ conversation });
  }),
);

router.get(
  '/operator/conversations/:id/export',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = await exportConversation(req.params.id!, req.siteId!);
    if (!data) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="chat-${req.params.id}.json"`);
    res.json(data);
  }),
);

router.post(
  '/operator/upload-url',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        conversationId: z.string().uuid(),
        fileName: z.string().min(1).max(255),
        contentType: z.string().min(1).max(120),
        size: z.number().int().positive().optional(),
      })
      .parse(req.body);
    res.json(
      await createUploadUrl({
        siteId: req.siteId!,
        conversationId: body.conversationId,
        fileName: body.fileName,
        contentType: body.contentType,
        size: body.size,
      }),
    );
  }),
);

router.get(
  '/operator/visitors/:id',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const info = await getVisitorInfo(req.params.id!, req.siteId!);
    if (!info) {
      res.status(404).json({ error: 'Visitor not found' });
      return;
    }
    res.json(info);
  }),
);

router.get(
  '/canned-replies',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const departmentId = (req.query.departmentId as string) || undefined;
    res.json({ replies: await listCannedReplies(req.siteId!, departmentId) });
  }),
);

router.post(
  '/canned-replies',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        title: z.string().min(1).max(160),
        body: z.string().min(1),
        shortcut: z.string().max(40).optional().nullable(),
        departmentId: z.string().uuid().optional().nullable(),
      })
      .parse(req.body);
    const reply = await createCannedReply({
      siteId: req.siteId!,
      title: body.title,
      body: body.body,
      shortcut: body.shortcut,
      departmentId: body.departmentId,
    });
    res.status(201).json({ reply });
  }),
);

router.delete(
  '/canned-replies/:id',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    await deleteCannedReply(req.params.id!, req.siteId!);
    res.json({ ok: true });
  }),
);

router.get(
  '/visitors/:id/notes',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ notes: await listNotes(req.params.id!) });
  }),
);

router.post(
  '/visitors/:id/notes',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const note = z.string().min(1).max(4000).parse(req.body.note);
    const row = await addNote(req.params.id!, note, req.operator?.operatorId);
    res.status(201).json({ note: row });
  }),
);

router.get(
  '/tags',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ tags: await listSiteTags(req.siteId!) });
  }),
);

router.get(
  '/visitors/:id/tags',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ tags: await listVisitorTags(req.params.id!) });
  }),
);

router.post(
  '/visitors/:id/tags',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    const body = z
      .object({
        name: z.string().min(1).max(80),
        color: z.string().max(20).optional(),
      })
      .parse(req.body);
    const tags = await tagVisitor(req.siteId!, req.params.id!, body.name, body.color);
    res.json({ tags });
  }),
);

router.delete(
  '/visitors/:visitorId/tags/:tagId',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    await untagVisitor(req.params.visitorId!, req.params.tagId!);
    res.json({ ok: true });
  }),
);

router.get(
  '/offline-forms',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ forms: await listOfflineForms(req.siteId!, Number(req.query.limit) || 50) });
  }),
);

router.get(
  '/operators',
  requireOperator,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ operators: await listOperators(req.siteId!) });
  }),
);

export default router;
