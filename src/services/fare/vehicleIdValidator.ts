
import { getApiUrl } from '@/config/api';
import { toast } from 'sonner';
import { getBypassHeaders } from '@/config/requestConfig';

// Standard vehicle IDs (lowercase for case-insensitive matching)
export const STANDARD_VEHICLE_TYPES = [
  'sedan', 'ertiga', 'innova', 'innova_crysta', 'crysta', 'luxury', 
  'tempo', 'traveller', 'etios', 'mpv', 'hycross', 'urbania', 'suv'
];

// Hard-coded mappings for known numeric IDs - MUST match with backend
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
  '180': 'etios',
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
  '100': 'sedan',
  '101': 'sedan',
  '102': 'sedan',
  '103': 'sedan',
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
  '502': 'tempo'
};

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
