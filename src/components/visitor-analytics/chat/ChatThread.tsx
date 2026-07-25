import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Send,
  CheckCheck,
  Paperclip,
  Smile,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  assignConversation,
  createOperatorUploadUrl,
  getOperatorMessages,
  listCannedReplies,
  markOperatorSeen,
  resolveConversation,
  sendOperatorMessage,
  setOperatorTyping,
  uploadToPresignedUrl,
  VaWebSocket,
  getStoredSiteId,
  getStoredVaToken,
} from '@/services/api/visitorAnalyticsAPI';
import type {
  CannedReply,
  ChatConversation,
  ChatMessage,
  WsEnvelope,
} from '@/types/visitorAnalytics';
import { VisitorInfoSidebar } from './VisitorInfoSidebar';

const EMOJIS = ['👍', '🙏', '😊', '🚗', '✅', '👋', '❤️', '🎉'];

/** Parse MySQL DATETIME / ISO / Date — avoid "Invalid Date" in the UI. */
function parseChatDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const s = String(value).trim();
  if (!s || s === 'null' || s === 'undefined' || s === 'Invalid Date') return null;
  // MySQL "YYYY-MM-DD HH:mm:ss" is Invalid Date in some browsers without the T/Z
  let normalized = s;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)) {
    normalized = `${s.replace(' ', 'T')}Z`;
  }
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d;
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatTime(value: unknown): string {
  const d = parseChatDate(value);
  if (!d) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function sortMessagesChronological(list: ChatMessage[]): ChatMessage[] {
  return [...list].sort((a, b) => {
    const ta = parseChatDate(a.created_at)?.getTime() ?? 0;
    const tb = parseChatDate(b.created_at)?.getTime() ?? 0;
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });
}

/** API/WS mix snake_case DB rows and camelCase enrichMessage payloads. */
function normalizeThreadMessage(raw: Record<string, unknown>): ChatMessage | null {
  const nested =
    raw.message && typeof raw.message === 'object'
      ? (raw.message as Record<string, unknown>)
      : raw;
  const id = String(nested.id || '');
  if (!id) return null;
  const createdRaw = nested.created_at ?? nested.createdAt;
  const created = parseChatDate(createdRaw);
  return {
    id,
    conversation_id: String(
      nested.conversation_id ||
        nested.conversationId ||
        raw.conversation_id ||
        raw.conversationId ||
        '',
    ),
    sender_type: (nested.sender_type ||
      nested.senderType ||
      'system') as ChatMessage['sender_type'],
    sender_id: (nested.sender_id ?? nested.senderId ?? null) as string | null,
    message_type: (nested.message_type ||
      nested.messageType ||
      'text') as ChatMessage['message_type'],
    body: (nested.body ?? null) as string | null,
    attachment_s3_key: (nested.attachment_s3_key ??
      nested.attachmentS3Key ??
      null) as string | null,
    attachment_mime: (nested.attachment_mime ?? nested.attachmentMime ?? null) as string | null,
    attachment_name: (nested.attachment_name ?? nested.attachmentName ?? null) as string | null,
    attachment_size: (nested.attachment_size ?? nested.attachmentSize ?? null) as number | null,
    seen_at: (() => {
      const s = nested.seen_at ?? nested.seenAt;
      if (s == null) return null;
      const d = parseChatDate(s);
      return d ? d.toISOString() : String(s);
    })(),
    created_at: created ? created.toISOString() : new Date().toISOString(),
    meta: (nested.meta as ChatMessage['meta']) ?? null,
  };
}

interface ChatThreadProps {
  conversation: ChatConversation;
  onUpdated?: (c: ChatConversation) => void;
}

export function ChatThread({ conversation, onUpdated }: ChatThreadProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [canned, setCanned] = useState<CannedReply[]>([]);
  const [visitorTyping, setVisitorTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const scrollToLatest = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOperatorMessages(conversation.id, { limit: 200 });
      const normalized = sortMessagesChronological(
        [...(data.messages || [])]
          .map((m) => normalizeThreadMessage(m as unknown as Record<string, unknown>))
          .filter((m): m is ChatMessage => m != null),
      );
      setMessages(normalized);
      const last = normalized[normalized.length - 1];
      if (last) await markOperatorSeen(conversation.id, last.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    void loadMessages();
    void listCannedReplies().then((r) => setCanned(r.replies || [])).catch(() => undefined);
  }, [loadMessages]);

  useEffect(() => {
    // Jump after load; smooth for live updates
    scrollToLatest(!loading);
  }, [messages, visitorTyping, loading, scrollToLatest]);

  useEffect(() => {
    const siteId = getStoredSiteId();
    const token = getStoredVaToken();
    if (!siteId || !token) return;
    const ws = new VaWebSocket({ role: 'operator', siteId, token });
    ws.connect();
    ws.subscribeConversation(conversation.id);
    const off = ws.on((msg: WsEnvelope) => {
      if (msg.type === 'chat.message') {
        const payload = msg.payload as Record<string, unknown>;
        const m = normalizeThreadMessage(payload);
        if (!m) return;
        if (m.conversation_id && m.conversation_id !== conversation.id) return;
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          return sortMessagesChronological([...prev, m]);
        });
        if (m.sender_type === 'visitor') {
          void markOperatorSeen(conversation.id, m.id);
        }
      }
      if (msg.type === 'chat.typing') {
        const p = msg.payload as { conversationId?: string; who?: string; isTyping?: boolean };
        if (p.conversationId === conversation.id && p.who === 'visitor') {
          setVisitorTyping(Boolean(p.isTyping));
        }
      }
      if (msg.type === 'chat.seen') {
        const p = msg.payload as { conversationId?: string };
        if (p.conversationId === conversation.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender_type === 'operator' && !m.seen_at
                ? { ...m, seen_at: new Date().toISOString() }
                : m,
            ),
          );
        }
      }
    });
    return () => {
      off();
      ws.close();
    };
  }, [conversation.id]);

  const notifyTyping = (isTyping: boolean) => {
    void setOperatorTyping(conversation.id, isTyping).catch(() => undefined);
  };

  const onTextChange = (value: string) => {
    setText(value);
    notifyTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => notifyTyping(false), 1200);
  };

  const send = async (body: string, extras?: Partial<Parameters<typeof sendOperatorMessage>[1]>) => {
    if (!body.trim() && !extras?.attachmentS3Key) return;
    setSending(true);
    notifyTyping(false);
    try {
      const { message } = await sendOperatorMessage(conversation.id, {
        body: body.trim() || null,
        messageType: extras?.messageType || (extras?.attachmentMime?.startsWith('image/') ? 'image' : extras?.attachmentS3Key ? 'file' : 'text'),
        ...extras,
      });
      const normalized = normalizeThreadMessage(message as unknown as Record<string, unknown>);
      if (normalized) {
        setMessages((prev) =>
          prev.some((m) => m.id === normalized.id)
            ? prev
            : sortMessagesChronological([...prev, normalized]),
        );
      }
      setText('');
      setShowEmoji(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (file: File) => {
    try {
      const upload = await createOperatorUploadUrl({
        conversationId: conversation.id,
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      });
      await uploadToPresignedUrl(upload.uploadUrl, file, upload.contentType);
      await send(file.name, {
        attachmentS3Key: upload.s3Key,
        attachmentMime: upload.contentType,
        attachmentName: file.name,
        attachmentSize: file.size,
        messageType: file.type.startsWith('image/') ? 'image' : 'file',
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const handleResolve = async () => {
    try {
      const { conversation: updated } = await resolveConversation(conversation.id, 'resolved');
      onUpdated?.(updated);
      toast.success('Conversation resolved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to resolve');
    }
  };

  const handleAssign = async (operatorId: string) => {
    try {
      const { conversation: updated } = await assignConversation(conversation.id, operatorId);
      onUpdated?.(updated);
      toast.success('Assigned');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assign failed');
    }
  };

  return (
    <div className="flex h-full min-h-[480px] border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2 bg-slate-50">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {conversation.visitor_name || 'Visitor'}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-[10px] capitalize">
                {conversation.status}
              </Badge>
              {conversation.vehicle_interest && (
                <Badge variant="secondary" className="text-[10px]">
                  {conversation.vehicle_interest}
                </Badge>
              )}
              {conversation.campaign && (
                <Badge variant="secondary" className="text-[10px]">
                  {conversation.campaign}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="outline" onClick={() => setShowSidebar((s) => !s)} className="hidden lg:inline-flex">
              Info
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleResolve()}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Resolve
            </Button>
          </div>
        </div>

        {/* Native scroll — Radix ScrollArea shrink-wraps width so justify-end looks left-aligned */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-3 py-3 bg-[#efeae2]"
        >
          {loading ? (
            <div className="flex justify-center py-16 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-full min-w-0">
              {messages.map((m) => {
                const isOperator = m.sender_type === 'operator';
                const isSystem = m.sender_type === 'system';
                const isAi = m.sender_type === 'ai';
                const timeLabel = formatTime(m.created_at);

                if (isSystem) {
                  return (
                    <div key={m.id} className="flex justify-center px-6 py-1">
                      <div className="max-w-[90%] rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-slate-600 text-center shadow-sm">
                        {m.body}
                        {timeLabel ? (
                          <span className="block mt-0.5 text-[10px] text-slate-400">{timeLabel}</span>
                        ) : null}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className={`flex w-full ${isOperator ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-lg px-3 py-1.5 text-sm shadow-sm ${
                        isOperator
                          ? 'bg-[#d9fdd3] text-slate-900 rounded-br-none'
                          : 'bg-white text-slate-900 rounded-bl-none'
                      }`}
                    >
                      {isAi && (
                        <p className="text-[10px] font-semibold text-amber-700 mb-0.5">VTH AI</p>
                      )}
                      {!isOperator && !isAi && (
                        <p className="text-[10px] font-semibold text-slate-500 mb-0.5">
                          {conversation.visitor_name?.trim() || 'Guest'}
                        </p>
                      )}
                      {isOperator && (
                        <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">You</p>
                      )}
                      {m.message_type === 'image' && m.attachment_name && (
                        <p className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                          <ImageIcon className="h-3 w-3" /> {m.attachment_name}
                        </p>
                      )}
                      {m.message_type === 'file' && (
                        <p className="flex items-center gap-1 text-xs text-slate-600 mb-1">
                          <Paperclip className="h-3 w-3" /> {m.attachment_name || 'File'}
                        </p>
                      )}
                      {m.body && (
                        <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500">
                        {timeLabel ? <span>{timeLabel}</span> : null}
                        {isOperator && m.seen_at && (
                          <CheckCheck className="h-3.5 w-3.5 text-sky-500" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {visitorTyping && (
                <p className="text-xs text-slate-500 italic pl-1">Guest is typing…</p>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="border-t p-3 space-y-2 bg-white">
          {canned.length > 0 && (
            <Select onValueChange={(id) => {
              const reply = canned.find((c) => c.id === id);
              if (reply) setText(reply.body);
            }}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Canned replies" />
              </SelectTrigger>
              <SelectContent>
                {canned.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.shortcut ? `/${c.shortcut} — ` : ''}
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {showEmoji && (
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="text-lg hover:bg-slate-100 rounded p-1"
                  onClick={() => void send(e, { messageType: 'emoji' })}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = '';
              }}
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="ghost" onClick={() => setShowEmoji((s) => !s)}>
              <Smile className="h-4 w-4" />
            </Button>
            <Input
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(text);
                }
              }}
              placeholder="Type a message…"
              className="flex-1"
            />
            <Button
              onClick={() => void send(text)}
              disabled={sending || !text.trim()}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {showSidebar && (
        <div className="hidden lg:block w-72 border-l border-slate-200 bg-white shrink-0">
          <VisitorInfoSidebar
            visitorId={conversation.visitor_id}
            assignedOperatorId={conversation.operator_id}
            onAssign={(id) => void handleAssign(id)}
          />
        </div>
      )}
    </div>
  );
}

export default ChatThread;
