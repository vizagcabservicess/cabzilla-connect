import { toast } from 'sonner';
import fareStateManager from './FareStateManager';
import { getApiUrl, getBypassHeaders } from '@/config/api';
import { LocalFareData } from '@/types/cab';

if (!fareStateManager.storeLocalFare) {
  fareStateManager.storeLocalFare = async (vehicleId: string, fareData: any) => {
    console.log('FareStateManager.storeLocalFare polyfill called', vehicleId, fareData);
    try {
      if (typeof fareStateManager.updateInternalCache === 'function') {
        fareStateManager.updateInternalCache('local', vehicleId, fareData);
      }
      return true;
    } catch (e) {
      console.error('Failed to update internal cache:', e);
      return false;
    }
  };
}

const localFareCache = new Map<string, { data: LocalFareData, timestamp: number }>();
const CACHE_DURATION = 2 * 60 * 1000;

export const normalizeHourlyPackage = (packageStr: string): string => {
  if (!packageStr) return '';
  
  const normalized = packageStr.toLowerCase().replace(/\s+/g, '');
  
  if (normalized.includes('4hr') || normalized.includes('4hrs') || normalized.includes('4h40') || normalized.includes('4hr40km')) {
    return '4hr40km';
  } else if (normalized.includes('8hr') || normalized.includes('8hrs') || normalized.includes('8h80') || normalized.includes('8hr80km')) {
    return '8hr80km';
  } else if (normalized.includes('10hr') || normalized.includes('10hrs') || normalized.includes('10h100') || normalized.includes('10hr100km')) {
    return '10hr100km';
  }
  
  return packageStr;
};

export const fetchLocalFare = async (vehicleId: string): Promise<LocalFareData | null> => {
  try {
    console.log(`Fetching local fare for vehicle ${vehicleId}`);
    
    if (!vehicleId) {
      console.error('Vehicle ID is required for fetchLocalFare');
      return null;
    }
    
    const cachedFare = localFareCache.get(vehicleId);
    if (cachedFare && Date.now() - cachedFare.timestamp < CACHE_DURATION) {
      console.log(`Using cached local fare for ${vehicleId}`);
      return cachedFare.data;
    }
    
    const fareData = await fareStateManager.getLocalFareForVehicle(vehicleId);
    
    if (fareData) {
      console.log(`Retrieved local fare from FareStateManager for ${vehicleId}`, fareData);
      
      const standardizedData: LocalFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        price4hrs40km: parseFloat(String(fareData.price4hrs40km || fareData.price_4hrs_40km || fareData.local_package_4hr || 0)),
        price8hrs80km: parseFloat(String(fareData.price8hrs80km || fareData.price_8hrs_80km || fareData.local_package_8hr || 0)),
        price10hrs100km: parseFloat(String(fareData.price10hrs100km || fareData.price_10hrs_100km || fareData.local_package_10hr || 0)),
        priceExtraKm: parseFloat(String(fareData.priceExtraKm || fareData.extraKmRate || fareData.price_extra_km || fareData.extra_km_charge || 0)),
        priceExtraHour: parseFloat(String(fareData.priceExtraHour || fareData.extraHourRate || fareData.price_extra_hour || fareData.extra_hour_charge || 0))
      };
      
      if (standardizedData.price4hrs40km <= 0 || 
          standardizedData.price8hrs80km <= 0 || 
          standardizedData.price10hrs100km <= 0) {
        console.warn(`Retrieved local fare has invalid values for vehicle ${vehicleId}`, standardizedData);
      } else {
        localFareCache.set(vehicleId, {
          data: standardizedData,
          timestamp: Date.now()
        });
        
        return standardizedData;
      }
    }
    
    const response = await fetch(
      getApiUrl(`api/direct-local-fares.php?vehicle_id=${vehicleId}&_t=${Date.now()}`),
      { headers: getBypassHeaders() }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'success' && data.fares && Array.isArray(data.fares) && data.fares.length > 0) {
      const fareItem = data.fares.find((fare: any) => 
        fare.vehicleId === vehicleId || 
        fare.vehicle_id === vehicleId
      );
      
      if (!fareItem) {
        console.error(`No fare found for vehicle ${vehicleId} in API response`);
        return null;
      }
      
      const fareData: LocalFareData = {
        vehicleId,
        vehicle_id: vehicleId,
        price4hrs40km: parseFloat(String(fareItem.price4hrs40km || fareItem.price_4hrs_40km || fareItem.local_package_4hr || fareItem.package4hr40km || 0)),
        price8hrs80km: parseFloat(String(fareItem.price8hrs80km || fareItem.price_8hrs_80km || fareItem.local_package_8hr || fareItem.package8hr80km || 0)),
        price10hrs100km: parseFloat(String(fareItem.price10hrs100km || fareItem.price_10hrs_100km || fareItem.local_package_10hr || fareItem.package10hr100km || 0)),
        priceExtraKm: parseFloat(String(fareItem.priceExtraKm || fareItem.extraKmRate || fareItem.price_extra_km || fareItem.extra_km_charge || 0)),
        priceExtraHour: parseFloat(String(fareItem.priceExtraHour || fareItem.extraHourRate || fareItem.price_extra_hour || fareItem.extra_hour_charge || 0))
      };
      
      if (fareData.price4hrs40km <= 0 || 
          fareData.price8hrs80km <= 0 || 
          fareData.price10hrs100km <= 0) {
        console.warn(`Direct API returned invalid local fare for vehicle ${vehicleId}`, fareData);
        return null;
      }
      
      localFareCache.set(vehicleId, {
        data: fareData,
        timestamp: Date.now()
      });
      
      fareStateManager.storeLocalFare(vehicleId, fareData);
      
      return fareData;
    }
    
    throw new Error('No valid fare data found in the response');
  } catch (error) {
    console.error(`Error fetching local fare for ${vehicleId}:`, error);
    return null;
  }
};

export const getLocalPackagePrice = (fareData: LocalFareData, hourlyPackage: string): number => {
  const normalizedPackage = normalizeHourlyPackage(hourlyPackage);
  
  console.log(`Getting local price for package ${hourlyPackage} (normalized: ${normalizedPackage})`);
  
  switch (normalizedPackage) {
    case '4hr40km':
    case '4hrs40km':
      return fareData.price4hrs40km;
    case '8hr80km':
    case '8hrs80km':
      return fareData.price8hrs80km;
    case '10hr100km':
    case '10hrs100km':
      return fareData.price10hrs100km;
    default:
      console.error(`Unsupported package type: ${hourlyPackage}`);
      if (hourlyPackage.includes('4') && (hourlyPackage.includes('hr') || hourlyPackage.includes('h'))) {
        return fareData.price4hrs40km;
      } else if (hourlyPackage.includes('8') && (hourlyPackage.includes('hr') || hourlyPackage.includes('h'))) {
        return fareData.price8hrs80km;
      } else if (hourlyPackage.includes('10') && (hourlyPackage.includes('hr') || hourlyPackage.includes('h'))) {
        return fareData.price10hrs100km;
      }
      return 0;
  }
};

export const updateLocalFare = async (fareData: LocalFareData): Promise<boolean> => {
  try {
    console.log(`Updating local fare for vehicle ${fareData.vehicleId}`, fareData);
    
    if (!fareData.vehicleId) {
      throw new Error('Vehicle ID is required');
    }
    
    const formData = new FormData();
    formData.append('vehicle_id', fareData.vehicleId);
    formData.append('price4hrs40km', String(fareData.price4hrs40km));
    formData.append('price_4hrs_40km', String(fareData.price4hrs40km));
    formData.append('price8hrs80km', String(fareData.price8hrs80km));
    formData.append('price_8hrs_80km', String(fareData.price8hrs80km));
    formData.append('price10hrs100km', String(fareData.price10hrs100km));
    formData.append('price_10hrs_100km', String(fareData.price10hrs100km));
    formData.append('priceExtraKm', String(fareData.priceExtraKm));
    formData.append('price_extra_km', String(fareData.priceExtraKm));
    formData.append('priceExtraHour', String(fareData.priceExtraHour));
    formData.append('price_extra_hour', String(fareData.priceExtraHour));
    
    const response = await fetch(getApiUrl('api/admin/direct-local-fares.php'), {
      method: 'POST',
      body: formData,
      headers: {
        'X-Admin-Mode': 'true',
        'X-Force-Refresh': 'true'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status === 'success') {
      console.log('Local fare update successful:', result);
      
      localFareCache.delete(fareData.vehicleId);
      fareStateManager.clearCache();
      
      setTimeout(() => {
        fareStateManager.syncFareData().then(() => {
          console.log('Fare data synced after local fare update');
        });
      }, 1000);
      
      toast("Local fare updated successfully.");
      
      return true;
    } else {
      throw new Error(result.message || 'Unknown error updating local fare');
    }
  } catch (error) {
    console.error('Error updating local fare:', error);
    
    toast(`Failed to update local fare: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

export const initializeLocalFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/local-fares.php?init=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('Local fare tables initialization result:', result);
    
    localFareCache.clear();
    fareStateManager.clearCache();
    
    setTimeout(() => {
      fareStateManager.syncFareData().then(() => {
        console.log('Fare data synced after table initialization');
      });
    }, 1000);
    
    toast("Local fare tables initialized successfully.");
    
    return true;
  } catch (error) {
    console.error('Error initializing local fare tables:', error);
    
    toast(`Failed to initialize local fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};

export const syncLocalFareTables = async (): Promise<boolean> => {
  try {
    const response = await fetch(getApiUrl('api/local-fares.php?sync=true&_t=' + Date.now()), {
      headers: getBypassHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('Local fare tables sync result:', result);
    
    localFareCache.clear();
    fareStateManager.clearCache();
    
    setTimeout(() => {
      fareStateManager.syncFareData().then(() => {
        console.log('Fare data synced after table sync');
      });
    }, 1000);
    
    toast("Local fare tables synced successfully.");
    
    return true;
  } catch (error) {
    console.error('Error syncing local fare tables:', error);
    
    toast(`Failed to sync local fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    return false;
  }
};
