import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';

// Standard vehicle types
export const STANDARD_VEHICLE_TYPES = [
  'sedan', 'ertiga', 'innova', 'innova_crysta', 'crysta', 'luxury', 
  'tempo', 'traveller', 'etios', 'mpv', 'hycross', 'urbania', 'toyota', 'suv'
];

// Hard-coded mappings for numeric IDs
export const NUMERIC_ID_MAPPINGS: Record<string, string> = {
  '1': 'sedan',
  '2': 'ertiga',
  '3': 'innova',
  '4': 'crysta',
  '5': 'tempo',
  '6': 'bus',
  '7': 'van',
  '8': 'suv',
  '9': 'traveller',
  '10': 'luxury',
  '100': 'sedan',
  '101': 'sedan',
  '102': 'sedan',
  '180': 'etios',
  '200': 'ertiga',
  '201': 'ertiga',
  '202': 'ertiga',
  '300': 'innova',
  '301': 'innova',
  '302': 'innova',
  '400': 'crysta',
  '401': 'crysta',
  '402': 'crysta',
  '500': 'tempo',
  '501': 'tempo',
  '502': 'tempo',
  '592': 'urbania',
  '1266': 'mpv',
  '1270': 'mpv',
  '1271': 'etios',
  '1272': 'etios',
  '1273': 'etios',
  '1274': 'etios',
  '1275': 'etios',
  '1276': 'etios',
  '1277': 'etios',
  '1278': 'etios',
  '1279': 'etios',
  '1280': 'etios',
  '1281': 'mpv',
  '1282': 'sedan',
  '1283': 'sedan',
  '1284': 'etios',
  '1285': 'etios',
  '1286': 'etios',
  '1287': 'etios',
  '1288': 'etios',
  '1289': 'etios',
  '1290': 'etios',
  '1299': 'toyota'
};

/**
 * Normalize vehicle ID to standard format
 * @param vehicleId Vehicle ID to normalize
 * @returns Normalized vehicle ID or null if invalid
 */
export const normalizeVehicleId = (vehicleId: string): string | null => {
  if (!vehicleId || typeof vehicleId !== 'string') {
    return null;
  }
  
  // Convert to lowercase and replace spaces with underscores
  return vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
};

/**
 * Check if a vehicle ID is valid by verifying with backend
 * @param vehicleId Vehicle ID to check
 * @returns Promise resolving to boolean indicating if vehicle ID is valid
 */
export const checkVehicleId = async (vehicleId: string): Promise<boolean> => {
  try {
    // If it's in our standard list, consider it valid
    const normalizedId = normalizeVehicleId(vehicleId);
    if (!normalizedId) return false;
    
    if (STANDARD_VEHICLE_TYPES.includes(normalizedId)) {
      return true;
    }
    
    // For numeric IDs, check mappings
    if (/^\d+$/.test(vehicleId) && NUMERIC_ID_MAPPINGS[vehicleId]) {
      return true;
    }
    
    // Otherwise, consider any non-empty string valid and let the backend handle validation
    return normalizedId.length > 0;
  } catch (error) {
    console.error('Error checking vehicle ID:', error);
    return false;
  }
};
