import AsyncStorage from '@react-native-async-storage/async-storage';
import { getResolvedApiOrigin } from '../config';

const VA_API = (process.env.EXPO_PUBLIC_VA_API_BASE || 'https://vizagup.com').replace(/\/$/, '');
const SITE_KEY = process.env.EXPO_PUBLIC_VA_SITE_KEY || 'vth_pk_live_replace_me';

const VISITOR_KEY = 'va_mobile_visitor_key';
const VISITOR_ID = 'va_mobile_visitor_id';
const SESSION_ID = 'va_mobile_session_id';
const CONVERSATION_ID = 'va_mobile_conversation_id';
const GUEST_NAME = 'va_mobile_guest_name';
const GUEST_PHONE = 'va_mobile_guest_phone';

export const VTH_AI_NAME = 'VTH AI';

export type VthSender = 'visitor' | 'ai' | 'operator' | 'system';

export type VthMessage = {
  id: string;
  sender: VthSender;
  body: string;
  createdAt: string;
};

export type QuickReply = { id: string; label: string; message: string };

const listeners = new Set<() => void>();

export function openVthAi(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeVthAi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const VTH_QUICK_REPLIES: QuickReply[] = [
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

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function stored(key: string): Promise<string> {
  return (await AsyncStorage.getItem(key)) || '';
}

async function vaFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${VA_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Site-Key': SITE_KEY,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data?.error) message = data.error;
    } catch {
      // keep the status message
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function asSender(value: string): VthSender {
  switch (value) {
    case 'visitor':
    case 'ai':
    case 'operator':
    case 'system':
      return value;
    default:
      return 'system';
  }
}

export function normalizeVthMessage(raw: Record<string, unknown>): VthMessage | null {
  const id = String(raw.id || '');
  if (!id) return null;
  const sender = asSender(String(raw.sender_type || raw.senderType || 'system'));
  const created = raw.created_at ?? raw.createdAt;
  return {
    id,
    sender,
    body: String(raw.body ?? ''),
    createdAt: created ? String(created) : new Date().toISOString(),
  };
}

export async function loadSavedLead(): Promise<{ name: string; phone: string; ready: boolean }> {
  const name = (await stored(GUEST_NAME)).trim();
  const phone = (await stored(GUEST_PHONE)).replace(/\D/g, '').slice(-10);
  return { name, phone, ready: name.length >= 2 && phone.length === 10 };
}

async function ensureIdentity(): Promise<{ visitorId: string; sessionId: string }> {
  let visitorKey = await stored(VISITOR_KEY);
  if (visitorKey.length < 8) {
    visitorKey = uuid();
    await AsyncStorage.setItem(VISITOR_KEY, visitorKey);
  }
  const identity = await vaFetch<{ visitorId: string; sessionId: string }>('/api/track/identify', {
    method: 'POST',
    body: JSON.stringify({
      visitorKey,
      sessionId: (await stored(SESSION_ID)) || null,
      landingPage: '/app',
      language: 'en-IN',
      timezone: 'Asia/Kolkata',
      consentGiven: true,
      userAgent: 'VizagTaxiHubMobile',
    }),
  });
  await AsyncStorage.setItem(VISITOR_ID, identity.visitorId);
  await AsyncStorage.setItem(SESSION_ID, identity.sessionId);
  return identity;
}

export async function startVthChat(name: string, phoneDigits: string): Promise<void> {
  const phone = `+91${phoneDigits}`;
  await AsyncStorage.multiSet([
    [GUEST_NAME, name],
    [GUEST_PHONE, phoneDigits],
  ]);
  const identity = await ensureIdentity();
  await vaFetch(`/api/chat/visitors/${identity.visitorId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, phone }),
  }).catch(() => undefined);
  const existing = await stored(CONVERSATION_ID);
  if (!existing) {
    const created = await vaFetch<{ conversation: { id: string } }>('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({
        visitorId: identity.visitorId,
        sessionId: identity.sessionId,
        source: 'mobile_app',
      }),
    });
    await AsyncStorage.setItem(CONVERSATION_ID, created.conversation.id);
  }
  const origin = getResolvedApiOrigin() || 'https://www.vizagtaxihub.com';
  void fetch(`${origin}/api/track-vth-ai-lead.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, page: '/app' }),
  }).catch(() => undefined);
}

export async function loadVthMessages(): Promise<VthMessage[]> {
  const visitorId = await stored(VISITOR_ID);
  const conversationId = await stored(CONVERSATION_ID);
  if (!visitorId || !conversationId) return [];
  const data = await vaFetch<{ messages?: Record<string, unknown>[] }>(
    `/api/chat/conversations/${conversationId}/messages?visitorId=${encodeURIComponent(visitorId)}&limit=100`,
  );
  return (data.messages || [])
    .map((message) => normalizeVthMessage(message))
    .filter((message): message is VthMessage => message != null && message.body.trim().length > 0);
}

export async function sendVthMessage(body: string): Promise<VthMessage[]> {
  const visitorId = await stored(VISITOR_ID);
  const conversationId = await stored(CONVERSATION_ID);
  if (!visitorId || !conversationId) throw new Error('Chat is not ready yet');
  await vaFetch(`/api/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ visitorId, body, messageType: 'text' }),
  });
  return loadVthMessages();
}
