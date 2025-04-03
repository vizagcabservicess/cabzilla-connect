
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
export function normalizeVehicleId(vehicleId: string): string | null {
  if (!vehicleId || typeof vehicleId !== 'string') {
    console.error('Invalid vehicle ID:', vehicleId);
    return null;
  }
  
  return vehicleId.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Check if a vehicle ID exists in the backend
 * 
 * @param vehicleId The normalized vehicle ID to check
 */
export async function checkVehicleId(vehicleId: string): Promise<boolean> {
  try {
    console.log(`Checking if vehicle ID exists: ${vehicleId}`);
    
    // Add cache buster to prevent caching
    const response = await fetch(`${getApiUrl('/api/admin/check-vehicle.php')}?id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        ...getBypassHeaders(),
        'Accept': 'application/json'
      }
    });
    
    // If response is not ok, throw error
    if (!response.ok) {
      throw new Error(`Failed to verify vehicle ID: ${response.status} ${response.statusText}`);
    }
    
    // Parse response
    const data = await response.json();
    console.log('Vehicle check response:', data);
    
    // Check if vehicle exists
    if (data && data.vehicleExists === true) {
      console.log(`✅ Vehicle ID verified: ${vehicleId}`);
      return true;
    } else {
      console.error(`❌ Vehicle ID does not exist: ${vehicleId}`);
      return false;
    }
  } catch (error) {
    console.error('Error checking vehicle ID:', error);
    
    // Fallback: If backend validation fails, check against our standard vehicle types
    const isStandardVehicle = STANDARD_VEHICLE_TYPES.includes(vehicleId.toLowerCase());
    console.log(`Backend validation failed, falling back to local validation: ${isStandardVehicle ? 'Valid' : 'Invalid'}`);
    return isStandardVehicle;
  }
}
