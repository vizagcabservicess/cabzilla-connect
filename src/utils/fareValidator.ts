
import { normalizeVehicleId } from './safeStringUtils';

// Helper to validate fare amounts
export const validateFare = (fare: number, cabType: string, tripType: string): boolean => {
  if (!fare || isNaN(fare) || fare <= 0) return false;
  
  const cabId = typeof cabType === 'string' ? 
    normalizeVehicleId(cabType) : 
    cabType?.id ? normalizeVehicleId(cabType.id) : 'unknown';
  
  let minFare = 500;
  let maxFare = 20000;
  
  // Set min/max fares based on cab type and trip type
  if (cabId.includes('sedan')) {
    minFare = tripType === 'local' ? 1000 : (tripType === 'airport' ? 800 : 2000);
    maxFare = 8000;
  } else if (cabId.includes('ertiga') || cabId.includes('suv')) {
    minFare = tripType === 'local' ? 1500 : (tripType === 'airport' ? 1000 : 2500);
    maxFare = 12000;
  } else if (cabId.includes('innova')) {
    minFare = tripType === 'local' ? 2000 : (tripType === 'airport' ? 1200 : 3000);
    maxFare = 15000;
  }
  
  return fare >= minFare && fare <= maxFare;
};

// Generate a checksum for fare to ensure integrity
export const generateFareChecksum = (fare: number, cabId: string, tripType: string): string => {
  const normalized = normalizeVehicleId(cabId);
  return `${fare}_${normalized}_${tripType}_${Math.floor(fare % 100)}`;
};

// Validate a fare checksum
export const validateFareChecksum = (fare: number, cabId: string, tripType: string, checksum: string): boolean => {
  const expectedChecksum = generateFareChecksum(fare, cabId, tripType);
  return checksum === expectedChecksum;
};

// Store fare with validation
export const storeFareWithValidation = (
  cabId: string, 
  tripType: string, 
  fare: number, 
  details: Record<string, any> = {}
): boolean => {
  if (!validateFare(fare, cabId, tripType)) {
    console.error(`Invalid fare (${fare}) for ${cabId} - ${tripType}`);
    return false;
  }
  
  try {
    const normalizedId = normalizeVehicleId(cabId);
    const key = `valid_fare_${normalizedId}_${tripType}`;
    const checksum = generateFareChecksum(fare, cabId, tripType);
    
    const fareData = {
      fare,
      cabId: normalizedId,
      tripType,
      timestamp: Date.now(),
      checksum,
      ...details
    };
    
    // Store in both localStorage and sessionStorage for redundancy
    localStorage.setItem(key, JSON.stringify(fareData));
    sessionStorage.setItem(key, JSON.stringify(fareData));
    
    // Store in booking details for confirmation page
    const bookingDetails = sessionStorage.getItem('bookingDetails');
    if (bookingDetails) {
      try {
        const parsed = JSON.parse(bookingDetails);
        parsed.fareDetails = fareData;
        parsed.totalPrice = fare;
        sessionStorage.setItem('bookingDetails', JSON.stringify(parsed));
      } catch (e) {
        console.error('Error updating booking details with fare:', e);
      }
    }
    
    console.log(`Stored validated fare for ${normalizedId} (${tripType}): ${fare}`);
    return true;
  } catch (e) {
    console.error('Error storing fare data:', e);
    return false;
  }
};

// Get validated fare
export const getValidatedFare = (cabId: string, tripType: string): number | null => {
  try {
    const normalizedId = normalizeVehicleId(cabId);
    const key = `valid_fare_${normalizedId}_${tripType}`;
    
    // Try sessionStorage first (more recent)
    let fareData = null;
    const sessionFare = sessionStorage.getItem(key);
    if (sessionFare) {
      try {
        fareData = JSON.parse(sessionFare);
      } catch (e) {
        console.error('Error parsing session fare:', e);
      }
    }
    
    // Fall back to localStorage
    if (!fareData) {
      const localFare = localStorage.getItem(key);
      if (localFare) {
        try {
          fareData = JSON.parse(localFare);
        } catch (e) {
          console.error('Error parsing local fare:', e);
        }
      }
    }
    
    if (fareData && validateFare(fareData.fare, cabId, tripType)) {
      // Validate checksum
      if (fareData.checksum && validateFareChecksum(fareData.fare, cabId, tripType, fareData.checksum)) {
        return fareData.fare;
      } else {
        console.warn(`Checksum validation failed for ${normalizedId} fare: ${fareData.fare}`);
      }
    }
    
    return null;
  } catch (e) {
    console.error('Error getting validated fare:', e);
    return null;
  }
};

// Reconcile fares between pages
export const reconcileFares = (cabId: string, tripType: string, currentFare: number): number => {
  const validatedFare = getValidatedFare(cabId, tripType);
  
  if (validatedFare && Math.abs(validatedFare - currentFare) > 50) {
    // If there's a significant difference, log it and use the validated fare
    console.warn(`Fare mismatch detected! Current: ${currentFare}, Validated: ${validatedFare}`);
    return validatedFare;
  }
  
  return currentFare;
};

// Sync fare data between localStorage and sessionStorage
export const syncFareStorage = () => {
  try {
    // Find all fare-related keys
    const fareKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('fare_') || 
      key.startsWith('valid_fare_') ||
      key.includes('_fare_')
    );
    
    for (const key of fareKeys) {
      const localData = localStorage.getItem(key);
      const sessionData = sessionStorage.getItem(key);
      
      if (localData && !sessionData) {
        sessionStorage.setItem(key, localData);
      } else if (sessionData && !localData) {
        localStorage.setItem(key, sessionData);
      } else if (localData && sessionData) {
        // Compare timestamps and use the newer one
        try {
          const localParsed = JSON.parse(localData);
          const sessionParsed = JSON.parse(sessionData);
          
          if (localParsed.timestamp > sessionParsed.timestamp) {
            sessionStorage.setItem(key, localData);
          } else if (sessionParsed.timestamp > localParsed.timestamp) {
            localStorage.setItem(key, sessionData);
          }
        } catch (e) {
          console.error('Error comparing fare timestamps:', e);
        }
      }
    }
    
    console.log('Fare storage synchronized');
  } catch (e) {
    console.error('Error syncing fare storage:', e);
  }
};
