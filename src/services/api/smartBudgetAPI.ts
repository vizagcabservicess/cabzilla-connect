/**
 * Smart Budget Marketplace API client.
 *
 * Backend contract (PHP on vizagtaxihub.com):
 *   POST /api/smart-budget/admin.php   { action, ... }  — Bearer admin auth
 *   POST /api/smart-budget/public.php  { action, token, ... }
 *   POST /api/smart-budget/vendor.php  { action, ... }  — Bearer vendor token
 */
import axios, { AxiosError } from 'axios';
import { getApiUrl } from '@/config/api';
import type {
  CreateSmartBudgetSessionInput,
  CreateSmartBudgetCustomerTripInput,
  CreateSmartBudgetVendorInput,
  CreateUnlockPaymentResult,
  SmartBudgetAdminCustomer,
  SmartBudgetAdminCustomerSummary,
  SmartBudgetCustomer,
  SmartBudgetCustomerAuth,
  SmartBudgetDocKey,
  SmartBudgetLead,
  SmartBudgetMessage,
  SmartBudgetPublicConfig,
  SmartBudgetSession,
  SmartBudgetVendor,
  SmartBudgetVendorAuth,
  SmartBudgetVendorSummary,
  SubmitSmartBudgetBudgetInput,
  UpdateSmartBudgetVendorInput,
} from '@/types/smartBudget';

const VENDOR_TOKEN_KEY = 'sb_vendor_token';
const VENDOR_USER_KEY = 'sb_vendor_user';
const CUSTOMER_TOKEN_KEY = 'sb_customer_token';
const CUSTOMER_USER_KEY = 'sb_customer_user';

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function vendorHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(VENDOR_TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function customerHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem(CUSTOMER_TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

const adminBase = () => getApiUrl('/api/smart-budget/admin.php');
const publicBase = () => getApiUrl('/api/smart-budget/public.php');
const vendorBase = () => getApiUrl('/api/smart-budget/vendor.php');
const customerBase = () => getApiUrl('/api/smart-budget/customer.php');

function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string; error?: string }>;
    if (ax.response?.status === 404) {
      return 'Smart Budget API not found — deploy smart-budget PHP endpoints';
    }
    return ax.response?.data?.message || ax.response?.data?.error || ax.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function postAdmin<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(adminBase(), { action, ...body }, { headers: adminHeaders() });
  if (data?.success === false) throw new Error(data.message || data.error || 'Admin request failed');
  return (data?.data ?? data) as T;
}

async function postPublic<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(publicBase(), { action, ...body }, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (data?.success === false) throw new Error(data.message || data.error || 'Request failed');
  return (data?.data ?? data) as T;
}

async function postVendor<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(vendorBase(), { action, ...body }, { headers: vendorHeaders() });
  if (data?.success === false) throw new Error(data.message || data.error || 'Vendor request failed');
  return (data?.data ?? data) as T;
}

async function postCustomer<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(customerBase(), { action, ...body }, { headers: customerHeaders() });
  if (data?.success === false) throw new Error(data.message || data.error || 'Customer request failed');
  return (data?.data ?? data) as T;
}

export const smartBudgetCustomerStorage = {
  getToken(): string | null {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  },
  getCustomer(): SmartBudgetCustomer | null {
    const raw = localStorage.getItem(CUSTOMER_USER_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try {
      const parsed = JSON.parse(raw) as SmartBudgetCustomer;
      return parsed?.id ? parsed : null;
    } catch {
      return null;
    }
  },
  setAuth(auth: SmartBudgetCustomerAuth): void {
    if (!auth?.token || !auth?.customer) {
      throw new Error('Cannot store incomplete customer session');
    }
    localStorage.setItem(CUSTOMER_TOKEN_KEY, auth.token);
    localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(auth.customer));
  },
  setCustomer(customer: SmartBudgetCustomer): void {
    localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(customer));
  },
  clear(): void {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_USER_KEY);
  },
};

export const smartBudgetVendorStorage = {
  getToken(): string | null {
    return localStorage.getItem(VENDOR_TOKEN_KEY);
  },
  getVendor(): SmartBudgetVendor | null {
    const raw = localStorage.getItem(VENDOR_USER_KEY);
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    try {
      const parsed = JSON.parse(raw) as SmartBudgetVendor;
      return parsed?.id ? parsed : null;
    } catch {
      return null;
    }
  },
  setAuth(auth: SmartBudgetVendorAuth): void {
    if (!auth?.token || !auth?.vendor) {
      throw new Error('Cannot store incomplete vendor session');
    }
    localStorage.setItem(VENDOR_TOKEN_KEY, auth.token);
    localStorage.setItem(VENDOR_USER_KEY, JSON.stringify(auth.vendor));
  },
  setVendor(vendor: SmartBudgetVendor): void {
    localStorage.setItem(VENDOR_USER_KEY, JSON.stringify(vendor));
  },
  clear(): void {
    localStorage.removeItem(VENDOR_TOKEN_KEY);
    localStorage.removeItem(VENDOR_USER_KEY);
  },
};

export const smartBudgetAPI = {
  admin: {
    async createSession(input: CreateSmartBudgetSessionInput): Promise<SmartBudgetSession> {
      try {
        return await postAdmin<SmartBudgetSession>('createSession', { ...input });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to create Smart Budget session'));
      }
    },

    async listSessions(params?: { status?: string; limit?: number }): Promise<SmartBudgetSession[]> {
      try {
        const result = await postAdmin<{ sessions?: SmartBudgetSession[] } | SmartBudgetSession[]>(
          'listSessions',
          { ...params }
        );
        return Array.isArray(result) ? result : result.sessions ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load sessions'));
      }
    },

    async getSession(sessionId: number): Promise<SmartBudgetSession> {
      try {
        return await postAdmin<SmartBudgetSession>('getSession', { session_id: sessionId });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load session'));
      }
    },

    async acceptOwn(sessionId: number, opts?: { driver_name?: string; vehicle_number?: string }): Promise<SmartBudgetSession> {
      try {
        return await postAdmin<SmartBudgetSession>('acceptOwn', {
          session_id: sessionId,
          ...opts,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to accept session'));
      }
    },

    async rejectToMarketplace(sessionId: number): Promise<SmartBudgetSession> {
      try {
        return await postAdmin<SmartBudgetSession>('rejectToMarketplace', { session_id: sessionId });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to push session to marketplace'));
      }
    },

    async getMessages(sessionId: number): Promise<SmartBudgetMessage[]> {
      try {
        const result = await postAdmin<{ messages?: SmartBudgetMessage[] } | SmartBudgetMessage[]>(
          'getMessages',
          { session_id: sessionId }
        );
        return Array.isArray(result) ? result : result.messages ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load messages'));
      }
    },

    async sendMessage(sessionId: number, body: string): Promise<SmartBudgetMessage> {
      try {
        return await postAdmin<SmartBudgetMessage>('sendMessage', {
          session_id: sessionId,
          body,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to send message'));
      }
    },

    async cancelSession(
      sessionId: number,
      reason?: string
    ): Promise<{ session: SmartBudgetSession; penalty: number }> {
      try {
        return await postAdmin<{ session: SmartBudgetSession; penalty: number }>('cancelSession', {
          session_id: sessionId,
          reason,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to cancel ride'));
      }
    },

    async settleVendorWallet(vendorId: number): Promise<SmartBudgetVendor> {
      try {
        return await postAdmin<SmartBudgetVendor>('settleVendorWallet', { vendor_id: vendorId });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to clear vendor wallet'));
      }
    },

    async listAlerts(params?: {
      unread_only?: boolean;
      limit?: number;
    }): Promise<
      Array<{
        id: number;
        alert_type: string;
        title: string;
        body?: string | null;
        ref_id?: number | null;
        is_read: boolean;
        created_at: string;
      }>
    > {
      try {
        const result = await postAdmin<{
          alerts?: Array<{
            id: number;
            alert_type: string;
            title: string;
            body?: string | null;
            ref_id?: number | null;
            is_read: boolean;
            created_at: string;
          }>;
        }>('listAlerts', { ...params });
        return result.alerts ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load alerts'));
      }
    },

    async markAlertRead(alertId?: number): Promise<void> {
      try {
        await postAdmin('markAlertRead', alertId ? { alert_id: alertId } : {});
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to mark alert read'));
      }
    },

    async getSettings(): Promise<SmartBudgetPublicConfig> {
      try {
        return await postAdmin<SmartBudgetPublicConfig>('getSettings');
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load Smart Budget settings'));
      }
    },

    async updateSettings(input: {
      budget_min_of_website_fare_percent: number;
    }): Promise<SmartBudgetPublicConfig> {
      try {
        return await postAdmin<SmartBudgetPublicConfig>('updateSettings', { ...input });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to save Smart Budget settings'));
      }
    },

    async listCustomers(params?: {
      q?: string;
      limit?: number;
    }): Promise<{
      customers: SmartBudgetAdminCustomer[];
      summary: SmartBudgetAdminCustomerSummary;
    }> {
      try {
        const result = await postAdmin<{
          customers?: SmartBudgetAdminCustomer[];
          summary?: Partial<SmartBudgetAdminCustomerSummary>;
        }>('listCustomers', { ...params });
        return {
          customers: Array.isArray(result.customers) ? result.customers : [],
          summary: {
            total: Number(result.summary?.total ?? 0),
            with_portal: Number(result.summary?.with_portal ?? 0),
            with_bids: Number(result.summary?.with_bids ?? 0),
            otp_link_trips: Number(result.summary?.otp_link_trips ?? 0),
            portal_trips: Number(result.summary?.portal_trips ?? 0),
          },
        };
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load customers'));
      }
    },

    async listCustomerBids(phone: string, limit = 50): Promise<SmartBudgetSession[]> {
      try {
        const result = await postAdmin<{ bids?: SmartBudgetSession[] }>('listCustomerBids', {
          phone,
          limit,
        });
        return Array.isArray(result.bids) ? result.bids : [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load customer bids'));
      }
    },

    async reviewVendorDocument(input: {
      vendor_id: number;
      doc_key: SmartBudgetDocKey;
      review_action: 'approve' | 'reject' | 'request_reupload' | 'mark_expired' | 'set_expiry';
      reason?: string;
      expires_at?: string;
    }): Promise<SmartBudgetVendor> {
      try {
        return await postAdmin<SmartBudgetVendor>('reviewVendorDocument', { ...input });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to review document'));
      }
    },

    async approveVendorGoLive(vendorId: number): Promise<SmartBudgetVendor> {
      try {
        return await postAdmin<SmartBudgetVendor>('approveVendorGoLive', { vendor_id: vendorId });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to approve vendor'));
      }
    },

    async listVendors(params?: {
      q?: string;
      verification_status?: string;
      active_only?: boolean;
      limit?: number;
    }): Promise<{ vendors: SmartBudgetVendor[]; summary: SmartBudgetVendorSummary }> {
      try {
        const result = await postAdmin<{
          vendors?: SmartBudgetVendor[];
          summary?: Partial<SmartBudgetVendorSummary>;
          data?: {
            vendors?: SmartBudgetVendor[];
            summary?: Partial<SmartBudgetVendorSummary>;
          };
        }>('listVendors', { ...params });

        const payload =
          Array.isArray(result?.vendors) || result?.summary
            ? result
            : result?.data && typeof result.data === 'object'
              ? result.data
              : result;

        const vendors = Array.isArray(payload?.vendors) ? payload.vendors : [];
        const summaryRaw = payload?.summary;

        return {
          vendors,
          summary: {
            total: Number(summaryRaw?.total ?? 0),
            active: Number(summaryRaw?.active ?? 0),
            pending: Number(summaryRaw?.pending ?? 0),
            approved: Number(summaryRaw?.approved ?? 0),
            rejected: Number(summaryRaw?.rejected ?? 0),
            more_docs: Number(summaryRaw?.more_docs ?? 0),
          },
        };
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load vendors'));
      }
    },

    async createVendor(
      input: CreateSmartBudgetVendorInput
    ): Promise<{ vendor: SmartBudgetVendor; temporary_password: string }> {
      try {
        return await postAdmin<{ vendor: SmartBudgetVendor; temporary_password: string }>(
          'createVendor',
          { ...input }
        );
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to create vendor'));
      }
    },

    async updateVendor(input: UpdateSmartBudgetVendorInput): Promise<SmartBudgetVendor> {
      try {
        return await postAdmin<SmartBudgetVendor>('updateVendor', { ...input });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to update vendor'));
      }
    },

    async resetVendorPassword(
      vendorId: number,
      password?: string
    ): Promise<{ vendor_id: number; temporary_password: string }> {
      try {
        return await postAdmin<{ vendor_id: number; temporary_password: string }>(
          'resetVendorPassword',
          { vendor_id: vendorId, password }
        );
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to reset vendor password'));
      }
    },
  },

  public: {
    async getConfig(): Promise<SmartBudgetPublicConfig> {
      try {
        const { data } = await axios.post(
          publicBase(),
          { action: 'getConfig' },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (data?.success === false) {
          throw new Error(data.message || data.error || 'Failed to load config');
        }
        return (data?.data ?? data) as SmartBudgetPublicConfig;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load Smart Budget config'));
      }
    },

    async getSessionByToken(token: string): Promise<SmartBudgetSession> {
      try {
        return await postPublic<SmartBudgetSession>('getSessionByToken', { token });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load session'));
      }
    },

    async sendSubmitOtp(
      token: string,
      customerPhone: string
    ): Promise<{ sent?: boolean; whatsapp_sent?: boolean; message?: string; dev_otp?: string }> {
      try {
        return await postPublic<{
          sent?: boolean;
          whatsapp_sent?: boolean;
          message?: string;
          dev_otp?: string;
        }>('sendSubmitOtp', { token, customer_phone: customerPhone });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to send WhatsApp OTP'));
      }
    },

    async submitBudget(input: SubmitSmartBudgetBudgetInput): Promise<SmartBudgetSession> {
      try {
        return await postPublic<SmartBudgetSession>('submitBudget', { ...input });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to submit budget'));
      }
    },

    async getMessages(token: string): Promise<SmartBudgetMessage[]> {
      try {
        const result = await postPublic<{ messages?: SmartBudgetMessage[] } | SmartBudgetMessage[]>(
          'getMessages',
          { token }
        );
        return Array.isArray(result) ? result : result.messages ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load messages'));
      }
    },

    async sendMessage(token: string, body: string): Promise<SmartBudgetMessage> {
      try {
        return await postPublic<SmartBudgetMessage>('sendMessage', { token, body });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to send message'));
      }
    },

    async createUnlockPayment(token: string): Promise<CreateUnlockPaymentResult> {
      try {
        return await postPublic<CreateUnlockPaymentResult>('createUnlockPayment', { token });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to create unlock payment'));
      }
    },

    async confirmUnlockPayment(
      token: string,
      payload: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }
    ): Promise<SmartBudgetSession> {
      try {
        return await postPublic<SmartBudgetSession>('confirmUnlockPayment', {
          token,
          ...payload,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to confirm payment'));
      }
    },

    async syncUnlockPayment(token: string): Promise<SmartBudgetSession> {
      try {
        return await postPublic<SmartBudgetSession>('syncUnlockPayment', { token });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to sync payment status'));
      }
    },

    async cancelSession(
      token: string,
      reason?: string
    ): Promise<{ session: SmartBudgetSession; penalty: number }> {
      try {
        return await postPublic<{ session: SmartBudgetSession; penalty: number }>('cancelSession', {
          token,
          reason,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to cancel ride'));
      }
    },
  },

  vendor: {
    /** Public WhatsApp magic-link offer (no JWT). */
    async getOfferByToken(offerToken: string): Promise<{
      offer_token: string;
      offer_status: string;
      can_claim: boolean;
      claimed_by_me: boolean;
      vendor_name: string;
      vendor_phone_masked: string | null;
      session: SmartBudgetSession;
    }> {
      try {
        return await postVendor('getOfferByToken', { offer_token: offerToken });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load trip offer'));
      }
    },

    async sendClaimOtp(
      offerToken: string
    ): Promise<{ sent?: boolean; whatsapp_sent?: boolean; message?: string; dev_otp?: string; phone_masked?: string }> {
      try {
        return await postVendor('sendClaimOtp', { offer_token: offerToken });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to send WhatsApp OTP'));
      }
    },

    async confirmClaimWithOtp(
      offerToken: string,
      otp: string
    ): Promise<SmartBudgetVendorAuth & { session: SmartBudgetSession }> {
      try {
        const result = await postVendor<SmartBudgetVendorAuth & { session: SmartBudgetSession }>(
          'confirmClaimWithOtp',
          { offer_token: offerToken, otp }
        );
        if (result?.token && result?.vendor) {
          smartBudgetVendorStorage.setAuth(result);
        }
        return result;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to confirm booking'));
      }
    },

    async sendSignupOtp(phone: string): Promise<{ sent?: boolean; dev_otp?: string }> {
      try {
        return await postVendor<{ sent?: boolean; dev_otp?: string }>('sendSignupOtp', { phone });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to send OTP'));
      }
    },

    async verifySignupOtp(
      phone: string,
      otp: string
    ): Promise<{ signup_token: string; phone: string }> {
      try {
        return await postVendor<{ signup_token: string; phone: string }>('verifySignupOtp', {
          phone,
          otp,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Invalid OTP'));
      }
    },

    async registerVendor(input: {
      signup_token: string;
      name: string;
      email?: string;
      password: string;
      primary_vehicle_type: string;
      primary_vehicle_number: string;
      profile_image_url: string;
      accept_any_vehicle_type?: boolean;
    }): Promise<SmartBudgetVendorAuth> {
      try {
        const raw = await postVendor<SmartBudgetVendorAuth & { data?: SmartBudgetVendorAuth }>(
          'registerVendor',
          { ...input }
        );
        const auth =
          raw?.token && raw?.vendor
            ? raw
            : (raw as { data?: SmartBudgetVendorAuth })?.data;
        if (!auth?.token || !auth?.vendor) {
          throw new Error('Invalid registration response');
        }
        smartBudgetVendorStorage.setAuth(auth);
        return auth;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Registration failed'));
      }
    },

    async login(credentials: { phone?: string; email?: string; password: string }): Promise<SmartBudgetVendorAuth> {
      try {
        // Read the full envelope — do NOT unwrap `data` first or a top-level `token` is lost.
        const { data: envelope } = await axios.post(
          vendorBase(),
          { action: 'login', ...credentials },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (!envelope || envelope.success === false) {
          throw new Error(envelope?.message || envelope?.error || 'Vendor login failed');
        }

        const nested =
          envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
            ? (envelope.data as Record<string, unknown>)
            : null;

        const token = String(
          envelope.token ??
            envelope.access_token ??
            nested?.token ??
            nested?.access_token ??
            ''
        ).trim();

        let vendorRaw: unknown =
          envelope.vendor ??
          envelope.user ??
          nested?.vendor ??
          nested?.user ??
          (nested && ('id' in nested || 'vendor_id' in nested) ? nested : null) ??
          (nested && 'phone' in nested && 'name' in nested ? nested : null);

        if (typeof vendorRaw === 'string') {
          try {
            vendorRaw = JSON.parse(vendorRaw);
          } catch {
            vendorRaw = null;
          }
        }

        if (!token || !vendorRaw || typeof vendorRaw !== 'object') {
          const keys =
            envelope && typeof envelope === 'object'
              ? Object.keys(envelope as object).join(', ')
              : typeof envelope;
          throw new Error(
            `Invalid login response from server (keys: ${keys || 'none'}). Redeploy api/smart-budget/vendor.php + db.php.`
          );
        }

        const vendorObj = vendorRaw as Record<string, unknown>;
        const id = Number(vendorObj.id ?? vendorObj.vendor_id ?? 0);
        if (!id) {
          throw new Error(
            'Invalid login response from server. Vendor id missing. Redeploy api/smart-budget/vendor.php.'
          );
        }

        const vendor = { ...vendorObj, id } as unknown as SmartBudgetVendor;
        const auth: SmartBudgetVendorAuth = { token, vendor };
        smartBudgetVendorStorage.setAuth(auth);
        return auth;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Vendor login failed'));
      }
    },

    async me(): Promise<SmartBudgetVendor> {
      try {
        return await postVendor<SmartBudgetVendor>('me');
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load vendor profile'));
      }
    },

    async updateOnboarding(input: {
      name?: string;
      email?: string | null;
      profile_image_url?: string;
      primary_vehicle_type?: string;
      primary_vehicle_number?: string;
      accept_any_vehicle_type?: boolean;
      documents?: Partial<Record<'pan' | 'aadhaar' | 'rc' | 'insurance' | 'dl' | 'pollution' | 'permit', string>>;
      document_expires?: Partial<Record<'insurance' | 'pollution' | 'permit', string>>;
      submit_for_review?: boolean;
    }): Promise<SmartBudgetVendor> {
      try {
        const vendor = await postVendor<SmartBudgetVendor>('updateOnboarding', { ...input });
        smartBudgetVendorStorage.setVendor(vendor);
        return vendor;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to update onboarding'));
      }
    },

    async listOpenLeads(): Promise<SmartBudgetLead[]> {
      try {
        const result = await postVendor<{ leads?: SmartBudgetLead[] } | SmartBudgetLead[]>(
          'listOpenLeads'
        );
        return Array.isArray(result) ? result : result.leads ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load leads'));
      }
    },

    async listMyBookings(limit = 50): Promise<SmartBudgetSession[]> {
      try {
        const result = await postVendor<{ bookings?: SmartBudgetSession[] } | SmartBudgetSession[]>(
          'listMyBookings',
          { limit }
        );
        return Array.isArray(result) ? result : result.bookings ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load bookings'));
      }
    },

    async acceptLead(sessionId: number): Promise<SmartBudgetSession> {
      try {
        return await postVendor<SmartBudgetSession>('acceptLead', { session_id: sessionId });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to accept lead'));
      }
    },

    async skipLead(sessionId: number): Promise<void> {
      try {
        await postVendor('skipLead', { session_id: sessionId });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to skip lead'));
      }
    },

    async getLead(sessionId: number): Promise<SmartBudgetSession> {
      try {
        return await postVendor<SmartBudgetSession>('getLead', { session_id: sessionId });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load lead'));
      }
    },

    async getMessages(sessionId: number): Promise<SmartBudgetMessage[]> {
      try {
        const result = await postVendor<{ messages?: SmartBudgetMessage[] } | SmartBudgetMessage[]>(
          'getMessages',
          { session_id: sessionId }
        );
        return Array.isArray(result) ? result : result.messages ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load messages'));
      }
    },

    async sendMessage(sessionId: number, body: string): Promise<SmartBudgetMessage> {
      try {
        return await postVendor<SmartBudgetMessage>('sendMessage', {
          session_id: sessionId,
          body,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to send message'));
      }
    },

    async cancelSession(
      sessionId: number,
      reason?: string
    ): Promise<{ session: SmartBudgetSession; penalty: number }> {
      try {
        return await postVendor<{ session: SmartBudgetSession; penalty: number }>('cancelSession', {
          session_id: sessionId,
          reason,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to cancel ride'));
      }
    },

    async registerWebPush(subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }): Promise<void> {
      try {
        await postVendor('registerWebPush', {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to register push notifications'));
      }
    },

    logout(): void {
      smartBudgetVendorStorage.clear();
    },
  },

  customer: {
    async sendSignupOtp(
      phone: string
    ): Promise<{ sent?: boolean; whatsapp_sent?: boolean; dev_otp?: string }> {
      try {
        return await postCustomer<{ sent?: boolean; whatsapp_sent?: boolean; dev_otp?: string }>(
          'sendSignupOtp',
          { phone }
        );
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to send OTP'));
      }
    },

    async verifySignup(input: {
      phone: string;
      otp: string;
      name: string;
      password: string;
    }): Promise<SmartBudgetCustomerAuth> {
      try {
        const { data: envelope } = await axios.post(
          customerBase(),
          { action: 'verifySignup', ...input },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (!envelope || envelope.success === false) {
          throw new Error(envelope?.message || envelope?.error || 'Signup failed');
        }
        const nested =
          envelope.data && typeof envelope.data === 'object' ? envelope.data : null;
        const token = String(envelope.token ?? nested?.token ?? '').trim();
        const customer = (envelope.customer ?? nested?.customer) as SmartBudgetCustomer;
        if (!token || !customer?.id) {
          throw new Error('Invalid signup response from server. Redeploy customer.php.');
        }
        const auth = { token, customer };
        smartBudgetCustomerStorage.setAuth(auth);
        return auth;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Signup failed'));
      }
    },

    async login(input: { phone: string; password: string }): Promise<SmartBudgetCustomerAuth> {
      try {
        const { data: envelope } = await axios.post(
          customerBase(),
          { action: 'login', ...input },
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (!envelope || envelope.success === false) {
          throw new Error(envelope?.message || envelope?.error || 'Login failed');
        }
        const nested =
          envelope.data && typeof envelope.data === 'object' ? envelope.data : null;
        const token = String(envelope.token ?? nested?.token ?? '').trim();
        const customer = (envelope.customer ?? nested?.customer) as SmartBudgetCustomer;
        if (!token || !customer?.id) {
          throw new Error('Invalid login response from server. Redeploy customer.php.');
        }
        const auth = { token, customer };
        smartBudgetCustomerStorage.setAuth(auth);
        return auth;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Login failed'));
      }
    },

    async me(): Promise<SmartBudgetCustomer> {
      try {
        return await postCustomer<SmartBudgetCustomer>('me');
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load profile'));
      }
    },

    async updateProfile(name: string): Promise<SmartBudgetCustomer> {
      try {
        const customer = await postCustomer<SmartBudgetCustomer>('updateProfile', { name });
        smartBudgetCustomerStorage.setCustomer(customer);
        return customer;
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to update profile'));
      }
    },

    async listMySessions(limit = 50): Promise<SmartBudgetSession[]> {
      try {
        const result = await postCustomer<{ sessions?: SmartBudgetSession[] } | SmartBudgetSession[]>(
          'listMySessions',
          { limit }
        );
        return Array.isArray(result) ? result : result.sessions ?? [];
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to load bookings'));
      }
    },

    async createTrip(input: CreateSmartBudgetCustomerTripInput): Promise<SmartBudgetSession> {
      try {
        return await postCustomer<SmartBudgetSession>('createTrip', { ...input });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to post trip'));
      }
    },

    async registerWebPush(subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }): Promise<void> {
      try {
        await postCustomer('registerWebPush', {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        });
      } catch (error) {
        throw new Error(apiErrorMessage(error, 'Failed to register push notifications'));
      }
    },

    logout(): void {
      smartBudgetCustomerStorage.clear();
    },
  },
};
