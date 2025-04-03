
import { getApiUrl } from '@/config/api';
import { getBypassHeaders } from '@/config/requestConfig';
import { toast } from 'sonner';

// Define standard vehicle types for validation
export const STANDARD_VEHICLE_TYPES = [
  'sedan', 'ertiga', 'innova', 'innova_crysta', 'luxury', 
  'tempo', 'traveller', 'etios', 'mpv', 'hycross', 'urbania'
];

// Comprehensive mapping for known numeric IDs to standard vehicle types
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
  '1290': 'etios',
  '1291': 'etios',
  '1292': 'sedan',
  '1293': 'urbania'
};

/**
 * Normalize vehicle ID by converting to lowercase, replacing spaces with underscores,
 * and mapping numeric IDs to standard names
 * 
 * @param vehicleId Raw vehicle ID from user input
 * @returns Normalized vehicle ID or null if invalid
 */
export function normalizeVehicleId(vehicleId: string): string | null {
  if (!vehicleId || typeof vehicleId !== 'string') {
    console.error('Invalid vehicle ID (empty or not a string):', vehicleId);
    return null;
  }
  
  // Remove 'item-' prefix if present
  let normalizedId = vehicleId;
  if (normalizedId.startsWith('item-')) {
    normalizedId = normalizedId.substring(5);
  }
  
  // Handle comma-separated lists (take first ID only)
  if (normalizedId.includes(',')) {
    const parts = normalizedId.split(',');
    normalizedId = parts[0].trim();
    console.warn('Found comma-separated vehicle ID, using first part:', normalizedId);
  }
  
  // Map numeric IDs to standard names
  if (/^\d+$/.test(normalizedId)) {
    console.warn('Received numeric vehicle ID:', normalizedId);
    if (NUMERIC_ID_MAPPINGS[normalizedId]) {
      const originalId = normalizedId;
      normalizedId = NUMERIC_ID_MAPPINGS[normalizedId];
      console.log(`Mapped numeric ID ${originalId} to standard vehicle ID: ${normalizedId}`);
    } else {
      console.error('Unmapped numeric ID rejected:', normalizedId);
      return null; // Reject unmapped numeric IDs
    }
  }
  
  // Normalize to lowercase and replace spaces with underscores
  normalizedId = normalizedId.toLowerCase().replace(/\s+/g, '_').trim();
  
  // Check for standard vehicle types and map common variations
  if (!STANDARD_VEHICLE_TYPES.includes(normalizedId)) {
    if (normalizedId === 'mpv' || normalizedId === 'innova_hycross' || normalizedId === 'hycross') {
      normalizedId = 'innova_crysta';
    } else if (normalizedId === 'dzire' || normalizedId === 'swift') {
      normalizedId = 'sedan';
    } else {
      // If still not recognized, reject
      console.error('Non-standard vehicle type rejected after normalization:', normalizedId);
      return null;
    }
  }
  
  return normalizedId;
}

/**
 * Verify vehicle ID with the server to ensure it exists
 * 
 * @param vehicleId Normalized vehicle ID to check
 * @returns Promise resolving to boolean indicating if vehicle exists
 */
export async function checkVehicleId(vehicleId: string): Promise<boolean> {
  try {
    // Validate input first
    if (!vehicleId || typeof vehicleId !== 'string' || vehicleId.length < 1) {
      console.error('Invalid vehicle ID provided for checking:', vehicleId);
      return false;
    }
    
    // Reject any numeric ID that somehow bypassed normalization
    if (/^\d+$/.test(vehicleId)) {
      console.error('Numeric vehicle ID rejected during check:', vehicleId);
      return false;
    }
    
    const response = await fetch(`${getApiUrl('/api/admin/check-vehicle.php')}?_t=${Date.now()}`, {
      method: 'POST',
      headers: {
        ...getBypassHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vehicleId }),
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`Vehicle check failed: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Vehicle check response:', data);
    
    // Return true only if vehicleExists is explicitly true
    return data.vehicleExists === true;
  } catch (error) {
    console.error('Error checking vehicle ID:', error);
    return false;
  }
}
