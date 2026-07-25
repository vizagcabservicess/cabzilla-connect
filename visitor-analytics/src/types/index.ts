export type DeviceType = 'desktop' | 'tablet' | 'mobile' | 'unknown';

export type HeatmapType = 'click' | 'scroll' | 'move';

export type ChatSenderType = 'visitor' | 'operator' | 'ai' | 'system';

export type ChatMessageType = 'text' | 'image' | 'file' | 'voice' | 'emoji' | 'system';

export type ConversationStatus =
  | 'open'
  | 'pending'
  | 'assigned'
  | 'resolved'
  | 'missed'
  | 'offline';

export type OperatorStatus = 'online' | 'away' | 'offline';

export type NotificationType =
  | 'new_visitor'
  | 'new_chat'
  | 'booking_started'
  | 'booking_completed'
  | 'payment_success'
  | 'missed_chat';

export type BookingEventType =
  | 'quote_request'
  | 'booking_form'
  | 'phone_call'
  | 'whatsapp_click'
  | 'payment_success'
  | 'booking_completed'
  | 'booking_started';

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
  | 'custom';

export interface VisitorIdentity {
  visitorId: string;
  visitorKey: string;
  sessionId: string;
  isReturning: boolean;
}

export interface GeoInfo {
  country: string | null;
  city: string | null;
  region: string | null;
  /** Postal / PIN code (India PIN when available from IP geo) */
  pincode: string | null;
  timezone: string | null;
  /** ISP / carrier name from IP lookup */
  isp: string | null;
  /** Org / ASN label (often shows datacenter / hosting) */
  ipOrg: string | null;
  /** VPN / proxy / Tor style exit */
  isProxy: boolean;
  /** Datacenter / hosting IP — common for bots & click farms */
  isHosting: boolean;
  /** Mobile carrier IP */
  isMobileNet: boolean;
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

export interface IncomingEvent {
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

export interface LiveVisitorSnapshot {
  visitorId: string;
  sessionId: string;
  isReturning: boolean;
  currentPage: string;
  timeOnPageMs: number;
  mouseX: number | null;
  mouseY: number | null;
  city: string | null;
  pincode: string | null;
  country: string | null;
  ipAddress: string | null;
  trafficSource: string | null;
  deviceType: DeviceType;
  browser: string | null;
  lastSeenAt: string;
}

export interface JwtOperatorPayload {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'super_admin' | 'operator';
  siteId: string;
  operatorId?: string;
}

export type WsClientRole = 'visitor' | 'operator' | 'dashboard';

export interface WsEnvelope<T = unknown> {
  type: string;
  payload: T;
  requestId?: string;
}
