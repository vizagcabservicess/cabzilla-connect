/** Shared frontend types for Visitor Analytics + Live Chat */

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

export type VaOperatorRole = 'admin' | 'super_admin' | 'operator';

export type WsClientRole = 'visitor' | 'operator' | 'dashboard';

export interface WsEnvelope<T = unknown> {
  type: string;
  payload: T;
  requestId?: string;
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
  pincode?: string | null;
  country: string | null;
  ipAddress?: string | null;
  trafficSource: string | null;
  deviceType: DeviceType;
  browser: string | null;
  lastSeenAt: string;
}

export interface VaVisitor {
  id: string;
  site_id: string;
  visitor_key: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  pincode?: string | null;
  country: string | null;
  region: string | null;
  is_returning: number | boolean;
  first_seen_at: string;
  last_seen_at: string;
  page_views?: number;
  session_count?: number;
}

export interface VaSession {
  id: string;
  site_id: string;
  visitor_id: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  is_active: number | boolean;
  landing_page: string | null;
  exit_page: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid?: string | null;
  entry_url: string | null;
  page_count: number;
  event_count: number;
  has_recording: number | boolean;
  recording_s3_key: string | null;
  device_type: DeviceType;
  browser: string | null;
  os: string | null;
  country: string | null;
  city: string | null;
  pincode?: string | null;
  ip_address?: string | null;
  isp?: string | null;
  is_proxy?: number | boolean | null;
  is_hosting?: number | boolean | null;
  visitor_key?: string;
  is_returning?: number | boolean;
  visitor_name?: string | null;
  visitor_email?: string | null;
  visitor_phone?: string | null;
  visitor_city?: string | null;
  visitor_pincode?: string | null;
  visitor_country?: string | null;
}

export interface VaEvent {
  id: number;
  site_id: string;
  session_id: string;
  visitor_id: string;
  event_type: string;
  event_name: string | null;
  page_url: string | null;
  page_path: string | null;
  page_title: string | null;
  x: number | null;
  y: number | null;
  scroll_depth: number | null;
  element_tag: string | null;
  element_id: string | null;
  element_class: string | null;
  element_text: string | null;
  element_href: string | null;
  occurred_at: string;
  meta: Record<string, unknown> | string | null;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  deviceType: DeviceType;
}

export interface HeatmapResponse {
  grid: number;
  points: HeatmapPoint[];
}

export interface FunnelStep {
  name: string;
  event: string;
  match?: {
    path?: string;
    pathContains?: string;
    name?: string;
  };
}

export interface Funnel {
  id: string;
  site_id: string;
  name: string;
  steps: FunnelStep[];
  is_default: number | boolean;
}

export interface FunnelStepStats {
  name: string;
  event: string;
  visitors: number;
  sessions: number;
  conversionFromPrevious: number;
  dropoffFromPrevious: number;
  avgTimeFromPreviousMs: number | null;
}

export interface FunnelAnalytics {
  funnelId: string;
  name: string;
  from: string;
  to: string;
  steps: FunnelStepStats[];
  overallConversion: number;
}

export interface ReportTopItem {
  page?: string;
  vehicle?: string;
  vehicle_category?: string;
  label?: string;
  campaign?: string;
  term?: string;
  count: number;
}

export interface AnalyticsReport {
  siteId: string;
  from: string;
  to: string;
  visitorsNew: number;
  visitorsReturning: number;
  sessions: number;
  avgSessionMs: number;
  pageviews: number;
  chats: number;
  whatsappClicks?: number;
  phoneClicks?: number;
  bookingsStarted: number;
  bookingsCompleted: number;
  paymentsSuccess: number;
  topLandingPages: ReportTopItem[];
  topExitPages: ReportTopItem[];
  topVehicles: ReportTopItem[];
  topButtons: ReportTopItem[];
  topCampaigns: ReportTopItem[];
  topSearchTerms: ReportTopItem[];
}

export interface VaDailySeriesPoint {
  day: string;
  sessions: number;
  pageviews: number;
  chats: number;
  bookingsStarted: number;
  paymentsSuccess: number;
  whatsappClicks: number;
  phoneClicks: number;
}

/** Row from GET /api/admin/reports/stored */
export interface VaDailyStatRow {
  site_id: string;
  day_date: string;
  visitors_new: number;
  visitors_returning: number;
  sessions: number;
  pageviews: number;
  chats: number;
  bookings_started: number;
  bookings_completed: number;
  payments_success: number;
  avg_session_ms: number;
}

export interface AttributionDeviceRow {
  device: string;
  label: string;
  visitors: number;
  bookings: number;
  conversion: number;
}

export interface AttributionSourceRow {
  source: string;
  visitors: number;
  bookings: number;
  conversion: number;
}

export interface AttributionCampaignRow {
  campaign: string;
  visitors: number;
  bookings: number;
  conversion: number;
  utmSource: string | null;
  utmMedium: string | null;
}

export interface AttributionCityRow {
  city: string;
  pincode: string | null;
  visitors: number;
  bookings: number;
  conversion: number;
}

export type AdsClickRisk = 'high' | 'medium' | 'low';

export interface AdsClickQualityCityRow {
  city: string;
  pincode: string | null;
  adsClicks: number;
  uniqueIps: number;
  shortBounces: number;
  bounceRate: number;
  avgDurationSec: number;
  bookings: number;
  risk: AdsClickRisk;
}

export interface SuspiciousAdsIpRow {
  ip: string;
  city: string;
  pincode: string | null;
  isp?: string | null;
  isProxy?: boolean;
  isHosting?: boolean;
  adsClicks: number;
  shortBounces: number;
  bounceRate: number;
  avgDurationSec: number;
  bookings: number;
  risk: AdsClickRisk;
  flags?: string[];
}

export interface AttributionReport {
  siteId: string;
  from: string;
  to: string;
  deviceBreakdown: AttributionDeviceRow[];
  trafficSources: AttributionSourceRow[];
  googleAdsCampaigns: AttributionCampaignRow[];
  cityBreakdown?: AttributionCityRow[];
  adsClickQualityByCity?: AdsClickQualityCityRow[];
  suspiciousAdsIps?: SuspiciousAdsIpRow[];
}

export interface BookingCategoryStat {
  vehicle_category: string;
  event_type: string;
  count: number;
  revenue: number;
}

export interface BookingConversionRow {
  vehicleCategory: string;
  started: number;
  completed: number;
  paid: number;
  completionRate: number;
  paymentRate: number;
}

export interface BookingAnalyticsResponse {
  byCategory: BookingCategoryStat[];
  conversion: BookingConversionRow[];
  vehicles: Array<{ vehicle_category: string; count: number }>;
}

export interface BookingEvent {
  id: number;
  site_id: string;
  session_id: string | null;
  visitor_id: string | null;
  vehicle_category: string;
  event_type: BookingEventType;
  booking_id: string | null;
  amount: number | null;
  currency: string | null;
  page_url: string | null;
  occurred_at: string;
}

export interface VaNotification {
  id: string;
  site_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_read: number | boolean;
  created_at: string;
  meta?: Record<string, unknown> | string | null;
}

export interface RecordingChunkMeta {
  index: number;
  url: string;
  byteSize: number;
  eventCount: number;
  startedAt: string;
  endedAt: string;
}

export interface RecordingManifest {
  sessionId: string;
  startedAt: string;
  endedAt: string | null;
  hasRecording: boolean;
  chunks: RecordingChunkMeta[];
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

export interface ChatDepartment {
  id: string;
  name: string;
  description: string | null;
  is_active: number | boolean;
  sort_order: number;
}

export interface ChatOperator {
  id: string;
  site_id: string;
  user_id: number | null;
  name: string;
  email: string;
  status: OperatorStatus;
  last_seen_at: string | null;
}

export interface ChatConversation {
  id: string;
  site_id: string;
  visitor_id: string;
  session_id: string | null;
  operator_id: string | null;
  department_id: string | null;
  status: ConversationStatus;
  subject: string | null;
  source: string | null;
  vehicle_interest: string | null;
  campaign: string | null;
  location_city: string | null;
  unread_visitor: number;
  unread_operator: number;
  last_message_at: string | null;
  created_at: string;
  ai_handled?: number | boolean;
  visitor_name?: string | null;
  visitor_email?: string | null;
  visitor_phone?: string | null;
  visitor_city?: string | null;
  is_returning?: number | boolean;
  operator_name?: string | null;
}

export interface ChatMessage {
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
  seen_at: string | null;
  created_at: string;
  meta?: Record<string, unknown> | string | null;
}

export interface CannedReply {
  id: string;
  site_id: string;
  title: string;
  body: string;
  shortcut: string | null;
  department_id: string | null;
}

export interface VisitorNote {
  id: string;
  visitor_id: string;
  note: string;
  operator_id: string | null;
  created_at: string;
}

export interface VisitorTag {
  id: string;
  site_id: string;
  name: string;
  color: string | null;
}

export interface OfflineForm {
  id: string;
  site_id: string;
  visitor_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string;
  page_url: string | null;
  created_at: string;
}

export interface ChatWidgetData {
  enabled: boolean;
  aiEnabled: boolean;
  siteName: string;
  operatorsOnline: number;
  departments: ChatDepartment[];
  greeting: string;
  offlineMessage: string;
  phone: string;
}

export interface VisitorInfoResponse {
  visitor: VaVisitor;
  notes: VisitorNote[];
  tags: VisitorTag[];
  conversations: Array<{
    id: string;
    status: ConversationStatus;
    last_message_at: string | null;
    created_at: string;
    ai_handled?: number | boolean;
    operator_id: string | null;
  }>;
  sessions: Array<{
    id: string;
    started_at: string;
    ended_at: string | null;
    landing_page: string | null;
    utm_campaign: string | null;
    device_type: DeviceType;
    city: string | null;
  }>;
}

export interface VaOperatorProfile {
  id: string;
  email: string;
  name: string;
  role: VaOperatorRole;
  siteId: string;
  status?: OperatorStatus;
}

export interface AuthExchangeResponse {
  token: string;
  expiresIn: string | number;
  operator: VaOperatorProfile;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  s3Key: string;
  contentType: string;
  expiresIn: number;
  maxSize: number | null;
}

export type VaAdminTab =
  | 'live'
  | 'sessions'
  | 'heatmaps'
  | 'funnels'
  | 'bookings'
  | 'reports'
  | 'chat'
  | 'settings';
