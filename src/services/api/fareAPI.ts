
import { VehiclePricingUpdateRequest, FareUpdateRequest } from '@/types/api';

export const fareAPI = {
  async updateVehiclePricing(vehicleId: number, data: VehiclePricingUpdateRequest): Promise<void> {
    const response = await fetch(`/api/admin/vehicle-pricing.php`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, vehicleId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update vehicle pricing');
    }
  },

  async updateTourFare(tourId: string, data: FareUpdateRequest): Promise<void> {
    const response = await fetch(`/api/admin/tour-fares.php`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, tourId }),
    });

    if (!response.ok) {
      throw new Error('Failed to update tour fare');
    }
  },

  async getTourFares(): Promise<any[]> {
    try {
      const response = await fetch('/api/admin/tour-fares.php');
      const data = await response.json();
      return data.tours || [];
    } catch (error) {
      console.error('Error fetching tours:', error);
      return [];
    }
  }
};
