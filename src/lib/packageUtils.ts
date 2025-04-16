
/**
 * Standard package normalization utility to ensure consistent package IDs across the application
 */

// Standard mapping for package IDs with strict formatting
const standardPackageIds: Record<string, string> = {
  // 4hr packages
  "4hr_40km": "4hrs-40km",
  "04hr_40km": "4hrs-40km",
  "04hrs_40km": "4hrs-40km",
  "4hrs_40km": "4hrs-40km",
  "4hours_40km": "4hrs-40km",
  "4hr-40km": "4hrs-40km",
  "4hrs": "4hrs-40km",
  "4hours": "4hrs-40km",
  "40km": "4hrs-40km",
  
  // 8hr packages
  "8hr_80km": "8hrs-80km",
  "8hrs_80km": "8hrs-80km",
  "8hours_80km": "8hrs-80km",
  "8hr-80km": "8hrs-80km",
  "8hrs": "8hrs-80km",
  "8hours": "8hrs-80km",
  "80km": "8hrs-80km",
  
  // 10hr packages
  "10hr_100km": "10hrs-100km",
  "10hrs_100km": "10hrs-100km",
  "10hours_100km": "10hrs-100km",
  "10hr-100km": "10hrs-100km",
  "10hrs": "10hrs-100km",
  "10hours": "10hrs-100km",
  "100km": "10hrs-100km"
};

// Standard vehicle ID mapping to ensure consistency
const standardVehicleIds: Record<string, string> = {
  // Sedan variants
  "sedan": "sedan",
  "swift dzire": "dzire_cng",
  "dzire": "dzire_cng",
  "cng": "dzire_cng",
  "dzire_cng": "dzire_cng",
  "swift": "dzire_cng",
  
  // Ertiga variants
  "ertiga": "ertiga",
  "maruti_ertiga": "ertiga",
  "maruti ertiga": "ertiga",
  
  // Innova variants
  "innova": "innova_crysta",
  "crysta": "innova_crysta",
  "innova_crysta": "innova_crysta",
  "innova crysta": "innova_crysta",
  "toyota_innova": "innova_crysta",
  "toyota innova": "innova_crysta",
  
  // Innova Hycross
  "hycross": "innova_hycross",
  "hi-cross": "innova_hycross",
  "hi_cross": "innova_hycross",
  "innova_hycross": "innova_hycross",
  "innova hycross": "innova_hycross",
  "mpv": "innova_hycross",
  
  // Tempo Traveller variants
  "tempo": "tempo_traveller",
  "traveller": "tempo_traveller",
  "tempo_traveller": "tempo_traveller",
  "tempo traveller": "tempo_traveller"
};

/**
 * Normalizes package IDs to ensure consistency across the application
 * @param packageId - The package ID to normalize
 * @returns The normalized package ID
 */
export const normalizePackageId = (packageId?: string): string => {
  if (!packageId) return "8hrs-80km"; // Default package
  
  // Convert to lowercase and standardize separators
  const normalizedId = packageId.toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace('hrs-', 'hr_')
    .replace('hr-', 'hr_');
  
  // First check for exact matches in our standardization map
  if (standardPackageIds[normalizedId]) {
    return standardPackageIds[normalizedId];
  }
  
  // Then check for substring matches
  if (normalizedId.includes('10') || normalizedId.includes('100')) {
    return "10hrs-100km";
  }
  
  if (normalizedId.includes('8') || normalizedId.includes('80')) {
    return "8hrs-80km";
  }
  
  if (normalizedId.includes('4') || normalizedId.includes('40')) {
    return "4hrs-40km";
  }
  
  // Default to 8hr package if no match
  return "8hrs-80km";
};

/**
 * Normalizes vehicle IDs to ensure consistency across the application
 * @param vehicleId - The vehicle ID to normalize
 * @returns The normalized vehicle ID
 */
export const normalizeVehicleId = (vehicleId?: string): string => {
  if (!vehicleId) return ''; 
  
  // Convert to lowercase, trim and standardize
  const normalizedId = vehicleId.toLowerCase().trim();
  
  // Check direct mapping first
  if (standardVehicleIds[normalizedId]) {
    return standardVehicleIds[normalizedId];
  }
  
  // Special case checks for partial matches
  if (normalizedId.includes('hycross') || 
      normalizedId.includes('hi-cross') ||
      normalizedId.includes('hi_cross') ||
      normalizedId === 'mpv') {
    return 'innova_hycross';
  }
  
  if (normalizedId.includes('crysta') || 
      (normalizedId.includes('innova') && !normalizedId.includes('hycross'))) {
    return 'innova_crysta';
  }
  
  if (normalizedId.includes('tempo') || normalizedId.includes('traveller')) {
    return 'tempo_traveller';
  }
  
  if (normalizedId.includes('dzire') || 
      normalizedId.includes('cng') || 
      normalizedId.includes('swift')) {
    return 'dzire_cng';
  }
  
  if (normalizedId.includes('ertiga')) {
    return 'ertiga';
  }
  
  if (normalizedId === 'sedan') {
    return 'sedan';
  }
  
  // Remove spaces and special characters for other vehicle types
  const result = normalizedId.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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
 * Dispatches events to notify components of package changes with throttling
 * @param packageId - The selected package ID
 */
export const notifyPackageChange = (packageId: string) => {
  if (!packageId) return;
  
  const normalizedId = normalizePackageId(packageId);
  
  // Check if we've recently dispatched this same event to prevent loops
  const lastEventTime = parseInt(sessionStorage.getItem('lastPackageChangeEvent') || '0', 10);
  const now = Date.now();
  
  if (now - lastEventTime < 5000) { // 5 second throttle
    console.log(`Package change notification throttled (${now - lastEventTime}ms since last event)`);
    return;
  }
  
  sessionStorage.setItem('lastPackageChangeEvent', now.toString());
  
  try {
    // Dispatch fewer events with more consolidated data
    window.dispatchEvent(new CustomEvent('hourly-package-selected', {
      detail: { 
        packageId: normalizedId,
        originalPackageId: packageId,
        packageName: getPackageDisplayName(normalizedId),
        timestamp: now,
        // Include more data to reduce need for multiple events
        forceRefresh: true
      }
    }));
    
    console.log(`Dispatched package change event for ${normalizedId}`);
  } catch (error) {
    console.error('Error dispatching package change event:', error);
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
