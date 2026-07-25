/** Shared SDK types aligned with visitor-analytics backend. */

export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'unknown';

export type TrackerEventType =
  | 'page_view'
  | 'mouse_move'
  | 'scroll'
  | 'click'
  | 'double_click'
  | 'right_click'
  | 'form_focus'
  | 'form_blur'
  | 'form_submit'
  | 'phone_click'
  | 'whatsapp_click'
  | 'email_click'
  | 'booking_started'
  | 'booking_completed'
  | 'razorpay_payment'
  | 'popup_opened'
  | 'popup_closed'
  | 'visibility_change'
  | 'resize'
  | 'tab_switch'
  | 'search'
  | 'custom';

export interface VTHAnalyticsConfig {
  siteKey: string;
  apiBase?: string;
  wsUrl?: string;
  recording?: boolean;
  requireConsent?: boolean;
  maskSelectors?: string[];
  batchIntervalMs?: number;
  batchMaxEvents?: number;
  mouseThrottleMs?: number;
  scrollThrottleMs?: number;
  debug?: boolean;
}

export interface ResolvedConfig {
  siteKey: string;
  apiBase: string;
  wsUrl: string;
  recording: boolean;
  requireConsent: boolean;
  maskSelectors: string[];
  batchIntervalMs: number;
  batchMaxEvents: number;
  mouseThrottleMs: number;
  scrollThrottleMs: number;
  debug: boolean;
}

export interface DeviceInfo {
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  deviceType: DeviceType;
  screenWidth: number | null;
  screenHeight: number | null;
  language: string | null;
  userAgent: string | null;
  timezone: string | null;
}

export interface UtmInfo {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  /** Google Ads auto-tagging (`gad_source=1`) */
  gadSource: string | null;
  gadCampaignId: string | null;
  referrer: string | null;
  landingPage: string | null;
}

export interface VisitorIdentity {
  visitorKey: string;
  sessionId: string;
  visitorId: string | null;
  isReturning: boolean;
}

export interface TrackerEvent {
  type: TrackerEventType | string;
  name?: string;
  pageUrl?: string;
  pagePath?: string;
  pageTitle?: string;
  x?: number;
  y?: number;
  scrollDepth?: number;
  viewportW?: number;
  viewportH?: number;
  elementTag?: string;
  elementId?: string;
  elementClass?: string;
  elementText?: string;
  elementHref?: string;
  formName?: string;
  meta?: Record<string, unknown>;
  occurredAt: string;
}

export interface IdentifyPayload {
  siteKey: string;
  visitorKey: string;
  sessionId: string | null;
  device: DeviceInfo;
  utm: UtmInfo;
  consentGiven: boolean;
  language: string | null;
  timezone: string | null;
}

export interface IdentifyResponse {
  visitorId: string;
  visitorKey: string;
  sessionId: string;
  isReturning: boolean;
}

export interface EventBatchPayload {
  siteKey: string;
  visitorId: string;
  sessionId: string;
  events: TrackerEvent[];
}

export interface RecordingChunkPayload {
  siteKey: string;
  visitorId: string;
  sessionId: string;
  chunkIndex: number;
  events: unknown[];
  startedAt: string;
  endedAt: string;
  compressed?: boolean;
  encoding?: 'gzip-base64' | 'json';
  data?: string;
}

export type RecordingOp =
  | { t: number; op: 'full'; html: string; w: number; h: number }
  | { t: number; op: 'mut'; mutations: SerializedMutation[] }
  | { t: number; op: 'mm'; x: number; y: number }
  | { t: number; op: 'click'; x: number; y: number; button: number }
  | { t: number; op: 'scroll'; x: number; y: number; d: number }
  | { t: number; op: 'input'; sel: string; v: string }
  | { t: number; op: 'key'; k: string; sel?: string }
  | { t: number; op: 'resize'; w: number; h: number }
  | { t: number; op: 'vis'; state: string }
  | { t: number; op: 'focus' }
  | { t: number; op: 'blur' };

export interface SerializedMutation {
  type: 'childList' | 'attributes' | 'characterData';
  target: string;
  attributeName?: string | null;
  oldValue?: string | null;
  added?: string[];
  removed?: string[];
  text?: string;
}

export interface ChatBridgeApi {
  onVisitorMessage: (handler: (msg: ChatOutboundMessage) => void) => () => void;
  sendOperatorMessage: (msg: ChatInboundMessage) => void;
  openChat: () => void;
  closeChat: () => void;
  setTyping: (typing: boolean) => void;
  getVisitorContext: () => ChatVisitorContext;
}

export interface ChatOutboundMessage {
  text: string;
  meta?: Record<string, unknown>;
  at: string;
}

export interface ChatInboundMessage {
  text: string;
  from?: 'operator' | 'ai' | 'system';
  meta?: Record<string, unknown>;
}

export interface ChatVisitorContext {
  visitorKey: string;
  sessionId: string;
  visitorId: string | null;
  pageUrl: string;
  isReturning: boolean;
}

export interface VisitorAnalyticsPublicApi {
  init: (config?: Partial<VTHAnalyticsConfig>) => void;
  trackInteraction: (
    name: string,
    metaOrCategory?: Record<string, unknown> | string,
    data?: Record<string, unknown>,
  ) => void;
  trackPageView: (path?: string, meta?: Record<string, unknown>) => void;
  trackSearch: (query: string, meta?: Record<string, unknown>) => void;
  trackClick: (target?: Element | string, meta?: Record<string, unknown>) => void;
  trackScroll: (depth?: number, meta?: Record<string, unknown>) => void;
  trackFormSubmission: (formName?: string, meta?: Record<string, unknown>) => void;
  trackConversion: (name: string, meta?: Record<string, unknown>) => void;
  flush: () => Promise<void>;
  destroy: () => void;
  getIdentity: () => VisitorIdentity | null;
  chat: ChatBridgeApi;
}
