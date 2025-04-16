
// API and request configuration functions

/**
 * Normalize vehicle ID for consistent handling across components
 * @param vehicleId The raw vehicle ID from the UI
 * @returns Normalized vehicle ID
 */
export const normalizeVehicleId = (vehicleId: string): string => {
  // Convert to lowercase and replace spaces with underscores
  let normalized = vehicleId.toLowerCase().trim().replace(/\s+/g, '_');
  
  // Handle common variations
  const vehicleMapping: Record<string, string> = {
    'innovahycross': 'innova_hycross',
    'innovacrystal': 'innova_crysta',
    'innovacrista': 'innova_crysta',
    'innova_crista': 'innova_crysta',
    'innovahicross': 'innova_hycross',
    'innova_hicross': 'innova_hycross',
    'tempotraveller': 'tempo_traveller',
    'tempo_traveler': 'tempo_traveller',
    'cng': 'dzire_cng',
    'dzirecng': 'dzire_cng',
    'sedancng': 'dzire_cng',
    'swift': 'sedan',
    'swiftdzire': 'dzire',
    'swift_dzire': 'dzire',
    'innovaold': 'innova_crysta',
    'mpv': 'innova_hycross'
  };
  
  // Check if the normalized vehicle ID matches any of our mappings
  if (vehicleMapping[normalized]) {
    return vehicleMapping[normalized];
  }
  
  // Special handling for vehicle names that contain keywords
  if (normalized.includes('hycross')) {
    return 'innova_hycross';
  } else if (normalized.includes('crysta')) {
    return 'innova_crysta';
  } else if (normalized.includes('tempo') || normalized.includes('traveller')) {
    return 'tempo_traveller';
  } else if (normalized.includes('dzire') && normalized.includes('cng')) {
    return 'dzire_cng';
  } else if (normalized === 'mpv') {
    return 'innova_hycross';
  }
  
  return normalized;
};

/**
 * Normalize package ID for consistent handling across components
 * @param packageId The raw package ID from the UI
 * @returns Normalized package ID
 */
export const normalizePackageId = (packageId: string): string => {
  // Convert to lowercase
  let normalized = packageId.toLowerCase().trim();
  
  // Handle common variations
  const packageMapping: Record<string, string> = {
    '4hr_40km': '4hrs-40km',
    '04hr_40km': '4hrs-40km',
    '04hrs_40km': '4hrs-40km',
    '4hrs_40km': '4hrs-40km',
    '8hr_80km': '8hrs-80km',
    '8hrs_80km': '8hrs-80km', 
    '10hr_100km': '10hrs-100km',
    '10hrs_100km': '10hrs-100km'
  };
  
  // Replace underscores with hyphens for consistency
  normalized = normalized.replace(/_/g, '-');
  
  // Check if the normalized package ID matches any of our mappings
  if (packageMapping[normalized]) {
    return packageMapping[normalized];
  }
  
  // If no direct mapping, try to identify by hours
  if (normalized.includes('4') && normalized.includes('40')) {
    return '4hrs-40km';
  } else if (normalized.includes('8') && normalized.includes('80')) {
    return '8hrs-80km';
  } else if (normalized.includes('10') && normalized.includes('100')) {
    return '10hrs-100km';
  }
  
  return normalized;
};

/**
 * Generates request parameters for vehicle booking
 */
export const buildBookingRequestParams = (formData: any): Record<string, any> => {
  // Extract and format booking data...
  return {
    // Booking parameters
    trip_type: formData.tripType,
    pickup_location: formData.pickupLocation,
    drop_location: formData.dropLocation || '',
    pickup_date: formData.pickupDate,
    return_date: formData.returnDate || '',
    pickup_time: formData.pickupTime,
    vehicle_id: normalizeVehicleId(formData.selectedCab),
    package_id: formData.hourlyPackage ? normalizePackageId(formData.hourlyPackage) : '',
    distance: formData.distance,
    customer_name: formData.customerName,
    customer_phone: formData.customerPhone,
    customer_email: formData.customerEmail,
    special_instructions: formData.specialInstructions || '',
    fare: formData.fare,
    status: 'pending'
  };
};

export default {
  normalizeVehicleId,
  normalizePackageId,
  buildBookingRequestParams
};
