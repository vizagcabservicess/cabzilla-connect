
/**
 * This utility provides helpers to ensure consistent fare synchronization 
 * across different components in the booking flow.
 */

// Current fare version
const FARE_VERSION = '1.0.3';

/**
 * Ensures consistent fares are used between booking and confirmation pages
 */
export const syncFareForBookingConfirmation = (cabId: string, tripType: string, currentFare: number): number => {
  if (!cabId || !tripType || !currentFare) {
    console.warn('Missing parameters for fare synchronization');
    return currentFare;
  }
  
  try {
    // First try global booking fare key
    const globalFareLookupKey = `fareBooking_${cabId}_${tripType}`;
    const globalFareStr = localStorage.getItem(globalFareLookupKey) || sessionStorage.getItem(globalFareLookupKey);
    
    if (globalFareStr) {
      const globalFareData = JSON.parse(globalFareStr);
      if (globalFareData.fare && typeof globalFareData.fare === 'number' && globalFareData.fare > 0) {
        console.log(`Fare synced from global booking key: ₹${globalFareData.fare} (Original: ₹${currentFare})`);
        return globalFareData.fare;
      }
    }
    
    // Try simplified key
    const simplifiedKey = `${tripType}_fare_${cabId.toLowerCase()}`;
    const simplifiedFareStr = localStorage.getItem(simplifiedKey) || sessionStorage.getItem(simplifiedKey);
    
    if (simplifiedFareStr) {
      const simplifiedFareData = JSON.parse(simplifiedFareStr);
      if (simplifiedFareData.fare && typeof simplifiedFareData.fare === 'number' && simplifiedFareData.fare > 0) {
        console.log(`Fare synced from simplified key: ₹${simplifiedFareData.fare} (Original: ₹${currentFare})`);
        return simplifiedFareData.fare;
      }
    }
  } catch (e) {
    console.error('Error syncing fare:', e);
  }
  
  return currentFare;
};

/**
 * Stores a fare in all storage mechanisms to ensure consistency
 */
export const storeSyncedFare = (cabId: string, tripType: string, fare: number, details: any = {}): boolean => {
  if (!cabId || !tripType || !fare || fare <= 0) {
    console.warn('Invalid parameters for storing synced fare');
    return false;
  }
  
  try {
    const fareData = {
      fare,
      timestamp: Date.now(),
      source: details.source || 'sync',
      version: FARE_VERSION,
      tripType,
      ...details
    };
    
    // Store in global booking fare key
    const globalFareLookupKey = `fareBooking_${cabId}_${tripType}`;
    localStorage.setItem(globalFareLookupKey, JSON.stringify(fareData));
    sessionStorage.setItem(globalFareLookupKey, JSON.stringify(fareData));
    
    // Store in simplified key
    const simplifiedKey = `${tripType}_fare_${cabId.toLowerCase()}`;
    localStorage.setItem(simplifiedKey, JSON.stringify(fareData));
    sessionStorage.setItem(simplifiedKey, JSON.stringify(fareData));
    
    console.log(`Successfully stored synced fare: ₹${fare} for ${cabId} (${tripType})`);
    return true;
  } catch (e) {
    console.error('Error storing synced fare:', e);
    return false;
  }
};

/**
 * Retrieves the most reliable fare for a cab and trip type
 */
export const getReliableFare = (cabId: string, tripType: string, fallbackFare: number = 0): number => {
  try {
    // First try global booking fare key
    const globalFareLookupKey = `fareBooking_${cabId}_${tripType}`;
    const globalFareStr = localStorage.getItem(globalFareLookupKey) || sessionStorage.getItem(globalFareLookupKey);
    
    if (globalFareStr) {
      const globalFareData = JSON.parse(globalFareStr);
      if (globalFareData.fare && typeof globalFareData.fare === 'number' && globalFareData.fare > 0) {
        console.log(`Retrieved reliable fare from global key: ₹${globalFareData.fare}`);
        return globalFareData.fare;
      }
    }
    
    // Try simplified key
    const simplifiedKey = `${tripType}_fare_${cabId.toLowerCase()}`;
    const simplifiedFareStr = localStorage.getItem(simplifiedKey) || sessionStorage.getItem(simplifiedKey);
    
    if (simplifiedFareStr) {
      const simplifiedFareData = JSON.parse(simplifiedFareStr);
      if (simplifiedFareData.fare && typeof simplifiedFareData.fare === 'number' && simplifiedFareData.fare > 0) {
        console.log(`Retrieved reliable fare from simplified key: ₹${simplifiedFareData.fare}`);
        return simplifiedFareData.fare;
      }
    }
  } catch (e) {
    console.error('Error getting reliable fare:', e);
  }
  
  return fallbackFare;
};

/**
 * Check if a fare needs to be synchronized (if different values exist in storage)
 */
export const checkFareSyncNeeded = (cabId: string, tripType: string, currentFare: number): boolean => {
  try {
    const reliableFare = getReliableFare(cabId, tripType, currentFare);
    
    // If the reliable fare is significantly different, sync needed
    if (Math.abs(reliableFare - currentFare) > 10) {
      console.log(`Fare sync needed for ${cabId}: Current ₹${currentFare} vs Stored ₹${reliableFare}`);
      return true;
    }
  } catch (e) {
    console.error('Error checking fare sync:', e);
  }
  
  return false;
};
