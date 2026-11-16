export interface TourTestimonialVideo {
  id: number;
  youtubeId: string;
  /** Full YouTube watch/shorts URL kept in admin. */
  youtubeUrl: string;
  posterUrl?: string | null;
  quote: string;
  name: string;
  tourLabel: string;
  duration: string;
  /** Marketing tour slugs this clip appears on. Empty = all tours. */
  tourTags: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type TourTestimonialVideoInput = {
  youtubeId?: string;
  youtubeUrl?: string;
  posterUrl?: string | null;
  quote: string;
  name: string;
  tourLabel: string;
  duration: string;
  tourTags?: string[];
  isActive?: boolean;
  sortOrder?: number;
};
