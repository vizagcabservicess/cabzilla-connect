
/**
 * Standard vehicle types that are consistently supported across all endpoints
 */
export const STANDARD_VEHICLE_TYPES = [
  'sedan', 
  'ertiga', 
  'innova', 
  'innova_crysta', 
  'crysta', 
  'tempo', 
  'tempo_traveller',
  'traveller', 
  'luxury', 
  'suv',
  'etios',
  'mpv',
  'urbania'
];

/**
 * Hard-coded mappings for numeric IDs - KEEP IN SYNC WITH BACKEND
 */
export const NUMERIC_ID_MAPPINGS: Record<string, string> = {
  // Basic mappings
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
  
  // Extended mappings from backend
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
  '1299': 'toyota',
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
 * Normalize vehicle ID by:
 * - Converting to lowercase
 * - Replace spaces with underscores
 * - Trim whitespace
 * - Map vehicle ID aliases to standard names
 * 
 * @param vehicleId Vehicle ID to normalize
 * @returns Normalized vehicle ID or null if invalid
 */
export const normalizeVehicleId = (vehicleId: string): string | null => {
  if (!vehicleId || typeof vehicleId !== 'string') {
    return null;
  }
  
  // Normalize to lowercase, replace spaces with underscores, trim whitespace
  const normalized = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Handle common aliases
  const aliases: Record<string, string> = {
    'innova_hycross': 'innova_crysta',
    'hycross': 'innova_crysta',
    'innova_crysta': 'innova_crysta',
    'crysta': 'innova_crysta',
    'dzire': 'sedan',
    'swift': 'sedan',
    'toyota': 'innova',
    'tempo_traveller': 'tempo',
    'traveller': 'tempo'
  };
  
  return aliases[normalized] || normalized;
};

/**
 * Check if the given vehicle ID is valid
 * 
 * @param vehicleId Vehicle ID to check
 * @returns True if vehicle ID is valid, false otherwise
 */
export const checkVehicleId = (vehicleId: string): boolean => {
  if (!vehicleId) return false;
  
  // Handle numeric IDs
  if (/^\d+$/.test(vehicleId)) {
    return vehicleId in NUMERIC_ID_MAPPINGS;
  }
  
  const normalized = normalizeVehicleId(vehicleId);
  if (!normalized) return false;
  
  // Check against standard vehicle types (case-insensitive)
  return STANDARD_VEHICLE_TYPES.some(type => type.toLowerCase() === normalized.toLowerCase());
};
