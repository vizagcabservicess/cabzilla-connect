export interface SitePromo {
  id: number;
  title: string;
  image_url: string;
  /** Neutral proxy URL from API — prefer this for <img src> (ad-blocker safe) */
  image_src?: string | null;
  /** Preferred: data URL from public getActive (no extra image request) */
  image_data_url?: string | null;
  link_url: string | null;
  is_active: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  is_expired?: boolean;
  sort_order: number;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSitePromoInput {
  title?: string;
  image_url: string;
  link_url?: string | null;
  is_active?: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  /** Convenience: set expires_at = now (or starts_at) + N hours */
  duration_hours?: number | null;
  sort_order?: number;
}

export interface UpdateSitePromoInput extends Partial<CreateSitePromoInput> {
  id: number;
}
