
import { toast } from 'sonner';

// Standard vehicle types allowed in the system
export const STANDARD_VEHICLE_TYPES = [
  'sedan', 'ertiga', 'innova', 'innova_crysta', 'luxury', 'tempo', 
  'traveller', 'etios', 'mpv', 'urbania', 'hycross'
];

// Known numeric ID mappings
export const NUMERIC_ID_MAPPINGS: Record<string, string> = {
  '1': 'sedan',
  '2': 'ertiga', 
  '180': 'etios',
  '1266': 'innova',
  '592': 'urbania',
  '1290': 'sedan',
  '1291': 'etios',  // Adding the newly seen numeric IDs
  '1292': 'sedan',
  '1293': 'urbania'
};

/**
 * Validate and normalize a vehicle ID
 */
export const normalizeVehicleId = (vehicleId: string): string => {
  if (!vehicleId) return '';
  
  // Check if it's a numeric ID that needs mapping
  if (/^\d+$/.test(vehicleId)) {
    const mappedId = NUMERIC_ID_MAPPINGS[vehicleId];
    if (mappedId) {
      console.log(`Mapped numeric ID ${vehicleId} to ${mappedId}`);
      return mappedId;
    }
    console.warn(`Received unmapped numeric ID: ${vehicleId}`);
    // CRITICAL FIX: Instead of proceeding with numeric ID, return empty to force error
    return '';
  }
  
  // Normalize to lowercase with underscores instead of spaces
  return vehicleId.toLowerCase().replace(/\s+/g, '_');
};

/**
 * Check if a vehicle ID is valid before updating
 */
export const checkVehicleId = async (vehicleId: string): Promise<boolean> => {
  try {
    // First normalize the ID
    const normalizedId = normalizeVehicleId(vehicleId);
    
    // CRITICAL FIX: If numeric ID wasn't mapped or normalization failed, reject immediately
    if (!normalizedId) {
      toast.error(`Invalid vehicle ID: ${vehicleId}`);
      return false;
    }
    
    // Skip check if it's empty
    if (!normalizedId) return false;
    
    // Check if it's a standard vehicle type
    const isStandard = STANDARD_VEHICLE_TYPES.includes(normalizedId);
    if (!isStandard) {
      console.warn(`Vehicle ID ${normalizedId} is not a standard type`);
      toast.warning(`Non-standard vehicle type: ${normalizedId}. This may cause issues.`);
    }
    
    return isStandard;
  } catch (error) {
    console.error('Error checking vehicle ID:', error);
    toast.error('Failed to validate vehicle ID');
    return false;
  }
};
