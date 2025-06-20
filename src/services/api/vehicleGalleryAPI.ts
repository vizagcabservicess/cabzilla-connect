
import { apiBaseUrl } from '@/config/api';
import { GalleryItem } from '@/types/cab';

export interface VehicleGalleryResponse {
  success: boolean;
  message: string;
  gallery?: GalleryItem[];
}

export const vehicleGalleryAPI = {
  // Get gallery images for a vehicle
  getGallery: async (vehicleId: string): Promise<GalleryItem[]> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/vehicle-gallery.php?action=get&vehicle_id=${vehicleId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        }
      });

      const data = await response.json();
      
      if (data.success && data.gallery) {
        return data.gallery;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching gallery:', error);
      return [];
    }
  },

  // Add image to vehicle gallery
  addImage: async (vehicleId: string, imageData: Omit<GalleryItem, 'id'>): Promise<boolean> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/vehicle-gallery.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          action: 'add',
          vehicle_id: vehicleId,
          ...imageData
        })
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error adding gallery image:', error);
      return false;
    }
  },

  // Update gallery image
  updateImage: async (id: string, imageData: Partial<GalleryItem>): Promise<boolean> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/vehicle-gallery.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          action: 'update',
          id,
          ...imageData
        })
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error updating gallery image:', error);
      return false;
    }
  },

  // Delete gallery image
  deleteImage: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/admin/vehicle-gallery.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          action: 'delete',
          id
        })
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('Error deleting gallery image:', error);
      return false;
    }
  },

  // Upload image file
  uploadImage: async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${apiBaseUrl}/api/upload-image.php`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.url) {
        return `${apiBaseUrl}${data.url}`;
      }
      
      return null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }
};
