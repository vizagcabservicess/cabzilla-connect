
import axios from 'axios';
import { formatDataForMultipart, getBypassHeaders } from '@/config/requestConfig';
import { toast } from 'sonner';
import { CabType } from '@/types/cab';

/**
 * Directly creates a new vehicle using a more reliable approach
 * This uses FormData instead of JSON which works better with PHP endpoints
 */
export const createVehicle = async (vehicleData: Partial<CabType>): Promise<boolean> => {
  try {
    console.log('Creating vehicle with data:', vehicleData);
    
    // Clean and prepare the vehicle ID
    if (vehicleData.vehicleId) {
      vehicleData.vehicleId = String(vehicleData.vehicleId).replace(/\s+/g, '_').toLowerCase();
      vehicleData.id = vehicleData.vehicleId;
    }
    
    // Convert amenities array to string if needed
    if (Array.isArray(vehicleData.amenities)) {
      vehicleData.amenitiesJson = JSON.stringify(vehicleData.amenities);
    }
    
    // Set a flag to indicate this is a new vehicle
    vehicleData.isNew = true;
    
    const formData = formatDataForMultipart(vehicleData);
    
    // Add cache busting param
    const cacheBuster = `_t=${Date.now()}`;
    
    // Try multiple endpoints with different methods
    const endpoints = [
      '/api/admin/direct-vehicle-pricing.php',
      '/api/admin/vehicles-update.php',
    ];
    
    let successResponse = null;
    
    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying to create vehicle using endpoint: ${endpoint}`);
        
        // Try FormData first
        const response = await axios.post(`${endpoint}?${cacheBuster}`, formData, {
          headers: {
            ...getBypassHeaders(),
            // FormData will set its own content-type with boundary
          },
          timeout: 15000
        });
        
        console.log(`Response from ${endpoint}:`, response.data);
        
        if (response.status === 200 && response.data) {
          successResponse = response.data;
          toast.success(`Vehicle ${vehicleData.name} created successfully`);
          return true;
        }
      } catch (error: any) {
        console.error(`Error creating vehicle at endpoint ${endpoint}:`, error.response || error);
        
        // Try URL encoded next
        try {
          const params = new URLSearchParams();
          Object.entries(vehicleData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              params.append(key, String(value));
            }
          });
          
          const response = await axios.post(`${endpoint}?${cacheBuster}`, params, {
            headers: {
              ...getBypassHeaders(),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 15000
          });
          
          console.log(`Response from ${endpoint} (urlencoded):`, response.data);
          
          if (response.status === 200 && response.data) {
            successResponse = response.data;
            toast.success(`Vehicle ${vehicleData.name} created successfully`);
            return true;
          }
        } catch (urlEncodedError) {
          console.error(`Error with urlencoded data at ${endpoint}:`, urlEncodedError);
        }
      }
    }
    
    // If we got here, all attempts failed
    throw new Error('Failed to create vehicle with all available methods');
    
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    
    let errorMessage = 'Failed to create vehicle';
    if (error.response?.data?.message) {
      errorMessage += `: ${error.response.data.message}`;
    } else if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    toast.error(errorMessage);
    return false;
  }
};
