import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';
import type {
  TourTestimonialVideo,
  TourTestimonialVideoInput,
} from '@/types/tourTestimonialVideo';

const baseURL = getApiUrl();

function authHeaders() {
  return {
    ...defaultHeaders,
    Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
    'Content-Type': 'application/json',
  };
}

function normalize(row: TourTestimonialVideo & { is_active?: unknown }): TourTestimonialVideo {
  const active = row.isActive ?? row.is_active;
  const youtubeId = String(row.youtubeId || '').trim();
  const youtubeUrl =
    String(row.youtubeUrl || '').trim() ||
    (youtubeId ? `https://www.youtube.com/shorts/${youtubeId}` : '');
  const tourTags = Array.isArray(row.tourTags)
    ? row.tourTags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  return {
    ...row,
    youtubeId,
    youtubeUrl,
    posterUrl: row.posterUrl || null,
    tourTags,
    isActive: !(active === false || active === 0 || active === '0' || active === 'false'),
    sortOrder: Number(row.sortOrder) || 0,
  };
}

export const tourTestimonialVideosAPI = {
  async listPublic(slug?: string): Promise<TourTestimonialVideo[]> {
    const params = slug ? { slug } : undefined;
    const response = await axios.get(`${baseURL}/api/tour-testimonial-videos.php`, {
      headers: defaultHeaders,
      params,
    });
    if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
      return response.data.data.map((row: TourTestimonialVideo) => normalize(row));
    }
    return [];
  },

  async listAdmin(): Promise<TourTestimonialVideo[]> {
    const response = await axios.get(`${baseURL}/api/admin/tour-testimonial-videos.php`, {
      headers: authHeaders(),
    });
    if (response.data?.status === 'success' && Array.isArray(response.data.data)) {
      return response.data.data.map((row: TourTestimonialVideo) => normalize(row));
    }
    return [];
  },

  async create(input: TourTestimonialVideoInput): Promise<TourTestimonialVideo> {
    const response = await axios.post(
      `${baseURL}/api/admin/tour-testimonial-videos.php`,
      input,
      { headers: authHeaders() },
    );
    if (response.data?.status !== 'success' || !response.data.data) {
      throw new Error(response.data?.message || 'Failed to create testimonial video');
    }
    return normalize(response.data.data);
  },

  async update(id: number, input: TourTestimonialVideoInput): Promise<TourTestimonialVideo> {
    const response = await axios.put(
      `${baseURL}/api/admin/tour-testimonial-videos.php`,
      { id, ...input },
      { headers: authHeaders() },
    );
    if (response.data?.status !== 'success' || !response.data.data) {
      throw new Error(response.data?.message || 'Failed to update testimonial video');
    }
    return normalize(response.data.data);
  },

  async remove(id: number): Promise<void> {
    const response = await axios.delete(
      `${baseURL}/api/admin/tour-testimonial-videos.php?id=${id}`,
      { headers: authHeaders() },
    );
    if (response.data?.status !== 'success') {
      throw new Error(response.data?.message || 'Failed to delete testimonial video');
    }
  },
};
