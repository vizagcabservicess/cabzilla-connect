
import axios from 'axios';
import { getApiUrl, defaultHeaders } from '@/config/api';

const baseURL = getApiUrl();

export interface VehicleGalleryImage {
  id?: string;
  vehicle_id: string;
  url: string;
  alt_text?: string;
  caption?: string;
  created_at?: string;
}

export const vehicleGalleryAPI = {
  // Get gallery images for a vehicle
  getVehicleGallery: async (vehicleId: string): Promise<VehicleGalleryImage[]> => {
    try {
      const response = await axios.get(`${baseURL}/api/admin/vehicle-gallery.php?action=get&vehicle_id=${vehicleId}`, {
        headers: { ...defaultHeaders }
      });
      
      if (response.data && response.data.status === 'success') {
        return response.data.data || [];
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching vehicle gallery:', error);
      return [];
    }
  },

  // Add image to vehicle gallery
  addGalleryImage: async (imageData: Omit<VehicleGalleryImage, 'id' | 'created_at'>): Promise<VehicleGalleryImage | null> => {
    try {
      const response = await axios.post(`${baseURL}/api/admin/vehicle-gallery.php`, {
        action: 'add',
        ...imageData
      }, {
        headers: { ...defaultHeaders }
      });
      
      if (response.data && response.data.status === 'success') {
        return response.data.data;
      }
      
      return null;
    } catch (error) {
      console.error('Error adding gallery image:', error);
      return null;
    }
  },

  // Delete image from vehicle gallery
  deleteGalleryImage: async (imageId: string): Promise<boolean> => {
    try {
      const response = await axios.delete(`${baseURL}/api/admin/vehicle-gallery.php?action=delete&id=${imageId}`, {
        headers: { ...defaultHeaders }
      });
      
      return response.data && response.data.status === 'success';
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
      
      const response = await axios.post(`${baseURL}/api/upload-image.php`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...defaultHeaders
        }
      });
      
      if (response.data && response.data.url) {
        return response.data.url;
      }
      
      return null;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }
};
