import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Send,
  Mic,
  Square,
  Loader2,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Phone,
  MessageSquarePlus,
} from 'lucide-react';
import {
  createVisitorConversation,
  createVisitorUploadUrl,
  getChatWidget,
  getVisitorMessages,
  getVisitorUnread,
  markVisitorSeen,
  sendVisitorMessage,
  setVisitorTyping,
  submitOfflineForm,
  updateVisitorContactPublic,
  uploadToPresignedUrl,
  VaWebSocket,
} from '@/services/api/visitorAnalyticsAPI';
import type {
  ChatMessage,
  ChatWidgetData,
  WsEnvelope,
} from '@/types/visitorAnalytics';
import {
  defaultWhatsappCountry,
  WhatsAppCountryPhoneRow,
} from '@/components/WhatsAppCountryPhoneRow';
import type { CountryCode } from '@/lib/countryCodes';
import { countryCodes } from '@/lib/countryCodes';
import { trackGuestSearch } from '@/services/trackSearchAPI';
import { API_BASE_URL } from '@/config';

function alertVthAiLeadWhatsApp(payload: {
  name: string;
  phone: string;
  page?: string;
}): void {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin.replace(/\/$/, '')
      : String(API_BASE_URL).replace(/\/$/, '');
  const url = `${origin}/api/track-vth-ai-lead.php`;

  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    mode: 'cors',
    cache: 'no-store',
  })
    .then(async (r) => {
      if (r.ok) return;
      // Fallback: reuse cab-search WhatsApp alert pipeline if dedicated endpoint not deployed yet
      const when = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      trackGuestSearch({
        guestPhone: payload.phone,
        pickup: `VTH AI Lead — ${payload.name}`,
        drop: 'Website chat started',
        tripType: 'VTH AI — new chat lead',
        departure: when,
        carsShown: [
          `Name: ${payload.name}`,
          `Phone: ${payload.phone}`,
          `Page: ${payload.page || '/'}`,
          'Source: VTH AI widget',
        ],
      });
    })
    .catch(() => {
      const when = new Date().toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      trackGuestSearch({
        guestPhone: payload.phone,
        pickup: `VTH AI Lead — ${payload.name}`,
        drop: 'Website chat started',
        tripType: 'VTH AI — new chat lead',
        departure: when,
        carsShown: [
          `Name: ${payload.name}`,
          `Phone: ${payload.phone}`,
          `Page: ${payload.page || '/'}`,
          'Source: VTH AI widget',
        ],
      });
    });
}

const VISITOR_ID_LS = 'va_visitor_id';
const SESSION_ID_LS = 'va_session_id';
const CONV_ID_LS = 'va_chat_conversation_id';
const GUEST_NAME_LS = 'va_chat_guest_name';
const GUEST_PHONE_LS = 'va_chat_guest_phone';
const GUEST_DIAL_LS = 'va_chat_guest_dial';

const ASSISTANT_NAME = 'VTH AI';
const ACCENT = '#6D28D9';
const ACCENT_SOFT = '#7C3AED';

function loadSavedGuest(): {
  name: string;
  phoneDigits: string;
  country: CountryCode;
  ready: boolean;
} {
  try {
    const name = localStorage.getItem(GUEST_NAME_LS)?.trim() || '';
    const phoneDigits = localStorage.getItem(GUEST_PHONE_LS)?.replace(/\D/g, '') || '';
    const dial = localStorage.getItem(GUEST_DIAL_LS) || '+91';
    const country =
      countryCodes.find((c) => c.dialCode === dial) || defaultWhatsappCountry();
    const ready =
      name.length >= 2 && phoneDigits.length === country.maxLength;
    return { name, phoneDigits, country, ready };
  } catch {
    return { name: '', phoneDigits: '', country: defaultWhatsappCountry(), ready: false };
  }
}

type QuickReply = { id: string; label: string; message: string };

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function renderChatBody(body: string, mine: boolean): React.ReactNode {
  const parts = body.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      const label = part.length > 72 ? `${part.slice(0, 64)}…` : part;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline break-all font-medium ${mine ? 'text-white' : 'text-violet-700'}`}
        >
          {label}
        </a>
      );
    }
    return (
      <span key={i} className="whitespace-pre-wrap">
        {part}
      </span>
    );
  });
}

function resolveTrackerIds(): { visitorId: string; sessionId: string } {
  try {
    const identity = window.visitorAnalytics?.getIdentity?.();
    if (identity?.visitorId) {
      localStorage.setItem(VISITOR_ID_LS, identity.visitorId);
      if (identity.sessionId) localStorage.setItem(SESSION_ID_LS, identity.sessionId);
      return {
        visitorId: identity.visitorId,
        sessionId: identity.sessionId || localStorage.getItem(SESSION_ID_LS) || '',
      };
    }
    const ctx = window.visitorAnalytics?.chat?.getVisitorContext?.();
    if (ctx?.visitorId) {
      localStorage.setItem(VISITOR_ID_LS, ctx.visitorId);
      if (ctx.sessionId) localStorage.setItem(SESSION_ID_LS, ctx.sessionId);
      return { visitorId: ctx.visitorId, sessionId: ctx.sessionId || '' };
    }
  } catch {
    // ignore
  }
  return {
    visitorId: localStorage.getItem(VISITOR_ID_LS) || '',
    sessionId: localStorage.getItem(SESSION_ID_LS) || '',
  };
}

function pageContextLabel(pathname: string): string | null {
  if (pathname.includes('airport')) return 'Helping with Vizag Airport taxi transfers';
  if (pathname.includes('araku')) return 'Helping with Araku Valley cab packages';
  if (pathname.includes('outstation')) return 'Helping with outstation cab quotes';
  if (pathname.includes('local')) return 'Helping with Vizag local taxi packages';
  if (pathname.includes('tempo')) return 'Helping with Tempo Traveller bookings';
  if (pathname.includes('tour') || pathname.includes('sightseeing')) {
    return 'Helping with Vizag sightseeing & tours';
  }
  return null;
}

function quickRepliesForPath(pathname: string): QuickReply[] {
  if (pathname.includes('airport')) {
    return [
      {
        id: 'ap1',
        label: 'Airport taxi fares',
        message: 'I need Vizag Airport taxi fares. Please ask me for the trip details.',
      },
      {
        id: 'ap2',
        label: 'Book airport cab',
        message: 'I want to book an airport cab. Please take my details.',
      },
      {
        id: 'ap3',
        label: 'Talk to a human',
        message: 'Please connect me to a human operator',
      },
    ];
  }
  if (pathname.includes('araku')) {
    return [
      { id: 'ar1', label: 'Araku day package', message: 'Araku Valley day tour package prices' },
      { id: 'ar2', label: 'Araku 3 days 2 nights', message: '3 days 2 nights Vizag and Araku tour package' },
      { id: 'ar3', label: 'Araku + Borra Caves', message: 'I want Araku with Borra Caves package' },
    ];
  }
  return [
    {
      id: 'q1',
      label: 'Airport taxi fares',
      message: 'I need Vizag Airport taxi fares. Please ask me for the trip details.',
    },
    { id: 'q2', label: 'Local 8hr / 80km package', message: 'What is the local 8 hours / 80 km taxi package?' },
    {
      id: 'q3',
      label: 'Outstation cab quote',
      message: 'I need an outstation cab quote. Please ask me for pickup, drop, date and time.',
    },
    { id: 'q4', label: 'Araku tour package', message: 'Araku Valley tour package prices' },
    { id: 'q5', label: '3 days 2 nights Vizag tour', message: '3 days 2 nights Vizag and Araku tour package' },
    { id: 'q6', label: 'Talk to a human', message: 'Please connect me to a human operator' },
  ];
}

/** Suggestion chips while chatting (after the guest has spoken). */
function midChatSuggestions(messages: ChatMessage[]): QuickReply[] {
  const lastAi = [...messages].reverse().find((m) => m.sender_type === 'ai');
  const body = (lastAi?.body || '').toLowerCase();
  if (/pick you up|pickup location|where should we pick/.test(body)) {
    return [
      { id: 'm1', label: 'Novotel Vizag', message: 'Novotel Visakhapatnam' },
      { id: 'm2', label: 'Airport', message: 'Vizag Airport' },
      { id: 'm3', label: 'RK Beach', message: 'RK Beach' },
      { id: 'm4', label: 'Kailasapuram', message: 'Kailasapuram' },
    ];
  }
  if (/drop \/ destination|dropoff|what is your drop|destination\?/.test(body)) {
    return [
      { id: 'd1', label: 'Airport', message: 'Vizag Airport' },
      { id: 'd2', label: 'Rajahmundry', message: 'Rajahmundry' },
      { id: 'd3', label: 'Araku', message: 'Araku Valley' },
      { id: 'd4', label: 'Akkayapalem', message: 'Akkayapalem' },
    ];
  }
  if (/book it|checkout link|fares:/.test(body) || /₹\d/.test(body)) {
    return [
      { id: 'b1', label: 'Book it', message: 'kindly book it' },
      { id: 'b2', label: 'Sedan', message: 'Sedan' },
      { id: 'b3', label: 'Tomorrow morning', message: 'Tomorrow morning' },
      { id: 'b4', label: 'Talk to human', message: 'Please connect me to a human operator' },
    ];
  }
  if (/which vehicle|prefer\?|options: sedan/i.test(body)) {
    return [
      { id: 'v1', label: 'Sedan', message: 'Sedan' },
      { id: 'v2', label: 'Ertiga', message: 'Ertiga' },
      { id: 'v3', label: 'Innova Crysta', message: 'Innova Crysta' },
    ];
  }
  return [
    { id: 'x1', label: 'Book it', message: 'kindly book it' },
    { id: 'x2', label: 'Airport fares', message: 'Airport taxi fares' },
    { id: 'x3', label: 'Outstation quote', message: 'Vizag to Rajahmundry fare' },
    { id: 'x4', label: 'Talk to human', message: 'Please connect me to a human operator' },
  ];
}

function playNotifySound(): void {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.start();
    o.stop(ctx.currentTime + 0.12);
  } catch {
    // ignore
  }
}

function parseChatDate(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  let normalized = s;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(s)) {
    normalized = `${s.replace(' ', 'T')}Z`;
  }
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d;
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** API returns a mix of snake_case (DB) and camelCase (enriched WS) — normalize. */
function normalizeMessage(raw: Record<string, unknown>): ChatMessage | null {
  const id = String(raw.id || '');
  if (!id) return null;
  const sender = (raw.sender_type || raw.senderType || 'system') as ChatMessage['sender_type'];
  const created = parseChatDate(raw.created_at ?? raw.createdAt);
  const seen = parseChatDate(raw.seen_at ?? raw.seenAt);
  return {
    id,
    conversation_id: String(raw.conversation_id || raw.conversationId || ''),
    sender_type: sender,
    sender_id: (raw.sender_id ?? raw.senderId ?? null) as string | null,
    message_type: (raw.message_type || raw.messageType || 'text') as ChatMessage['message_type'],
    body: (raw.body ?? null) as string | null,
    attachment_s3_key: (raw.attachment_s3_key ?? raw.attachmentS3Key ?? null) as string | null,
    attachment_mime: (raw.attachment_mime ?? raw.attachmentMime ?? null) as string | null,
    attachment_name: (raw.attachment_name ?? raw.attachmentName ?? null) as string | null,
    attachment_size: (raw.attachment_size ?? raw.attachmentSize ?? null) as number | null,
    seen_at: seen ? seen.toISOString() : null,
    created_at: created ? created.toISOString() : new Date().toISOString(),
    meta: (raw.meta as ChatMessage['meta']) ?? null,
  };
}

export interface LiveChatWidgetProps {
  siteKey?: string;
  siteId?: string;
  visitorId?: string;
  sessionId?: string;
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function LiveChatWidget({
  siteKey: siteKeyProp,
  siteId: siteIdProp,
  visitorId: visitorIdProp,
  sessionId: sessionIdProp,
  primaryColor = ACCENT,
  position = 'bottom-left',
}: LiveChatWidgetProps) {
  const location = useLocation();
  const siteKey =
    siteKeyProp ||
    (import.meta.env.VITE_VA_SITE_KEY as string | undefined) ||
    'vth_pk_live_replace_me';
  const siteId =
    siteIdProp ||
    (import.meta.env.VITE_VA_SITE_ID as string | undefined) ||
    localStorage.getItem('va_site_id_public') ||
    '00000000-0000-4000-8000-000000000001';

  const savedGuest = useMemo(() => loadSavedGuest(), []);
  const [leadReady, setLeadReady] = useState(savedGuest.ready);
  const [guestName, setGuestName] = useState(savedGuest.name);
  const [guestPhoneDigits, setGuestPhoneDigits] = useState(savedGuest.phoneDigits);
  const [guestCountry, setGuestCountry] = useState<CountryCode>(savedGuest.country);
  const [leadError, setLeadError] = useState<string | null>(null);
  const [leadSaving, setLeadSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [widget, setWidget] = useState<ChatWidgetData | null>(null);
  const [visitorId, setVisitorId] = useState(visitorIdProp || '');
  const [sessionId, setSessionId] = useState(sessionIdProp || '');
  const [conversationId, setConversationId] = useState(
    localStorage.getItem(CONV_ID_LS) || '',
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [operatorTyping, setOperatorTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [showCallbackForm, setShowCallbackForm] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const [offlineForm, setOfflineForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [offlineSent, setOfflineSent] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  const accent = primaryColor || ACCENT;
  const contextLabel = useMemo(() => pageContextLabel(location.pathname), [location.pathname]);
  const quickReplies = useMemo(() => quickRepliesForPath(location.pathname), [location.pathname]);
  const midSuggestions = useMemo(() => midChatSuggestions(messages), [messages]);
  const displayGuestName = guestName.trim() || 'Guest';

  const aiReady = widget ? Boolean(widget.aiEnabled) || widget.operatorsOnline > 0 : true;
  const online = Boolean(widget?.operatorsOnline);

  // Keep visitor/session ids in sync with tracker identify
  useEffect(() => {
    const sync = () => {
      const ids = resolveTrackerIds();
      if (ids.visitorId) setVisitorId(ids.visitorId);
      if (ids.sessionId) setSessionId(ids.sessionId);
    };
    sync();
    const id = window.setInterval(sync, 2000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (visitorIdProp) {
      setVisitorId(visitorIdProp);
      localStorage.setItem(VISITOR_ID_LS, visitorIdProp);
    }
  }, [visitorIdProp]);

  useEffect(() => {
    if (!siteKey) return;
    void getChatWidget(siteKey)
      .then((data) => setWidget(data))
      .catch(() => setWidget(null));
  }, [siteKey]);

  const refreshUnread = useCallback(async () => {
    if (!siteKey || !visitorId) return;
    try {
      const data = await getVisitorUnread(siteKey, visitorId);
      setUnread(data.unread || 0);
    } catch {
      // ignore
    }
  }, [siteKey, visitorId]);

  useEffect(() => {
    void refreshUnread();
    const id = setInterval(() => void refreshUnread(), 20000);
    return () => clearInterval(id);
  }, [refreshUnread]);

  const ensureConversation = useCallback(async (): Promise<string | null> => {
    if (!siteKey) return null;
    const ids = resolveTrackerIds();
    const vid = visitorId || ids.visitorId;
    const sid = sessionId || ids.sessionId;
    if (!vid) return null;
    if (vid !== visitorId) setVisitorId(vid);
    if (sid && sid !== sessionId) setSessionId(sid);
    if (conversationId) return conversationId;
    const { conversation } = await createVisitorConversation(siteKey, {
      visitorId: vid,
      sessionId: sid || null,
      source: 'vira_widget',
      locationCity: null,
    });
    localStorage.setItem(CONV_ID_LS, conversation.id);
    setConversationId(conversation.id);
    return conversation.id;
  }, [siteKey, visitorId, sessionId, conversationId]);

  const loadMessages = useCallback(
    async (convId: string, vid: string) => {
      if (!siteKey || !vid) return;
      setLoading(true);
      try {
        const data = await getVisitorMessages(siteKey, convId, vid, { limit: 100 });
        const list = [...(data.messages || [])]
          .map((m) => normalizeMessage(m as unknown as Record<string, unknown>))
          .filter((m): m is ChatMessage => m != null);
        setMessages(list);
        const last = list[list.length - 1];
        if (last) await markVisitorSeen(siteKey, convId, vid, last.id);
        setUnread(0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [siteKey],
  );

  useEffect(() => {
    if (!open || !siteKey || !leadReady) return;
    let cancelled = false;
    (async () => {
      setConnecting(true);
      try {
        // Wait briefly for tracker identify if needed
        let vid = visitorId || resolveTrackerIds().visitorId;
        for (let i = 0; i < 8 && !vid; i++) {
          await new Promise((r) => setTimeout(r, 400));
          vid = resolveTrackerIds().visitorId;
        }
        if (cancelled) return;
        if (!vid) {
          setConnecting(false);
          return;
        }
        setVisitorId(vid);
        // Sync lead contact onto visitor record
        try {
          const phone = `${guestCountry.dialCode}${guestPhoneDigits}`;
          await updateVisitorContactPublic(siteKey, vid, {
            name: guestName.trim(),
            phone,
          });
        } catch {
          /* non-blocking */
        }
        const convId = await ensureConversation();
        if (cancelled) return;
        if (convId) await loadMessages(convId, vid);
      } catch (e) {
        console.warn('[vira] connect failed', e);
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    siteKey,
    leadReady,
    visitorId,
    ensureConversation,
    loadMessages,
    guestName,
    guestCountry.dialCode,
    guestPhoneDigits,
  ]);

  const submitLeadGate = async () => {
    setLeadError(null);
    const name = guestName.trim();
    if (name.length < 2) {
      setLeadError('Please enter your name');
      return;
    }
    if (guestPhoneDigits.length !== guestCountry.maxLength) {
      setLeadError(
        `Enter a valid ${guestCountry.maxLength}-digit mobile number for ${guestCountry.name}`,
      );
      return;
    }
    setLeadSaving(true);
    try {
      const phone = `${guestCountry.dialCode}${guestPhoneDigits}`;
      localStorage.setItem(GUEST_NAME_LS, name);
      localStorage.setItem(GUEST_PHONE_LS, guestPhoneDigits);
      localStorage.setItem(GUEST_DIAL_LS, guestCountry.dialCode);
      // Prefill offline/callback form too
      setOfflineForm((f) => ({
        ...f,
        name,
        phone,
      }));

      // WhatsApp alert to admin(s) — dedicated endpoint, falls back to track-search.php
      alertVthAiLeadWhatsApp({
        name,
        phone,
        page: typeof window !== 'undefined' ? window.location.pathname : '/',
      });

      setLeadReady(true);
    } finally {
      setLeadSaving(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, operatorTyping, open]);

  useEffect(() => {
    if (!siteId || !visitorId || !conversationId) return;
    const ws = new VaWebSocket({
      role: 'visitor',
      siteId,
      visitorId,
      conversationId,
      sessionId: sessionId || undefined,
    });
    ws.connect();
    ws.subscribeConversation(conversationId);
    const off = ws.on((msg: WsEnvelope) => {
      if (msg.type === 'chat.message') {
        const payload = msg.payload as Record<string, unknown>;
        const nested = payload.message as Record<string, unknown> | undefined;
        const m = normalizeMessage(nested || payload);
        if (!m) return;
        if (m.conversation_id && m.conversation_id !== conversationId) return;
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
        if (m.sender_type !== 'visitor') {
          setOperatorTyping(false);
          if (!openRef.current) {
            setUnread((u) => u + 1);
            playNotifySound();
          } else if (siteKey) {
            void markVisitorSeen(siteKey, conversationId, visitorId, m.id);
          }
        }
      }
      if (msg.type === 'chat.typing') {
        const p = msg.payload as { who?: string; isTyping?: boolean; conversationId?: string };
        if (p.conversationId === conversationId && p.who === 'operator') {
          setOperatorTyping(Boolean(p.isTyping));
        }
      }
    });
    return () => {
      off();
      ws.close();
    };
  }, [siteKey, siteId, visitorId, conversationId, sessionId]);

  const notifyTyping = (isTyping: boolean) => {
    if (!siteKey || !conversationId || !visitorId) return;
    void setVisitorTyping(siteKey, conversationId, visitorId, isTyping).catch(() => undefined);
  };

  const onTextChange = (value: string) => {
    setText(value);
    notifyTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => notifyTyping(false), 1000);
  };

  const send = async (body: string) => {
    const trimmed = body.trim();
    if (!trimmed || !siteKey || !leadReady) return;
    setSending(true);
    notifyTyping(false);
    try {
      let vid = visitorId || resolveTrackerIds().visitorId;
      if (!vid) {
        for (let i = 0; i < 5 && !vid; i++) {
          await new Promise((r) => setTimeout(r, 300));
          vid = resolveTrackerIds().visitorId;
        }
      }
      if (!vid) throw new Error('Visitor not ready');
      setVisitorId(vid);
      let convId = conversationId;
      if (!convId) {
        convId = (await ensureConversation()) || '';
        if (!convId) throw new Error('Could not start chat');
      }
      const { message } = await sendVisitorMessage(siteKey, convId, {
        visitorId: vid,
        body: trimmed,
        messageType: 'text',
      });
      const normalized = normalizeMessage(message as unknown as Record<string, unknown>);
      if (normalized) {
        setMessages((prev) =>
          prev.some((m) => m.id === normalized.id) ? prev : [...prev, normalized],
        );
      }
      setText('');
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : '';
      // Tracker not loaded / visitor id missing — don't dump to callback form for that
      if (/Visitor not ready|Could not start chat/i.test(msg)) {
        setText(trimmed);
        // Keep chat open; user can retry after tracker starts
        return;
      }
      setShowCallbackForm(true);
    } finally {
      setSending(false);
    }
  };

  const handleVoiceFile = async (file: File) => {
    if (!siteKey || !conversationId || !visitorId) return;
    try {
      const upload = await createVisitorUploadUrl(siteKey, {
        conversationId,
        fileName: file.name,
        contentType: file.type || 'audio/webm',
        size: file.size,
      });
      await uploadToPresignedUrl(upload.uploadUrl, file, upload.contentType);
      await sendVisitorMessage(siteKey, conversationId, {
        visitorId,
        body: 'Voice message',
        messageType: 'voice',
        attachmentS3Key: upload.s3Key,
        attachmentMime: upload.contentType,
        attachmentName: file.name,
        attachmentSize: file.size,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleVoice = async () => {
    if (recording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      mediaRecorderRef.current?.stop();
      setRecording(false);
      setVoiceHint(null);
      return;
    }

    // Prefer speech-to-text into the input (works on Chrome / Safari with mic permission)
    type RecCtor = new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start: () => void;
      stop: () => void;
      onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
      onerror: ((ev: { error?: string }) => void) | null;
      onend: (() => void) | null;
    };
    const w = window as unknown as {
      SpeechRecognition?: RecCtor;
      webkitSpeechRecognition?: RecCtor;
    };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (Rec) {
      try {
        const rec = new Rec();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'en-IN';
        rec.onresult = (ev) => {
          let interim = '';
          let finalText = '';
          for (let i = 0; i < ev.results.length; i++) {
            const row = ev.results[i]!;
            if (row.isFinal) finalText += row[0]!.transcript;
            else interim += row[0]!.transcript;
          }
          const heard = (finalText || interim).trim();
          if (heard) setText(heard);
        };
        rec.onerror = (ev) => {
          setRecording(false);
          setVoiceHint(ev.error === 'not-allowed' ? 'Mic permission denied' : 'Voice not available — type instead');
          recognitionRef.current = null;
        };
        rec.onend = () => {
          setRecording(false);
          recognitionRef.current = null;
          setVoiceHint(null);
        };
        recognitionRef.current = rec;
        rec.start();
        setRecording(true);
        setVoiceHint('Listening… speak now');
        return;
      } catch {
        // fall through to MediaRecorder
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        const ext = blob.type.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type });
        void handleVoiceFile(file);
        setVoiceHint(null);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setVoiceHint('Recording… tap mic to stop');
    } catch (e) {
      console.error(e);
      setVoiceHint('Mic blocked — allow microphone in browser settings');
    }
  };

  const submitOffline = async () => {
    if (!siteKey || !offlineForm.name.trim() || !offlineForm.message.trim()) return;
    setSending(true);
    try {
      await submitOfflineForm(siteKey, {
        visitorId: visitorId || null,
        name: offlineForm.name.trim(),
        email: offlineForm.email || null,
        phone: offlineForm.phone || null,
        message: offlineForm.message.trim(),
        pageUrl: typeof window !== 'undefined' ? window.location.href : null,
      });
      setOfflineSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (!siteKey) return null;
  // Always show the launcher; chat/AI features degrade gracefully if the API is down
  // (do not hide the whole assistant when widget.enabled is false from a stale config)

  const isLeft = position === 'bottom-left';
  const posClass = isLeft ? 'left-3 sm:left-6' : 'right-3 sm:right-6';
  const panelAlign = isLeft ? 'items-start' : 'items-end';
  const showWelcome = !messages.length && !loading;
  const visitorHasSpoken = messages.some((m) => m.sender_type === 'visitor');
  // Keep clickable question boxes until the customer sends their first message
  // (server welcome AI message alone should not hide them)
  const showQuickReplies = !visitorHasSpoken && !loading;
  const showMidSuggestions = visitorHasSpoken && !loading && !sending;

  // Mobile after cab search: redBus-style circular FAB (no wide "VTH AI" pill)
  const [compactFab, setCompactFab] = useState(false);
  useEffect(() => {
    const sync = () => {
      const afterSearch = document.documentElement.dataset.vthBookingUi === 'results';
      const narrow = window.matchMedia('(max-width: 1023px)').matches;
      setCompactFab(afterSearch && narrow);
    };
    sync();
    const mql = window.matchMedia('(max-width: 1023px)');
    mql.addEventListener('change', sync);
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-vth-booking-ui'],
    });
    return () => {
      mql.removeEventListener('change', sync);
      mo.disconnect();
    };
  }, []);

  return (
    <div
      className={`fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px)+var(--vth-chat-clearance,0px))] sm:bottom-[calc(1.5rem+var(--vth-chat-clearance,0px))] ${posClass} z-[9999] flex flex-col ${panelAlign} gap-3 font-sans`}
      data-va-ignore
    >
      {open && (
        <div
          className="w-[min(100dvw-1rem,400px)] sm:w-[min(100vw-2rem,400px)] h-[min(70dvh,620px)] sm:h-[min(78vh,640px)] max-h-[calc(100dvh-8rem)] rounded-[28px] shadow-[0_24px_60px_-16px_rgba(15,23,42,0.4)] border border-slate-200/70 bg-white flex flex-col overflow-hidden"
          role="dialog"
          aria-label={`${ASSISTANT_NAME} travel assistant`}
        >
          {/* Header — RAY style */}
          <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${ACCENT_SOFT})`,
                }}
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[15px] leading-tight" style={{ color: accent }}>
                  {ASSISTANT_NAME}{' '}
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    beta
                  </span>
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {widget?.siteName || 'Vizag Taxi Hub'} assistance for you
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {showCallbackForm ? (
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
              <button
                type="button"
                className="text-xs font-medium"
                style={{ color: accent }}
                onClick={() => setShowCallbackForm(false)}
              >
                ← Back to {ASSISTANT_NAME}
              </button>
              {offlineSent ? (
                <p className="text-sm text-slate-600 py-10 text-center">
                  Thanks! We will call you back soon.
                </p>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    Leave your details and our team will reach out.
                  </p>
                  <Input
                    placeholder="Name *"
                    value={offlineForm.name}
                    onChange={(e) => setOfflineForm((f) => ({ ...f, name: e.target.value }))}
                    className="bg-white rounded-full"
                  />
                  <Input
                    placeholder="Phone"
                    value={offlineForm.phone}
                    onChange={(e) => setOfflineForm((f) => ({ ...f, phone: e.target.value }))}
                    className="bg-white rounded-full"
                  />
                  <Input
                    placeholder="Email"
                    value={offlineForm.email}
                    onChange={(e) => setOfflineForm((f) => ({ ...f, email: e.target.value }))}
                    className="bg-white rounded-full"
                  />
                  <Textarea
                    placeholder="How can we help? *"
                    value={offlineForm.message}
                    onChange={(e) => setOfflineForm((f) => ({ ...f, message: e.target.value }))}
                    className="min-h-[100px] bg-white rounded-2xl"
                  />
                  <Button
                    className="w-full text-white rounded-full h-11"
                    style={{ backgroundColor: accent }}
                    onClick={() => void submitOffline()}
                    disabled={sending}
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send message'}
                  </Button>
                  <a
                    href="tel:+919966363662"
                    className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600"
                  >
                    <Phone className="h-4 w-4" /> Or call +91 99663 63662
                  </a>
                </>
              )}
            </div>
          ) : !leadReady ? (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
              <div>
                <p className="text-[15px] font-semibold text-slate-900">Before we chat</p>
                <p className="text-sm text-slate-600 mt-1">
                  Please share your name and mobile number so we can assist you better.
                </p>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="vth-ai-guest-name"
                  className="text-[13px] font-semibold text-slate-700"
                >
                  Your name
                </label>
                <Input
                  id="vth-ai-guest-name"
                  placeholder="Full name *"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="bg-white rounded-2xl h-12"
                  autoComplete="name"
                />
              </div>
              <WhatsAppCountryPhoneRow
                idPrefix="vth-ai-guest"
                label="Mobile number"
                selectedCountry={guestCountry}
                onCountryChange={(c) => {
                  setGuestCountry(c);
                  setGuestPhoneDigits('');
                }}
                phoneDigits={guestPhoneDigits}
                onPhoneDigitsChange={setGuestPhoneDigits}
                disabled={leadSaving}
              />
              {leadError && <p className="text-xs text-rose-600">{leadError}</p>}
              <Button
                className="w-full text-white rounded-full h-11"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${ACCENT_SOFT})`,
                }}
                onClick={() => void submitLeadGate()}
                disabled={leadSaving}
              >
                {leadSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Start chatting'
                )}
              </Button>
              <p className="text-[11px] text-slate-400 text-center">
                We use this only to help with your booking enquiry.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
                {connecting && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting assistant…
                  </div>
                )}

                {showWelcome && (
                  <div className="space-y-3">
                    <p className="text-[15px] text-slate-700 leading-relaxed">
                      {timeGreeting()} Traveler! I&apos;m{' '}
                      <span className="font-semibold" style={{ color: accent }}>
                        {ASSISTANT_NAME}
                      </span>
                      , your Vizag Taxi Hub assistant. I can help with airport transfers, local
                      packages, outstation trips, Araku tours, and more.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFeedback('up')}
                        className={`p-1.5 rounded-lg border ${
                          feedback === 'up'
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                        }`}
                        aria-label="Helpful"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedback('down')}
                        className={`p-1.5 rounded-lg border ${
                          feedback === 'down'
                            ? 'border-violet-300 bg-violet-50 text-violet-700'
                            : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                        }`}
                        aria-label="Not helpful"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {contextLabel && (
                  <div className="relative py-2">
                    <div className="absolute inset-x-0 top-1/2 border-t border-slate-100" />
                    <div className="relative mx-auto w-fit max-w-[95%] rounded-full bg-slate-50 border border-slate-100 px-3 py-1 text-[11px] text-slate-500 text-center">
                      {contextLabel}
                    </div>
                  </div>
                )}

                {loading && (
                  <div className="flex justify-center py-6 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                )}

                {messages.map((m) => {
                  const mine = m.sender_type === 'visitor';
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                          mine
                            ? 'text-white rounded-br-md'
                            : 'bg-slate-50 text-slate-800 rounded-bl-md border border-slate-100'
                        }`}
                        style={
                          mine
                            ? {
                                background: `linear-gradient(135deg, ${accent}, ${ACCENT_SOFT})`,
                              }
                            : undefined
                        }
                      >
                        <p
                          className={`text-[10px] font-semibold mb-0.5 ${
                            mine ? 'text-white/80' : 'text-violet-600'
                          }`}
                        >
                          {mine ? displayGuestName : m.sender_type === 'ai' ? ASSISTANT_NAME : 'Support'}
                        </p>
                        {m.body && (
                          <p className="break-words">{renderChatBody(m.body, mine)}</p>
                        )}
                        <p
                          className={`text-[10px] mt-1.5 ${mine ? 'text-white/70' : 'text-slate-400'}`}
                        >
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {showQuickReplies && (
                  <div className="space-y-2.5 pt-1">
                    <p className="text-sm text-slate-600">Tell us how we can help you today!</p>
                    <div className="flex flex-col gap-2">
                      {quickReplies.map((q) => (
                        <button
                          key={q.id}
                          type="button"
                          disabled={sending}
                          onClick={() => void send(q.message)}
                          className="w-full text-left rounded-2xl px-4 py-3 text-sm font-medium bg-white text-slate-700 transition-colors hover:bg-violet-50/80 disabled:opacity-50"
                          style={{
                            border: '1.5px solid transparent',
                            backgroundImage: `linear-gradient(white, white), linear-gradient(90deg, #60A5FA, ${accent}, #F472B6)`,
                            backgroundOrigin: 'border-box',
                            backgroundClip: 'padding-box, border-box',
                          }}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {showMidSuggestions && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {midSuggestions.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        disabled={sending}
                        onClick={() => void send(q.message)}
                        className="rounded-full px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-violet-50 disabled:opacity-50"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
                {operatorTyping && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md bg-slate-50 border border-slate-100 px-3 py-2">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:240ms]" />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div
                className="border-t border-slate-100 px-3 pt-2 pb-3 space-y-2"
                style={{
                  background: 'linear-gradient(180deg, #F8FAFF 0%, #FFFFFF 100%)',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center rounded-full border border-slate-200 bg-white pl-4 pr-1.5 py-1 shadow-sm focus-within:border-violet-300 focus-within:ring-2 focus-within:ring-violet-100">
                    <input
                      value={text}
                      onChange={(e) => onTextChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void send(text);
                        }
                      }}
                      placeholder="Type or use voice…"
                      // text-base (16px) prevents iOS Safari zoom-on-focus
                      className="flex-1 bg-transparent text-base sm:text-sm outline-none placeholder:text-slate-400 py-2 min-w-0"
                      disabled={sending}
                      enterKeyHint="send"
                      autoComplete="off"
                      autoCorrect="on"
                    />
                    <button
                      type="button"
                      onClick={() => void toggleVoice()}
                      className={`h-9 w-9 rounded-full flex items-center justify-center text-white shrink-0 ${
                        recording ? 'bg-rose-500' : 'bg-sky-500'
                      }`}
                      aria-label={recording ? 'Stop voice' : 'Voice input'}
                    >
                      {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => void send(text)}
                      disabled={sending || !text.trim()}
                      className="ml-1 h-9 w-9 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40"
                      style={{
                        background: `linear-gradient(135deg, ${accent}, ${ACCENT_SOFT})`,
                      }}
                      aria-label="Send"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                {voiceHint && (
                  <p className="text-[11px] text-sky-600 px-1">{voiceHint}</p>
                )}                <div className="flex items-center justify-between gap-2 px-1">
                  <button
                    type="button"
                    className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1 shrink-0"
                    onClick={() => setShowCallbackForm(true)}
                  >
                    <MessageSquarePlus className="h-3 w-3" /> Prefer a callback?
                  </button>
                  <p className="text-[10px] text-slate-400 text-right leading-snug">
                    AI can make mistakes. Check important info
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setShowCallbackForm(false);
        }}
        className={
          compactFab
            ? 'group relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-6px_rgba(109,40,217,0.55)] transition-transform hover:scale-[1.03] active:scale-[0.97]'
            : 'group relative flex items-center gap-3 rounded-full pl-1.5 pr-4 py-1.5 text-left shadow-[0_12px_28px_-8px_rgba(109,40,217,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.98]'
        }
        style={{
          background: open
            ? '#0f172a'
            : `linear-gradient(135deg, ${accent}, ${ACCENT_SOFT})`,
        }}
        aria-label={open ? 'Close assistant' : `Open ${ASSISTANT_NAME}`}
        aria-expanded={open}
      >
        {compactFab ? (
          <>
            {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
            {!open && (
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
            )}
          </>
        ) : (
          <>
            <span className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white">
              {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              {!open && (
                <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
              )}
            </span>
            <span className="pr-1 text-white">
              <span className="block text-sm font-semibold leading-tight">
                {open ? 'Close' : ASSISTANT_NAME}
              </span>
              <span className="mt-0.5 block text-[11px] leading-tight text-white/80">
                {open ? 'Hide chat' : 'AI travel assistant'}
              </span>
            </span>
          </>
        )}
        {!open && unread > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center border-2 border-white bg-rose-500 text-[10px] hover:bg-rose-500">
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}
      </button>
    </div>
  );
}

export default LiveChatWidget;
