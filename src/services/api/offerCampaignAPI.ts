/**
 * Offer / Campaign Management API client
 * POST /api/campaigns/admin.php | public.php | vendor.php
 */
import axios, { AxiosError } from 'axios';
import { getApiUrl } from '@/config/api';
import type {
  ApplyOfferCouponResult,
  CreateOfferCampaignInput,
  OfferCampaign,
  OfferCampaignCategory,
  OfferCampaignDashboard,
  OfferCampaignForParticipant,
  OfferCampaignParticipant,
  OfferCampaignPricing,
  OfferCampaignPublic,
  UpdateOfferCampaignInput,
} from '@/types/offerCampaign';

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function vendorHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('sb_vendor_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function postAdmin<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(
    getApiUrl('api/campaigns/admin.php'),
    { action, ...body },
    { headers: adminHeaders() }
  );
  if (!data?.success) throw new Error(data?.error || data?.message || 'Request failed');
  return (data.data ?? data) as T;
}

async function postPublic<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(
    getApiUrl('api/campaigns/public.php'),
    { action, ...body },
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (!data?.success) throw new Error(data?.error || data?.message || 'Request failed');
  return (data.data ?? data) as T;
}

async function postVendor<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(
    getApiUrl('api/campaigns/vendor.php'),
    { action, ...body },
    { headers: vendorHeaders() }
  );
  if (!data?.success) throw new Error(data?.error || data?.message || 'Request failed');
  return (data.data ?? data) as T;
}

export const offerCampaignAPI = {
  admin: {
    async dashboard(): Promise<OfferCampaignDashboard> {
      try {
        return await postAdmin<OfferCampaignDashboard>('dashboard');
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to load dashboard'));
      }
    },

    async listCampaigns(params?: {
      status?: string;
      category?: string;
    }): Promise<OfferCampaign[]> {
      try {
        const result = await postAdmin<{ campaigns?: OfferCampaign[] }>('listCampaigns', {
          ...params,
        });
        return Array.isArray(result.campaigns) ? result.campaigns : [];
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to list campaigns'));
      }
    },

    async createCampaign(input: CreateOfferCampaignInput): Promise<OfferCampaign> {
      try {
        return await postAdmin<OfferCampaign>('createCampaign', { ...input });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to create campaign'));
      }
    },

    async updateCampaign(input: UpdateOfferCampaignInput): Promise<OfferCampaign> {
      try {
        return await postAdmin<OfferCampaign>('updateCampaign', { ...input });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to update campaign'));
      }
    },

    async publishCampaign(campaignId: number): Promise<OfferCampaign> {
      try {
        return await postAdmin<OfferCampaign>('publishCampaign', { campaign_id: campaignId });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to publish'));
      }
    },

    async pauseCampaign(campaignId: number): Promise<OfferCampaign> {
      try {
        return await postAdmin<OfferCampaign>('pauseCampaign', { campaign_id: campaignId });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to pause'));
      }
    },

    async resumeCampaign(campaignId: number): Promise<OfferCampaign> {
      try {
        return await postAdmin<OfferCampaign>('resumeCampaign', { campaign_id: campaignId });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to resume'));
      }
    },

    async cancelCampaign(campaignId: number): Promise<OfferCampaign> {
      try {
        return await postAdmin<OfferCampaign>('cancelCampaign', { campaign_id: campaignId });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to cancel'));
      }
    },

    async listParticipants(campaignId: number): Promise<OfferCampaignParticipant[]> {
      try {
        const result = await postAdmin<{ participants?: OfferCampaignParticipant[] }>(
          'listParticipants',
          { campaign_id: campaignId }
        );
        return Array.isArray(result.participants) ? result.participants : [];
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to load participants'));
      }
    },

    async removeParticipant(participationId: number): Promise<void> {
      try {
        await postAdmin('removeParticipant', { participation_id: participationId });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to remove participant'));
      }
    },

    async listHistory(): Promise<OfferCampaign[]> {
      try {
        const result = await postAdmin<{ campaigns?: OfferCampaign[] }>('listHistory');
        return Array.isArray(result.campaigns) ? result.campaigns : [];
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to load history'));
      }
    },

    async getSettings(): Promise<{ grace_window_minutes: number }> {
      try {
        return await postAdmin('getSettings');
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to load settings'));
      }
    },

    async updateSettings(grace_window_minutes: number): Promise<{ grace_window_minutes: number }> {
      try {
        return await postAdmin('updateSettings', { grace_window_minutes });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to save settings'));
      }
    },
  },

  public: {
    async getActiveOffer(
      category: OfferCampaignCategory | string,
      websiteFare?: number,
      travelDate?: string | null
    ): Promise<{ campaign: OfferCampaignPublic | null; grace_window_minutes: number }> {
      try {
        return await postPublic('getActiveOffer', {
          category,
          website_fare: websiteFare,
          travel_date: travelDate || undefined,
        });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to load offer'));
      }
    },

    async previewFare(
      category: OfferCampaignCategory | string,
      websiteFare: number,
      travelDate?: string | null
    ): Promise<{ campaign: OfferCampaignPublic | null; pricing: OfferCampaignPricing }> {
      try {
        return await postPublic('previewFare', {
          category,
          website_fare: websiteFare,
          travel_date: travelDate || undefined,
        });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to preview fare'));
      }
    },

    async applyCoupon(input: {
      coupon_code: string;
      customer_phone: string;
      website_fare: number;
      booking_id?: string;
      travel_date?: string | null;
    }): Promise<ApplyOfferCouponResult> {
      try {
        return await postPublic<ApplyOfferCouponResult>('applyCoupon', { ...input });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to apply coupon'));
      }
    },

    async completeRedemption(redemptionId: number, bookingId?: string): Promise<void> {
      try {
        await postPublic('completeRedemption', {
          redemption_id: redemptionId,
          booking_id: bookingId,
        });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to complete redemption'));
      }
    },

    async logEvent(
      eventType: string,
      campaignId?: number | null,
      category?: string,
      meta?: Record<string, unknown>
    ): Promise<void> {
      try {
        await postPublic('logEvent', {
          event_type: eventType,
          campaign_id: campaignId ?? undefined,
          category,
          meta,
        });
      } catch {
        /* non-blocking */
      }
    },
  },

  vendor: {
    async listEligible(): Promise<OfferCampaignForParticipant[]> {
      try {
        const result = await postVendor<{ campaigns?: OfferCampaignForParticipant[] }>(
          'listEligible'
        );
        return Array.isArray(result.campaigns) ? result.campaigns : [];
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to load campaigns'));
      }
    },

    async join(input: {
      campaign_id: number;
      vehicle_status?: string;
      vehicle_number?: string;
      vehicle_type?: string;
      participant_label?: string;
    }): Promise<{
      participation_id: number;
      discount_absorbed_by?: string;
      campaign: OfferCampaignForParticipant;
    }> {
      try {
        return await postVendor('join', { ...input });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to join campaign'));
      }
    },

    async leave(campaignId: number): Promise<void> {
      try {
        await postVendor('leave', { campaign_id: campaignId });
      } catch (e) {
        throw new Error(apiErrorMessage(e, 'Failed to leave campaign'));
      }
    },
  },
};
