
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';

/**
 * Normalize a vehicle ID string by trimming, converting to lowercase, 
 * and replacing spaces with underscores
 */
export const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return '';
  return vehicleId.trim().toLowerCase().replace(/\s+/g, '_');
};

/**
 * Check if a vehicle ID exists in the database
 * Returns true if the vehicle exists, false otherwise
 */
export const checkVehicleId = async (vehicleId: string): Promise<boolean> => {
  try {
    const normalizedId = normalizeVehicleId(vehicleId);
    if (!normalizedId) return false;
    
    console.log(`Checking if vehicle ID exists: ${normalizedId}`);
    
    const response = await fetch(`${getApiUrl('/api/admin/check-vehicle')}?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        ...getBypassHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vehicleId: normalizedId })
    });
    
    if (!response.ok) {
      console.error(`Failed to check vehicle ID: ${response.status}`);
      return false;
    }
    
    const data = await response.json();
    console.log('Vehicle check response:', data);
    
    if (data.status === 'error') {
      console.error(`Vehicle check error: ${data.message}`);
      return false;
    }
    
    return !!data.vehicleExists;
  } catch (error) {
    console.error('Error checking vehicle ID:', error);
    return false;
  }
};

/**
 * Validate vehicle ID format (no special characters except underscores)
 */
export const isValidVehicleIdFormat = (vehicleId: string): boolean => {
  // Allow letters, numbers, and underscores only
  const validFormat = /^[a-zA-Z0-9_]+$/;
  return validFormat.test(normalizeVehicleId(vehicleId));
};
