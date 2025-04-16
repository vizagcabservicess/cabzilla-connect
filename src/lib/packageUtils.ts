
/**
 * Standard package normalization utility to ensure consistent package IDs across the application
 */

// Standard mapping for package IDs
const standardPackageIds: Record<string, string> = {
  // 4hr packages
  "4hr_40km": "4hrs-40km",
  "04hr_40km": "4hrs-40km",
  "04hrs_40km": "4hrs-40km",
  "4hrs_40km": "4hrs-40km",
  "4hours_40km": "4hrs-40km",
  
  // 8hr packages
  "8hr_80km": "8hrs-80km",
  "8hrs_80km": "8hrs-80km",
  "8hours_80km": "8hrs-80km",
  
  // 10hr packages
  "10hr_100km": "10hrs-100km",
  "10hrs_100km": "10hrs-100km",
  "10hours_100km": "10hrs-100km"
};

/**
 * Normalizes package IDs to ensure consistency across the application
 * @param packageId - The package ID to normalize
 * @returns The normalized package ID
 */
export const normalizePackageId = (packageId?: string): string => {
  if (!packageId) return "8hrs-80km"; // Default package
  
  // First check for exact matches in our standardization map
  const normalizedId = packageId.replace('hrs-', 'hr_').replace('hr-', 'hr_');
  if (standardPackageIds[normalizedId]) {
    console.log(`Normalized package ID from ${packageId} to ${standardPackageIds[normalizedId]}`);
    return standardPackageIds[normalizedId];
  }
  
  // Then check for substring matches
  const packageIdLower = packageId.toLowerCase();
  
  if (packageIdLower.includes('10') && (
    packageIdLower.includes('hr') || 
    packageIdLower.includes('hour') || 
    packageIdLower.includes('100')
  )) {
    console.log(`Normalized package ID from ${packageId} to 10hrs-100km`);
    return "10hrs-100km";
  }
  
  if (packageIdLower.includes('8') && (
    packageIdLower.includes('hr') || 
    packageIdLower.includes('hour') || 
    packageIdLower.includes('80')
  )) {
    console.log(`Normalized package ID from ${packageId} to 8hrs-80km`);
    return "8hrs-80km";
  }
  
  if (packageIdLower.includes('4') && (
    packageIdLower.includes('hr') || 
    packageIdLower.includes('hour') || 
    packageIdLower.includes('40')
  )) {
    console.log(`Normalized package ID from ${packageId} to 4hrs-40km`);
    return "4hrs-40km";
  }
  
  console.log(`Could not normalize package ID: ${packageId}, using default 8hrs-80km`);
  return "8hrs-80km"; // Default fallback
};

/**
 * Normalizes vehicle IDs to ensure consistency across the application
 * @param vehicleId - The vehicle ID to normalize
 * @returns The normalized vehicle ID
 */
export const normalizeVehicleId = (vehicleId?: string): string => {
  if (!vehicleId) return ''; 
  
  // Convert to lowercase and trim
  const normalized = vehicleId.toLowerCase().trim();
  
  // Special case for MPV and Innova Hycross
  if (normalized === 'mpv' || 
      normalized.includes('hycross') || 
      normalized.includes('hi-cross') ||
      normalized.includes('hi_cross')) {
    console.log(`Normalized vehicle ID from ${vehicleId} to innova_hycross`);
    return 'innova_hycross';
  }
  
  // Handle Innova Crysta variations
  if (normalized.includes('crysta') || 
      (normalized.includes('innova') && !normalized.includes('hycross'))) {
    console.log(`Normalized vehicle ID from ${vehicleId} to innova_crysta`);
    return 'innova_crysta';
  }
  
  // Handle other specific mappings
  if (normalized.includes('tempo')) {
    console.log(`Normalized vehicle ID from ${vehicleId} to tempo_traveller`);
    return 'tempo_traveller';
  }
  
  if (normalized.includes('dzire') || normalized === 'cng' || normalized.includes('cng')) {
    console.log(`Normalized vehicle ID from ${vehicleId} to dzire_cng`);
    return 'dzire_cng';
  }
  
  if (normalized === 'sedan') {
    return 'sedan';
  }
  
  if (normalized === 'ertiga') {
    return 'ertiga';
  }
  
  // Remove spaces and special characters for other vehicle types
  const result = normalized.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  console.log(`Normalized vehicle ID from ${vehicleId} to ${result}`);
  return result;
};

/**
 * Gets the display name for a package
 * @param packageId - The package ID
 * @returns The display name for the package
 */
export const getPackageDisplayName = (packageId: string): string => {
  const normalizedId = normalizePackageId(packageId);
  
  switch (normalizedId) {
    case '4hrs-40km':
      return '4 Hours / 40 KM';
    case '8hrs-80km':
      return '8 Hours / 80 KM';
    case '10hrs-100km':
      return '10 Hours / 100 KM';
    default:
      return packageId.replace(/-/g, ' ').replace(/_/g, ' ');
  }
};

/**
 * Gets the standard hourly package options
 * @returns Array of hourly package options
 */
export const getStandardHourlyPackageOptions = () => [
  { value: "4hrs-40km", label: "4 Hours / 40 KM" },
  { value: "8hrs-80km", label: "8 Hours / 80 KM" },
  { value: "10hrs-100km", label: "10 Hours / 100 KM" }
];

/**
 * Dispatches events to notify components of package changes
 * @param packageId - The selected package ID
 */
export const notifyPackageChange = (packageId: string) => {
  if (!packageId) return;
  
  const normalizedId = normalizePackageId(packageId);
  const timestamp = Date.now();
  
  try {
    // Main package selection event
    window.dispatchEvent(new CustomEvent('hourly-package-selected', {
      detail: { 
        packageId: normalizedId,
        originalPackageId: packageId,
        timestamp: timestamp
      }
    }));
    
    // Force fare recalculation
    window.dispatchEvent(new CustomEvent('force-fare-recalculation', {
      detail: { 
        source: 'packageUtils',
        packageId: normalizedId,
        timestamp: timestamp + 1
      }
    }));
    
    // Booking summary package change
    window.dispatchEvent(new CustomEvent('booking-package-changed', {
      detail: {
        packageId: normalizedId,
        packageName: getPackageDisplayName(normalizedId),
        timestamp: timestamp + 2
      }
    }));
    
    console.log(`Dispatched package change events for ${normalizedId}`);
  } catch (error) {
    console.error('Error dispatching package change events:', error);
  }
};

/**
 * Saves package selection to storage
 * @param packageId - The package ID to save
 */
export const savePackageSelection = (packageId: string) => {
  if (!packageId) return;
  
  const normalizedId = normalizePackageId(packageId);
  
  try {
    // Save to sessionStorage for the current session
    sessionStorage.setItem('hourlyPackage', normalizedId);
    
    // Save to localStorage for persistence across sessions
    localStorage.setItem('selected_package', normalizedId);
    
    console.log(`Saved package selection: ${normalizedId}`);
  } catch (error) {
    console.error('Error saving package selection:', error);
  }
};
