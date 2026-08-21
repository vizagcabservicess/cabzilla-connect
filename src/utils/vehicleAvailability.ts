import { CabType, InactiveDateRange } from '@/types/cab';

/**
 * Check if a vehicle is available on a specific date
 * @param vehicle - The vehicle to check
 * @param date - The date to check availability for
 * @returns true if vehicle is available, false if inactive
 */
function isUsableDate(date: Date | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

export function isVehicleAvailableOnDate(vehicle: CabType, date: Date): boolean {
  if (!isUsableDate(date)) {
    return Boolean(vehicle.isActive);
  }

  // If vehicle is not active, it's not available
  if (!vehicle.isActive) {
    return false;
  }

  // If no inactive dates are set, vehicle is available
  if (!vehicle.inactiveDates || vehicle.inactiveDates.length === 0) {
    return true;
  }

  // Check if the date falls within any inactive period
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0); // Reset time to start of day

  for (const inactivePeriod of vehicle.inactiveDates) {
    const fromDate = new Date(inactivePeriod.from);
    const toDate = new Date(inactivePeriod.to);
    
    // Convert to local date for comparison (remove timezone offset)
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999); // End of day

    if (checkDate >= fromDate && checkDate <= toDate) {
      return false; // Vehicle is inactive on this date
    }
  }

  return true; // Vehicle is available
}

/**
 * Check if a vehicle is available for a date range
 * @param vehicle - The vehicle to check
 * @param startDate - The start date of the range
 * @param endDate - The end date of the range (optional, defaults to startDate)
 * @returns true if vehicle is available for the entire range, false if inactive on any date
 */
export function isVehicleAvailableForDateRange(
  vehicle: CabType, 
  startDate: Date, 
  endDate?: Date
): boolean {
  if (!isUsableDate(startDate)) {
    return Boolean(vehicle.isActive);
  }
  const end = isUsableDate(endDate) ? endDate : startDate;
  const current = new Date(startDate);
  
  while (current <= end) {
    if (!isVehicleAvailableOnDate(vehicle, current)) {
      return false;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return true;
}

/**
 * Filter vehicles based on availability for a specific date or date range
 * @param vehicles - Array of vehicles to filter
 * @param date - The date to check availability for
 * @param endDate - Optional end date for range checking
 * @returns Array of available vehicles
 */
export function filterAvailableVehicles(
  vehicles: CabType[], 
  date: Date, 
  endDate?: Date
): CabType[] {
  if (!isUsableDate(date)) {
    return vehicles.filter((vehicle) => vehicle.isActive !== false);
  }
  return vehicles.filter(vehicle => {
    if (endDate) {
      return isVehicleAvailableForDateRange(vehicle, date, endDate);
    } else {
      return isVehicleAvailableOnDate(vehicle, date);
    }
  });
}

/**
 * Get the reason why a vehicle is unavailable on a specific date
 * @param vehicle - The vehicle to check
 * @param date - The date to check
 * @returns The reason string if unavailable, null if available
 */
export function getVehicleUnavailabilityReason(vehicle: CabType, date: Date): string | null {
  if (!vehicle.isActive) {
    return 'Vehicle is currently inactive';
  }

  if (!vehicle.inactiveDates || vehicle.inactiveDates.length === 0) {
    return null; // Vehicle is available
  }
  

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  for (const inactivePeriod of vehicle.inactiveDates) {
    const fromDate = new Date(inactivePeriod.from);
    const toDate = new Date(inactivePeriod.to);
    
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    if (checkDate >= fromDate && checkDate <= toDate) {
      return inactivePeriod.reason || 'Vehicle is not available on this date';
    }
  }

  return null; // Vehicle is available
}
