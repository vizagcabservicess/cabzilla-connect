/**
 * Site promo banner API — POST /api/promos/admin.php | public.php
 */
import axios, { AxiosError } from 'axios';
import { getApiUrl } from '@/config/api';
import type { CreateSitePromoInput, SitePromo, UpdateSitePromoInput } from '@/types/sitePromo';

function adminHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('auth_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      return 'Promo API not found — deploy /api/promos/*.php to Hostinger';
    }
    if (error.response?.status === 401) {
      return 'Unauthorized — please log in again as admin';
    }
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    if (typeof data === 'string' && data.trim().startsWith('<')) {
      return 'Promo API returned HTML instead of JSON — deploy /api/promos/*.php';
    }
    return data?.error || data?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function postAdmin<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  try {
    const { data } = await axios.post(
      getApiUrl('api/promos/admin.php'),
      { action, ...body },
      { headers: adminHeaders() },
    );
    if (!data?.success) throw new Error(data?.error || data?.message || 'Request failed');
    return (data.data ?? data) as T;
  } catch (e) {
    if (e instanceof Error && !(e instanceof AxiosError)) throw e;
    throw new Error(apiErrorMessage(e, 'Request failed'));
  }
}

async function postPublic<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data } = await axios.post(
    getApiUrl('api/promos/public.php'),
    { action, ...body },
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (!data?.success) throw new Error(data?.error || data?.message || 'Request failed');
  return (data.data ?? data) as T;
}

/**
 * Prefer embedded data URL. Fallback streams via public.php?id= (same file as getActive).
 * Never use /uploads/img_* or storage.googleapis.com directly (adblock / private bucket).
 */
export function sitePromoDisplayUrl(promo: Pick<SitePromo, 'id' | 'image_data_url'>): string {
  if (promo.image_data_url?.startsWith('data:image/')) {
    return promo.image_data_url;
  }
  const id = Number(promo.id) || 0;
  if (id > 0) {
    return getApiUrl(`api/promos/public.php?id=${id}`);
  }
  return '';
}

export const sitePromoAPI = {
  admin: {
    async list(): Promise<SitePromo[]> {
      const result = await postAdmin<{ promos?: SitePromo[] }>('list');
      return Array.isArray(result.promos) ? result.promos : [];
    },

    async create(input: CreateSitePromoInput): Promise<SitePromo> {
      const result = await postAdmin<{ promo: SitePromo }>('create', { ...input });
      return result.promo;
    },

    async update(input: UpdateSitePromoInput): Promise<SitePromo> {
      const result = await postAdmin<{ promo: SitePromo }>('update', { ...input });
      return result.promo;
    },

    async setActive(id: number, is_active: boolean): Promise<SitePromo> {
      const result = await postAdmin<{ promo: SitePromo }>('setActive', { id, is_active });
      return result.promo;
    },

    async remove(id: number): Promise<void> {
      await postAdmin('delete', { id });
    },
  },

  public: {
    async getActive(): Promise<SitePromo | null> {
      try {
        const result = await postPublic<{ promo: SitePromo | null }>('getActive');
        return result.promo ?? null;
      } catch {
        return null;
      }
    },

    async getImageDataUrl(id: number): Promise<string | null> {
      try {
        const result = await postPublic<{ image_data_url?: string | null }>('getImage', { id });
        const url = result.image_data_url || null;
        return url?.startsWith('data:image/') ? url : null;
      } catch {
        return null;
      }
    },
  },
};

export default sitePromoAPI;
