
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
    } else if (vehicleData.name) {
      // Generate a vehicleId from name if not provided
      const generatedId = String(vehicleData.name).toLowerCase().replace(/\s+/g, '_');
      vehicleData.vehicleId = generatedId;
      vehicleData.id = generatedId;
    }
    
    // Create a new object that can have any properties (beyond CabType)
    const dataToSend: Record<string, any> = { 
      ...vehicleData,
      // Ensure these fields are present
      name: vehicleData.name || 'Unknown Vehicle',
      capacity: vehicleData.capacity || 4,
      luggageCapacity: vehicleData.luggageCapacity || 2,
      image: vehicleData.image || '/cars/sedan.png',
      description: vehicleData.description || `${vehicleData.name || 'New'} vehicle`
    };
    
    // Convert amenities array to string for backend processing
    if (Array.isArray(vehicleData.amenities)) {
      dataToSend.amenitiesJson = JSON.stringify(vehicleData.amenities);
    } else {
      // Set default amenities if none provided
      dataToSend.amenitiesJson = JSON.stringify(['AC', 'Bottle Water', 'Music System']);
    }
    
    // Add a flag to indicate this is a new vehicle
    dataToSend.isNew = true;
    
    // Add cache busting param
    const cacheBuster = `_t=${Date.now()}`;
    
    // Create FormData for better PHP compatibility
    const formData = formatDataForMultipart(dataToSend);
    
    // Log FormData content (debugging only)
    const formDataObj: Record<string, any> = {};
    formData.forEach((value, key) => {
      formDataObj[key] = value;
    });
    console.log('FormData contents:', formDataObj);
    
    // Try the dedicated vehicle creation endpoint first
    try {
      console.log(`Attempting to create vehicle using direct-vehicle-create endpoint`);
      
      const response = await axios.post(`/api/admin/direct-vehicle-create.php?${cacheBuster}`, formData, {
        headers: {
          ...getBypassHeaders(),
          // FormData will set its own content-type with boundary
        },
        timeout: 20000 // Increase timeout to 20 seconds
      });
      
      console.log(`Response from direct-vehicle-create:`, response.data);
      
      if (response.status === 200 && response.data) {
        toast.success(`Vehicle ${vehicleData.name} created successfully`);
        return true;
      }
    } catch (error: any) {
      console.error(`Error with direct-vehicle-create:`, error.response || error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      console.log(`Error message: ${errorMessage}`);
      
      // Continue to fallback methods if this fails but show a toast with error details
      toast.error(`Primary creation method failed: ${errorMessage}`, { duration: 5000 });
    }
    
    // Try standard form submission method as a fallback
    try {
      console.log(`Trying standard form submission method`);
      
      const formUrlEncoded = new URLSearchParams();
      Object.entries(dataToSend).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formUrlEncoded.append(key, String(value));
        }
      });
      
      const response = await axios.post(`/api/admin/direct-vehicle-create.php?${cacheBuster}`, formUrlEncoded, {
        headers: {
          ...getBypassHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      });
      
      console.log(`Response from form-urlencoded method:`, response.data);
      
      if (response.status === 200 && response.data) {
        toast.success(`Vehicle ${vehicleData.name} created successfully`);
        return true;
      }
    } catch (error: any) {
      console.error(`Error with form-urlencoded method:`, error.response || error);
      // Continue to next fallback
    }
    
    // Try the vehicles-update endpoint as a last resort
    try {
      console.log(`Trying vehicles-update endpoint as last resort`);
      
      const response = await axios.post(`/api/admin/vehicles-update.php?${cacheBuster}`, formData, {
        headers: {
          ...getBypassHeaders(),
        },
        timeout: 15000
      });
      
      console.log(`Response from vehicles-update:`, response.data);
      
      if (response.status === 200 && response.data) {
        toast.success(`Vehicle ${vehicleData.name} created through fallback method`);
        return true;
      }
    } catch (error: any) {
      console.error(`Error with vehicles-update endpoint:`, error.response || error);
      // This is our last attempt, so propagate the error
      throw error;
    }
    
    // If we got here, all attempts failed but didn't throw
    throw new Error('Failed to create vehicle with all available methods');
    
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    
    let errorMessage = 'Failed to create vehicle';
    if (error.response?.data?.message) {
      errorMessage += `: ${error.response.data.message}`;
    } else if (error.message) {
      errorMessage += `: ${error.message}`;
    }
    
    toast.error(errorMessage, { duration: 8000 });
    return false;
  }
};
