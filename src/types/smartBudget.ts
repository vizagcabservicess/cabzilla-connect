/** Smart Budget Marketplace domain types */

export type SmartBudgetSessionStatus =
  | 'link_sent'
  | 'budget_submitted'
  | 'admin_priority'
  | 'marketplace'
  | 'admin_assigned'
  | 'vendor_claimed'
  | 'chat_open'
  | 'fee_paid'
  | 'completed'
  | 'expired'
  | 'cancelled';

export type SmartBudgetSenderRole = 'admin' | 'customer' | 'vendor';

export type SmartBudgetPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type SmartBudgetOfferStatus = 'pending' | 'skipped' | 'accepted' | 'closed';

export const SMART_BUDGET_TERMINAL_STATUSES: SmartBudgetSessionStatus[] = [
  'completed',
  'expired',
  'cancelled',
];

export const SMART_BUDGET_CHAT_STATUSES: SmartBudgetSessionStatus[] = [
  'admin_assigned',
  'vendor_claimed',
  'chat_open',
  'fee_paid',
  'completed',
];

export const SMART_BUDGET_POLL_INTERVAL_MS = 15_000;

/** Defaults match the product brief (link 20m, admin priority 3m). */
export const SMART_BUDGET_DEFAULTS = {
  linkTtlMinutes: 20,
  adminPriorityMinutes: 3,
  bookingFeePercent: 10,
  /** After vendor/admin accept — unlock fee must be paid within this window. */
  feeTtlMinutes: 10,
  /** Fallback until admin setting / public config loads. */
  budgetMinOfWebsiteFarePercent: 70,
} as const;

export interface SmartBudgetPublicConfig {
  budget_min_of_website_fare_percent: number;
  booking_fee_percent: number;
  link_ttl_minutes: number;
  admin_priority_minutes: number;
  fee_ttl_minutes: number;
}

/** Minimum allowed customer budget from website original fare; null when unrestricted (custom / no fare). */
export function smartBudgetMinBudgetFromWebsiteFare(
  websiteFare: number | null | undefined,
  options?: { isCustomItinerary?: boolean; minPercent?: number }
): number | null {
  if (options?.isCustomItinerary) return null;
  if (websiteFare == null || !Number.isFinite(websiteFare) || websiteFare <= 0) return null;
  const pct =
    options?.minPercent != null && Number.isFinite(options.minPercent)
      ? options.minPercent
      : SMART_BUDGET_DEFAULTS.budgetMinOfWebsiteFarePercent;
  const clamped = Math.min(100, Math.max(1, pct));
  return Math.ceil((websiteFare * clamped) / 100);
}

export interface SmartBudgetContacts {
  customerName?: string | null;
  customerPhone?: string | null;
  customerPhoneMasked?: string | null;
  vendorName?: string | null;
  vendorPhone?: string | null;
  vendorPhoneMasked?: string | null;
  driverName?: string | null;
  vehicleNumber?: string | null;
}

export interface SmartBudgetSession {
  id: number;
  token: string;
  status: SmartBudgetSessionStatus;
  pickup: string;
  drop_location: string;
  trip_datetime: string;
  vehicle_type: string;
  passengers: number;
  special_requests?: string | null;
  quoted_fare?: number | null;
  customer_budget?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_phone_masked?: string | null;
  link_expires_at: string;
  admin_priority_ends_at?: string | null;
  marketplace_expires_at?: string | null;
  fee_due_at?: string | null;
  claimed_vendor_id?: number | null;
  admin_vehicle_assigned?: boolean;
  driver_name?: string | null;
  vehicle_number?: string | null;
  vendor_name?: string | null;
  vendor_phone?: string | null;
  vendor_phone_masked?: string | null;
  contacts_unlocked: boolean;
  booking_fee_amount?: number | null;
  payment_status?: SmartBudgetPaymentStatus | null;
  cancelled_by?: SmartBudgetSenderRole | null;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  whatsapp_url?: string | null;
  customer_url?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface SmartBudgetVendor {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  rating: number;
  vehicle_types: string[];
  /** When true, vendor receives every cab type (not only their primary / listed types). */
  accept_any_vehicle_type?: boolean;
  is_active: boolean;
  verification_status?: SmartBudgetVendorVerification;
  tier?: SmartBudgetVendorTier;
  notes?: string | null;
  trips_completed?: number;
  acceptance_rate?: number;
  cancellation_rate?: number;
  on_time_rate?: number;
  /** Can be negative when cancel penalties are applied. */
  wallet_balance?: number;
  profile_image_url?: string | null;
  primary_vehicle_number?: string | null;
  primary_vehicle_type?: string | null;
  documents?: {
    pan?: string | null;
    aadhaar?: string | null;
    rc?: string | null;
    insurance?: string | null;
    dl?: string | null;
    pollution?: string | null;
    permit?: string | null;
  };
  /** Per-document review (includes profile). Locked after upload until admin requests re-upload. */
  document_reviews?: Partial<
    Record<
      SmartBudgetDocKey,
      SmartBudgetDocumentReview
    >
  >;
  onboarding_submitted_at?: string | null;
  stats?: SmartBudgetVendorStats;
  created_at?: string;
  updated_at?: string;
}

export type SmartBudgetDocKey =
  | 'profile'
  | 'pan'
  | 'aadhaar'
  | 'rc'
  | 'insurance'
  | 'dl'
  | 'pollution'
  | 'permit';

export type SmartBudgetDocReviewStatus =
  | 'missing'
  | 'uploaded'
  | 'approved'
  | 'reupload_required'
  | 'expired';

export interface SmartBudgetDocumentReview {
  status: SmartBudgetDocReviewStatus;
  reason?: string | null;
  expires_at?: string | null;
  reviewed_at?: string | null;
  can_upload: boolean;
  locked: boolean;
  url?: string | null;
}

export type SmartBudgetVendorVerification = 'pending' | 'approved' | 'rejected' | 'more_docs';

export type SmartBudgetVendorTier = 'silver' | 'gold' | 'platinum';

export interface SmartBudgetVendorStats {
  claimed_sessions: number;
  completed_sessions: number;
  open_sessions: number;
  offers_received: number;
  offers_accepted: number;
  computed_acceptance_rate: number;
}

export interface SmartBudgetVendorSummary {
  total: number;
  active: number;
  pending: number;
  approved: number;
  rejected: number;
  more_docs: number;
}

export interface SmartBudgetCustomer {
  id: number;
  phone: string;
  name?: string | null;
  has_password?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SmartBudgetCustomerAuth {
  token: string;
  customer: SmartBudgetCustomer;
}

/** Admin list row: portal customer and/or session phone with bids. */
export interface SmartBudgetAdminCustomer {
  id?: number | null;
  phone: string;
  name?: string | null;
  has_portal_login: boolean;
  sessions_count: number;
  active_count: number;
  /** Trips posted via offer-link WhatsApp OTP. */
  otp_link_count?: number;
  /** Trips posted via customer portal after signup OTP. */
  portal_trip_count?: number;
  max_budget?: number | null;
  last_activity?: string | null;
  created_at?: string | null;
}

export interface SmartBudgetAdminCustomerSummary {
  total: number;
  with_portal: number;
  with_bids: number;
  otp_link_trips?: number;
  portal_trips?: number;
}

export interface CreateSmartBudgetVendorInput {
  name: string;
  phone: string;
  email?: string | null;
  password?: string;
  rating?: number;
  vehicle_types?: string[];
  accept_any_vehicle_type?: boolean;
  is_active?: boolean;
  verification_status?: SmartBudgetVendorVerification;
  tier?: SmartBudgetVendorTier;
  notes?: string | null;
}

export interface UpdateSmartBudgetVendorInput {
  vendor_id: number;
  name?: string;
  phone?: string;
  email?: string | null;
  rating?: number;
  vehicle_types?: string[];
  accept_any_vehicle_type?: boolean;
  is_active?: boolean;
  verification_status?: SmartBudgetVendorVerification;
  tier?: SmartBudgetVendorTier;
  notes?: string | null;
}

export interface SmartBudgetVendorAuth {
  vendor: SmartBudgetVendor;
  token: string;
}

export interface SmartBudgetLead {
  id: number;
  session_id: number;
  status: SmartBudgetOfferStatus;
  pickup: string;
  drop_location: string;
  trip_datetime: string;
  vehicle_type: string;
  passengers: number;
  customer_budget: number;
  special_requests?: string | null;
  marketplace_expires_at?: string | null;
  created_at: string;
}

export interface SmartBudgetMessage {
  id: number;
  session_id: number;
  sender_role: SmartBudgetSenderRole;
  sender_name?: string | null;
  body: string;
  created_at: string;
}

export interface SmartBudgetPayment {
  id: number;
  session_id: number;
  amount: number;
  currency: string;
  status: SmartBudgetPaymentStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  created_at: string;
}

export interface CreateSmartBudgetSessionInput {
  pickup: string;
  drop_location: string;
  trip_datetime: string;
  vehicle_type: string;
  passengers: number;
  quoted_fare?: number | null;
  customer_name: string;
  customer_phone?: string | null;
  special_requests?: string | null;
  link_ttl_minutes?: number;
  admin_priority_minutes?: number;
}

export interface CreateSmartBudgetCustomerTripInput {
  pickup: string;
  drop_location: string;
  trip_datetime: string;
  vehicle_type: string;
  passengers: number;
  customer_budget: number;
  customer_name: string;
  quoted_fare?: number | null;
  /** When true, skip the 70% website-fare budget floor. */
  is_custom_itinerary?: boolean;
  special_requests?: string | null;
  link_ttl_minutes?: number;
}

export interface SubmitSmartBudgetBudgetInput {
  token: string;
  customer_budget: number;
  customer_name: string;
  customer_phone: string;
  /** WhatsApp OTP required to post / confirm budget. */
  otp: string;
  special_requests?: string;
  /** Optional trip edits while status is still link_sent / pre-marketplace. */
  pickup?: string;
  drop_location?: string;
  trip_datetime?: string;
  vehicle_type?: string;
  passengers?: number;
}

export interface CreateUnlockPaymentResult {
  payment_id: number;
  amount: number;
  currency: string;
  razorpay_order_id: string;
  razorpay_key: string;
}

export function isSmartBudgetTerminal(status: SmartBudgetSessionStatus): boolean {
  return SMART_BUDGET_TERMINAL_STATUSES.includes(status);
}

export function canSmartBudgetChat(status: SmartBudgetSessionStatus): boolean {
  return SMART_BUDGET_CHAT_STATUSES.includes(status);
}

export function computeBookingFee(budgetOrFare: number, percent = SMART_BUDGET_DEFAULTS.bookingFeePercent): number {
  if (!budgetOrFare || budgetOrFare <= 0) return 0;
  // Match backend: 10% rounded to paise, with Razorpay INR minimum of ₹1.
  const fee = Math.round((budgetOrFare * percent) / 100 * 100) / 100;
  return Math.max(1, fee);
}

export function formatSmartBudgetStatus(status: SmartBudgetSessionStatus): string {
  switch (status) {
    case 'link_sent':
      return 'Link sent';
    case 'budget_submitted':
      return 'Budget submitted';
    case 'admin_priority':
      return 'Admin priority';
    case 'marketplace':
      return 'Vendor marketplace';
    case 'admin_assigned':
      return 'Admin assigned';
    case 'vendor_claimed':
      return 'Vendor claimed';
    case 'chat_open':
      return 'Chat open';
    case 'fee_paid':
      return 'Fee paid';
    case 'completed':
      return 'Completed';
    case 'expired':
      return 'Expired';
    case 'cancelled':
      return 'Cancelled';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** Vendor/admin assigned trip, but customer has not paid the 10% unlock fee yet. */
export function isSmartBudgetAwaitingFee(session: Pick<
  SmartBudgetSession,
  'status' | 'contacts_unlocked' | 'payment_status' | 'claimed_vendor_id' | 'admin_vehicle_assigned'
>): boolean {
  if (isSmartBudgetContactsUnlocked(session)) return false;
  const assigned =
    Boolean(session.claimed_vendor_id) ||
    Boolean(session.admin_vehicle_assigned) ||
    session.status === 'vendor_claimed' ||
    session.status === 'chat_open' ||
    session.status === 'admin_assigned';
  return assigned;
}

export function formatSmartBudgetFeeLabel(session: Pick<
  SmartBudgetSession,
  'status' | 'contacts_unlocked' | 'payment_status' | 'claimed_vendor_id' | 'admin_vehicle_assigned'
>): string {
  if (isSmartBudgetContactsUnlocked(session)) {
    return 'Fee paid · contacts unlocked';
  }
  if (session.status === 'completed') return 'Completed';
  if (isSmartBudgetAwaitingFee(session)) return 'Awaiting 10% fee';
  if (session.payment_status === 'pending') return 'Payment pending';
  if (session.payment_status === 'failed') return 'Payment failed';
  return 'No fee yet';
}

/** Customer may pay unlock fee only before payment succeeds / ride closes. */
export function canSmartBudgetPayUnlock(session: Pick<
  SmartBudgetSession,
  'status' | 'contacts_unlocked' | 'payment_status'
>): boolean {
  if (isSmartBudgetContactsUnlocked(session)) return false;
  if (isSmartBudgetTerminal(session.status)) return false;
  return (
    session.status === 'admin_assigned' ||
    session.status === 'vendor_claimed' ||
    session.status === 'chat_open'
  );
}

/** Contacts visible to customer & vendor after unlock fee is paid. */
export function isSmartBudgetContactsUnlocked(session: Pick<
  SmartBudgetSession,
  'status' | 'contacts_unlocked' | 'payment_status'
>): boolean {
  return (
    session.contacts_unlocked ||
    session.payment_status === 'paid' ||
    session.status === 'fee_paid' ||
    session.status === 'completed'
  );
}

/** Shared non-terminal gate for cancel actions. */
export function canSmartBudgetCancel(status: SmartBudgetSessionStatus): boolean {
  return !isSmartBudgetTerminal(status);
}
