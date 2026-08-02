import type {
  AnalyticsReport,
  AttributionReport,
  AuthExchangeResponse,
  BookingAnalyticsResponse,
  BookingEvent,
  CannedReply,
  ChatConversation,
  ChatMessage,
  ChatMessageType,
  ChatOperator,
  ChatWidgetData,
  ConversationStatus,
  DeviceType,
  Funnel,
  FunnelAnalytics,
  FunnelStep,
  HeatmapResponse,
  HeatmapType,
  LiveVisitorSnapshot,
  OperatorStatus,
  RecordingManifest,
  UploadUrlResponse,
  VaDailyStatRow,
  VaEvent,
  VaNotification,
  VaOperatorProfile,
  VaSession,
  VaVisitor,
  VisitorInfoResponse,
  VisitorNote,
  VisitorTag,
  WsClientRole,
  WsEnvelope,
  OfflineForm,
} from '@/types/visitorAnalytics';

const API_BASE =
  (import.meta.env.VITE_VA_API_BASE as string | undefined) ||
  (import.meta.env.DEV ? '/api/va' : 'https://vizagup.com');
const WS_URL =
  (import.meta.env.VITE_VA_WS_URL as string | undefined) ||
  (import.meta.env.DEV
    ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/va-ws`
    : 'wss://vizagup.com/ws');

const VA_TOKEN_KEY = 'va_operator_token';
const VA_SITE_KEY = 'va_site_id';
const VA_OPERATOR_KEY = 'va_operator';

export function getVaApiBase(): string {
  return API_BASE.replace(/\/$/, '');
}

export function getVaWsUrl(): string {
  return WS_URL;
}

function parseJwtExpMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** VA operator JWT still valid (with 2 min skew for clock drift). */
function isVaOperatorTokenFresh(token: string): boolean {
  const expMs = parseJwtExpMs(token);
  if (!expMs) return false;
  return expMs - 120_000 > Date.now();
}

function getVaOperatorToken(): string | null {
  const token = localStorage.getItem(VA_TOKEN_KEY);
  if (!token || token === 'demo-web-only-token') return null;
  if (!isVaOperatorTokenFresh(token)) return null;
  return token;
}

export function getStoredVaToken(): string | null {
  // Only VA-issued JWT works on admin routes — never send main-site auth_token directly.
  return getVaOperatorToken();
}

export function getStoredSiteId(): string | null {
  return localStorage.getItem(VA_SITE_KEY);
}

export function getStoredOperator(): VaOperatorProfile | null {
  try {
    const raw = localStorage.getItem(VA_OPERATOR_KEY);
    return raw ? (JSON.parse(raw) as VaOperatorProfile) : null;
  } catch {
    return null;
  }
}

export function clearVaAuth(): void {
  localStorage.removeItem(VA_TOKEN_KEY);
  localStorage.removeItem(VA_SITE_KEY);
  localStorage.removeItem(VA_OPERATOR_KEY);
}

function storeAuth(res: AuthExchangeResponse): void {
  localStorage.setItem(VA_TOKEN_KEY, res.token);
  localStorage.setItem(VA_SITE_KEY, res.operator.siteId);
  localStorage.setItem(VA_OPERATOR_KEY, JSON.stringify(res.operator));
}

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getStoredVaToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function siteKeyHeaders(siteKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Site-Key': siteKey,
  };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (data?.error) return data.error;
  } catch {
    // ignore
  }
  if (res.status === 401) return 'Session expired — please log in again';
  return res.statusText || `Request failed (${res.status})`;
}

async function request<T>(
  path: string,
  init?: RequestInit & { siteKey?: string },
  retried = false,
): Promise<T> {
  const { siteKey, ...rest } = init || {};
  const headers = {
    ...(siteKey ? siteKeyHeaders(siteKey) : adminHeaders()),
    ...(rest.headers || {}),
  };

  let res: Response;
  try {
    res = await fetch(`${getVaApiBase()}${path}`, { ...rest, headers });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'network error';
    throw new Error(
      `Cannot reach Visitor Analytics API at ${getVaApiBase()} (${detail}). Start it with: npm run dev:analytics`,
    );
  }

  if (!res.ok) {
    const msg = await parseError(res);
    const isAuthPath = path.startsWith('/api/auth/');
    if (
      res.status === 401 &&
      !retried &&
      !siteKey &&
      !isAuthPath &&
      /invalid token|session expired|unauthorized/i.test(msg)
    ) {
      const siteId = getStoredSiteId() || undefined;
      clearVaAuth();
      try {
        await exchangeOperatorToken(undefined, siteId);
        return request<T>(path, init, true);
      } catch {
        throw new Error(
          msg.includes('Invalid token')
            ? 'Visitor Analytics session expired — log out and log in again, or clear site data for vizagtaxihub.com'
            : msg,
        );
      }
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function exchangeOperatorToken(
  token?: string,
  siteId?: string,
): Promise<AuthExchangeResponse> {
  const incoming = token || localStorage.getItem('auth_token');
  if (!incoming) throw new Error('No auth token available for exchange');
  const res = await request<AuthExchangeResponse>('/api/auth/exchange', {
    method: 'POST',
    body: JSON.stringify({ token: incoming, siteId }),
  });
  storeAuth(res);
  return res;
}

export async function ensureVaAuth(siteId?: string): Promise<string> {
  const existing = getVaOperatorToken();
  if (existing) return existing;
  if (localStorage.getItem(VA_TOKEN_KEY)) clearVaAuth();
  const exchanged = await exchangeOperatorToken(undefined, siteId);
  return exchanged.token;
}

export async function loginOperator(
  email: string,
  password: string,
  siteId?: string,
): Promise<AuthExchangeResponse> {
  const res = await request<AuthExchangeResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, siteId }),
  });
  storeAuth(res);
  return res;
}

export async function fetchMe(): Promise<{ operator: VaOperatorProfile; profile: ChatOperator | null }> {
  return request('/api/auth/me');
}

export async function logoutOperator(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } finally {
    clearVaAuth();
  }
}

// ---------------------------------------------------------------------------
// Admin analytics
// ---------------------------------------------------------------------------

export async function getLiveVisitors(): Promise<{ visitors: LiveVisitorSnapshot[]; count: number }> {
  return request('/api/admin/live-visitors');
}

export async function refreshLiveVisitors(): Promise<{ visitors: LiveVisitorSnapshot[]; count: number }> {
  return request('/api/admin/live-visitors/refresh', { method: 'POST' });
}

export async function listSessions(opts: {
  from?: string;
  to?: string;
  hasRecording?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<{ sessions: VaSession[] }> {
  return request(
    `/api/admin/sessions${qs({
      from: opts.from,
      to: opts.to,
      hasRecording: opts.hasRecording === undefined ? undefined : opts.hasRecording ? '1' : '0',
      limit: opts.limit,
      offset: opts.offset,
    })}`,
  );
}

export async function getSession(id: string): Promise<{ session: VaSession }> {
  return request(`/api/admin/sessions/${id}`);
}

export async function listVisitors(opts: {
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ visitors: VaVisitor[] }> {
  return request(`/api/admin/visitors${qs({ q: opts.q, limit: opts.limit, offset: opts.offset })}`);
}

export async function getVisitor(id: string): Promise<{ visitor: VaVisitor; sessions: VaSession[] }> {
  return request(`/api/admin/visitors/${id}`);
}

export async function listEvents(opts: {
  sessionId?: string;
  visitorId?: string;
  type?: string;
  limit?: number;
} = {}): Promise<{ events: VaEvent[] }> {
  return request(
    `/api/admin/events${qs({
      sessionId: opts.sessionId,
      visitorId: opts.visitorId,
      type: opts.type,
      limit: opts.limit,
    })}`,
  );
}

export async function getRecording(sessionId: string): Promise<{ recording: RecordingManifest }> {
  return request(`/api/admin/recordings/${sessionId}`);
}

export async function getRecordingChunkData(
  sessionId: string,
  chunkIndex: number,
): Promise<{ events: unknown[] }> {
  return request(`/api/admin/recordings/${sessionId}/chunks/${chunkIndex}/data`);
}

export async function getRecordingChunks(
  sessionId: string,
): Promise<{
  chunks: Array<{
    chunk_index: number;
    s3_key: string;
    byte_size: number;
    event_count: number;
    started_at: string;
    ended_at: string;
  }>;
}> {
  return request(`/api/admin/recordings/${sessionId}/chunks`);
}

export async function getHeatmap(opts: {
  pagePath: string;
  type?: HeatmapType;
  from: string;
  to: string;
  device?: DeviceType | 'all';
  campaign?: string;
}): Promise<HeatmapResponse> {
  return request(
    `/api/admin/heatmaps${qs({
      pagePath: opts.pagePath,
      type: opts.type || 'click',
      from: opts.from,
      to: opts.to,
      device: opts.device || 'all',
      campaign: opts.campaign,
    })}`,
  );
}

export async function listFunnels(): Promise<{ funnels: Funnel[] }> {
  return request('/api/admin/funnels');
}

export async function getFunnel(id: string): Promise<{ funnel: Funnel }> {
  return request(`/api/admin/funnels/${id}`);
}

export async function createFunnel(input: {
  name: string;
  steps: FunnelStep[];
  isDefault?: boolean;
}): Promise<{ funnel: Funnel }> {
  return request('/api/admin/funnels', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateFunnel(
  id: string,
  patch: { name?: string; steps?: FunnelStep[]; isDefault?: boolean },
): Promise<{ funnel: Funnel }> {
  return request(`/api/admin/funnels/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
}

export async function deleteFunnel(id: string): Promise<{ ok: boolean }> {
  return request(`/api/admin/funnels/${id}`, { method: 'DELETE' });
}

export async function getFunnelAnalytics(
  id: string,
  from: string,
  to: string,
): Promise<{ analytics: FunnelAnalytics }> {
  return request(`/api/admin/funnels/${id}/analytics${qs({ from, to })}`);
}

export async function getDailyReport(day?: string): Promise<{ report: AnalyticsReport }> {
  return request(`/api/admin/reports/daily${qs({ day })}`);
}

export async function getAttributionReport(
  from?: string,
  to?: string,
): Promise<{ report: AttributionReport }> {
  return request(`/api/admin/reports/attribution${qs({ from, to })}`);
}

export async function getWeeklyReport(end?: string): Promise<{ report: AnalyticsReport }> {
  return request(`/api/admin/reports/weekly${qs({ end })}`);
}

export async function getMonthlyReport(month?: string): Promise<{ report: AnalyticsReport }> {
  return request(`/api/admin/reports/monthly${qs({ month })}`);
}

export async function getStoredDailyStats(
  from: string,
  to: string,
): Promise<{ stats: VaDailyStatRow[] }> {
  return request(`/api/admin/reports/stored${qs({ from, to })}`);
}

export async function getBookingAnalytics(
  from: string,
  to: string,
): Promise<BookingAnalyticsResponse> {
  return request(`/api/admin/bookings/stats${qs({ from, to })}`);
}

export async function listBookingEvents(opts: {
  from?: string;
  to?: string;
  category?: string;
  limit?: number;
} = {}): Promise<{ events: BookingEvent[] }> {
  return request(
    `/api/admin/bookings/events${qs({
      from: opts.from,
      to: opts.to,
      category: opts.category,
      limit: opts.limit,
    })}`,
  );
}

export async function listNotifications(
  limit = 50,
): Promise<{ notifications: VaNotification[]; unread: number }> {
  return request(`/api/admin/notifications${qs({ limit })}`);
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return request(`/api/admin/notifications/${id}/read`, { method: 'POST' });
}

export async function listAdminOperators(): Promise<{ operators: ChatOperator[] }> {
  return request('/api/admin/operators');
}

export async function setOperatorStatus(status: OperatorStatus): Promise<{ ok: boolean; status: OperatorStatus }> {
  return request('/api/admin/operators/status', {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Chat — visitor (site key)
// ---------------------------------------------------------------------------

export async function getChatWidget(siteKey: string): Promise<ChatWidgetData> {
  return request('/api/chat/widget', { siteKey });
}

export async function getVisitorUnread(
  siteKey: string,
  visitorId: string,
): Promise<{ unread: number }> {
  return request(`/api/chat/unread${qs({ visitorId })}`, { siteKey });
}

export async function createVisitorConversation(
  siteKey: string,
  body: {
    visitorId: string;
    sessionId?: string | null;
    departmentId?: string | null;
    subject?: string | null;
    source?: string | null;
    vehicleInterest?: string | null;
    campaign?: string | null;
    locationCity?: string | null;
  },
): Promise<{ conversation: ChatConversation }> {
  return request('/api/chat/conversations', {
    method: 'POST',
    siteKey,
    body: JSON.stringify(body),
  });
}

export async function getVisitorMessages(
  siteKey: string,
  conversationId: string,
  visitorId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<{ messages: ChatMessage[] }> {
  return request(
    `/api/chat/conversations/${conversationId}/messages${qs({
      visitorId,
      limit: opts.limit,
      before: opts.before,
    })}`,
    { siteKey },
  );
}

export async function sendVisitorMessage(
  siteKey: string,
  conversationId: string,
  body: {
    visitorId: string;
    body?: string | null;
    messageType?: ChatMessageType;
    attachmentS3Key?: string | null;
    attachmentMime?: string | null;
    attachmentName?: string | null;
    attachmentSize?: number | null;
    meta?: Record<string, unknown> | null;
  },
): Promise<{ message: ChatMessage }> {
  return request(`/api/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    siteKey,
    body: JSON.stringify(body),
  });
}

export async function setVisitorTyping(
  siteKey: string,
  conversationId: string,
  visitorId: string,
  isTyping: boolean,
): Promise<{ ok: boolean }> {
  return request(`/api/chat/conversations/${conversationId}/typing`, {
    method: 'POST',
    siteKey,
    body: JSON.stringify({ visitorId, isTyping }),
  });
}

export async function markVisitorSeen(
  siteKey: string,
  conversationId: string,
  visitorId: string,
  upToMessageId?: string,
): Promise<{ ok: boolean }> {
  return request(`/api/chat/conversations/${conversationId}/seen`, {
    method: 'POST',
    siteKey,
    body: JSON.stringify({ visitorId, upToMessageId }),
  });
}

export async function createVisitorUploadUrl(
  siteKey: string,
  body: { conversationId: string; fileName: string; contentType: string; size?: number },
): Promise<UploadUrlResponse> {
  return request('/api/chat/upload-url', {
    method: 'POST',
    siteKey,
    body: JSON.stringify(body),
  });
}

export async function submitOfflineForm(
  siteKey: string,
  body: {
    visitorId?: string | null;
    name: string;
    email?: string | null;
    phone?: string | null;
    message: string;
    pageUrl?: string | null;
  },
): Promise<{ form: OfflineForm }> {
  return request('/api/chat/offline-form', {
    method: 'POST',
    siteKey,
    body: JSON.stringify(body),
  });
}

export async function updateVisitorContactPublic(
  siteKey: string,
  visitorId: string,
  patch: { name?: string; email?: string; phone?: string },
): Promise<{ visitor: VaVisitor }> {
  return request(`/api/chat/visitors/${visitorId}`, {
    method: 'PATCH',
    siteKey,
    body: JSON.stringify(patch),
  });
}

// ---------------------------------------------------------------------------
// Chat — operator
// ---------------------------------------------------------------------------

export async function listInbox(opts: {
  status?: ConversationStatus | string;
  operatorId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ conversations: ChatConversation[] }> {
  return request(
    `/api/chat/inbox${qs({
      status: opts.status,
      operatorId: opts.operatorId,
      limit: opts.limit,
      offset: opts.offset,
    })}`,
  );
}

export async function getOperatorUnread(): Promise<{ unread: number }> {
  return request('/api/chat/operator/unread');
}

export async function getOperatorConversation(
  id: string,
): Promise<{ conversation: ChatConversation }> {
  return request(`/api/chat/operator/conversations/${id}`);
}

export async function getOperatorMessages(
  conversationId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<{ messages: ChatMessage[] }> {
  return request(
    `/api/chat/operator/conversations/${conversationId}/messages${qs({
      limit: opts.limit,
      before: opts.before,
    })}`,
  );
}

export async function sendOperatorMessage(
  conversationId: string,
  body: {
    body?: string | null;
    messageType?: ChatMessageType;
    attachmentS3Key?: string | null;
    attachmentMime?: string | null;
    attachmentName?: string | null;
    attachmentSize?: number | null;
    meta?: Record<string, unknown> | null;
  },
): Promise<{ message: ChatMessage }> {
  return request(`/api/chat/operator/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function setOperatorTyping(
  conversationId: string,
  isTyping: boolean,
): Promise<{ ok: boolean }> {
  return request(`/api/chat/operator/conversations/${conversationId}/typing`, {
    method: 'POST',
    body: JSON.stringify({ isTyping }),
  });
}

export async function markOperatorSeen(
  conversationId: string,
  upToMessageId?: string,
): Promise<{ ok: boolean }> {
  return request(`/api/chat/operator/conversations/${conversationId}/seen`, {
    method: 'POST',
    body: JSON.stringify({ upToMessageId }),
  });
}

export async function assignConversation(
  conversationId: string,
  operatorId?: string,
): Promise<{ conversation: ChatConversation }> {
  return request(`/api/chat/operator/conversations/${conversationId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ operatorId }),
  });
}

export async function resolveConversation(
  conversationId: string,
  status?: ConversationStatus,
): Promise<{ conversation: ChatConversation }> {
  return request(`/api/chat/operator/conversations/${conversationId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function exportConversation(conversationId: string): Promise<unknown> {
  return request(`/api/chat/operator/conversations/${conversationId}/export`);
}

export async function createOperatorUploadUrl(body: {
  conversationId: string;
  fileName: string;
  contentType: string;
  size?: number;
}): Promise<UploadUrlResponse> {
  return request('/api/chat/operator/upload-url', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getOperatorVisitorInfo(visitorId: string): Promise<VisitorInfoResponse> {
  return request(`/api/chat/operator/visitors/${visitorId}`);
}

export async function listCannedReplies(departmentId?: string): Promise<{ replies: CannedReply[] }> {
  return request(`/api/chat/canned-replies${qs({ departmentId })}`);
}

export async function createCannedReply(body: {
  title: string;
  body: string;
  shortcut?: string | null;
  departmentId?: string | null;
}): Promise<{ reply: CannedReply }> {
  return request('/api/chat/canned-replies', { method: 'POST', body: JSON.stringify(body) });
}

export async function deleteCannedReply(id: string): Promise<{ ok: boolean }> {
  return request(`/api/chat/canned-replies/${id}`, { method: 'DELETE' });
}

export async function listVisitorNotes(visitorId: string): Promise<{ notes: VisitorNote[] }> {
  return request(`/api/chat/visitors/${visitorId}/notes`);
}

export async function addVisitorNote(
  visitorId: string,
  note: string,
): Promise<{ note: VisitorNote }> {
  return request(`/api/chat/visitors/${visitorId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function listSiteTags(): Promise<{ tags: VisitorTag[] }> {
  return request('/api/chat/tags');
}

export async function listVisitorTags(visitorId: string): Promise<{ tags: VisitorTag[] }> {
  return request(`/api/chat/visitors/${visitorId}/tags`);
}

export async function tagVisitor(
  visitorId: string,
  name: string,
  color?: string,
): Promise<{ tags: VisitorTag[] }> {
  return request(`/api/chat/visitors/${visitorId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}

export async function untagVisitor(visitorId: string, tagId: string): Promise<{ ok: boolean }> {
  return request(`/api/chat/visitors/${visitorId}/tags/${tagId}`, { method: 'DELETE' });
}

export async function listOfflineForms(limit = 50): Promise<{ forms: OfflineForm[] }> {
  return request(`/api/chat/offline-forms${qs({ limit })}`);
}

export async function listChatOperators(): Promise<{ operators: ChatOperator[] }> {
  return request('/api/chat/operators');
}

export async function uploadToPresignedUrl(
  uploadUrl: string,
  file: Blob,
  contentType: string,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error('Upload failed');
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

export type VaWsHandler = (msg: WsEnvelope) => void;

export class VaWebSocket {
  private ws: WebSocket | null = null;
  private handlers = new Set<VaWsHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private opts: {
      role: WsClientRole;
      siteId: string;
      token?: string;
      visitorId?: string;
      conversationId?: string;
      sessionId?: string;
    },
  ) {}

  connect(): void {
    this.closed = false;
    const url = new URL(getVaWsUrl());
    url.searchParams.set('role', this.opts.role);
    url.searchParams.set('siteId', this.opts.siteId);
    if (this.opts.token) url.searchParams.set('token', this.opts.token);
    if (this.opts.visitorId) url.searchParams.set('visitorId', this.opts.visitorId);
    if (this.opts.conversationId) url.searchParams.set('conversationId', this.opts.conversationId);
    if (this.opts.sessionId) url.searchParams.set('sessionId', this.opts.sessionId);

    this.ws = new WebSocket(url.toString());
    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as WsEnvelope;
        for (const h of this.handlers) h(msg);
      } catch {
        // ignore
      }
    };
    this.ws.onopen = () => {
      this.pingTimer = setInterval(() => {
        this.send({ type: 'ping', payload: { t: Date.now() } });
      }, 25_000);
    };
    this.ws.onclose = () => {
      if (this.pingTimer) clearInterval(this.pingTimer);
      this.pingTimer = null;
      if (!this.closed) {
        this.reconnectTimer = setTimeout(() => this.connect(), 2500);
      }
    };
  }

  on(handler: VaWsHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  send(envelope: WsEnvelope): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(envelope));
    }
  }

  subscribeConversation(conversationId: string): void {
    this.send({ type: 'subscribe.conversation', payload: { conversationId } });
  }

  unsubscribeConversation(): void {
    this.send({ type: 'unsubscribe.conversation', payload: {} });
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const visitorAnalyticsAPI = {
  getVaApiBase,
  getVaWsUrl,
  ensureVaAuth,
  exchangeOperatorToken,
  loginOperator,
  fetchMe,
  logoutOperator,
  getLiveVisitors,
  refreshLiveVisitors,
  listSessions,
  getSession,
  listVisitors,
  getVisitor,
  listEvents,
  getRecording,
  getRecordingChunkData,
  getRecordingChunks,
  getHeatmap,
  listFunnels,
  getFunnel,
  createFunnel,
  updateFunnel,
  deleteFunnel,
  getFunnelAnalytics,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getStoredDailyStats,
  getBookingAnalytics,
  listBookingEvents,
  listNotifications,
  markNotificationRead,
  listAdminOperators,
  setOperatorStatus,
  getChatWidget,
  getVisitorUnread,
  createVisitorConversation,
  getVisitorMessages,
  sendVisitorMessage,
  setVisitorTyping,
  markVisitorSeen,
  createVisitorUploadUrl,
  submitOfflineForm,
  updateVisitorContactPublic,
  listInbox,
  getOperatorUnread,
  getOperatorConversation,
  getOperatorMessages,
  sendOperatorMessage,
  setOperatorTyping,
  markOperatorSeen,
  assignConversation,
  resolveConversation,
  exportConversation,
  createOperatorUploadUrl,
  getOperatorVisitorInfo,
  listCannedReplies,
  createCannedReply,
  deleteCannedReply,
  listVisitorNotes,
  addVisitorNote,
  listSiteTags,
  listVisitorTags,
  tagVisitor,
  untagVisitor,
  listOfflineForms,
  listChatOperators,
  uploadToPresignedUrl,
  VaWebSocket,
};

export default visitorAnalyticsAPI;
