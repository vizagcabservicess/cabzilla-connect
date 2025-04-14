
// This file manages fare state across the application

class FareStateManager {
  private localFares: Map<string, any> = new Map();
  private airportFares: Map<string, any> = new Map();
  private outstationFares: Map<string, any> = new Map();
  
  async syncFareData(): Promise<boolean> {
    console.log('FareStateManager: Syncing fare data');
    // Implementation would go here in a full version
    return true;
  }
  
  clearCache(): void {
    console.log('FareStateManager: Clearing cache');
    this.localFares.clear();
    this.airportFares.clear();
    this.outstationFares.clear();
  }
  
  async getLocalFareForVehicle(vehicleId: string): Promise<any | null> {
    return this.localFares.get(vehicleId) || null;
  }
  
  async getAirportFareForVehicle(vehicleId: string): Promise<any | null> {
    return this.airportFares.get(vehicleId) || null;
  }
  
  async getOutstationFareForVehicle(vehicleId: string): Promise<any | null> {
    return this.outstationFares.get(vehicleId) || null;
  }
  
  async storeLocalFare(vehicleId: string, fareData: any): Promise<boolean> {
    this.localFares.set(vehicleId, fareData);
    return true;
  }
  
  async storeAirportFare(vehicleId: string, fareData: any): Promise<boolean> {
    this.airportFares.set(vehicleId, fareData);
    return true;
  }
  
  async storeOutstationFare(vehicleId: string, fareData: any): Promise<boolean> {
    this.outstationFares.set(vehicleId, fareData);
    return true;
  }
  
  updateInternalCache(fareType: 'local' | 'airport' | 'outstation', vehicleId: string, fareData: any): void {
    if (fareType === 'local') {
      this.localFares.set(vehicleId, fareData);
    } else if (fareType === 'airport') {
      this.airportFares.set(vehicleId, fareData);
    } else if (fareType === 'outstation') {
      this.outstationFares.set(vehicleId, fareData);
    }
  }
  
  // Add the missing calculation methods that components are trying to use
  async calculateLocalFare(params: { vehicleId: string, hourlyPackage: string }): Promise<number> {
    const { vehicleId, hourlyPackage } = params;
    console.log(`FareStateManager: Calculating local fare for ${vehicleId}, package: ${hourlyPackage}`);
    const fareData = await this.getLocalFareForVehicle(vehicleId);
    
    if (!fareData) return 0;
    
    // Extract package price based on package type
    if (hourlyPackage.includes('4hr') || hourlyPackage.includes('4hrs')) {
      return fareData.price4hrs40km || 0;
    } else if (hourlyPackage.includes('8hr') || hourlyPackage.includes('8hrs')) {
      return fareData.price8hrs80km || 0;
    } else if (hourlyPackage.includes('10hr') || hourlyPackage.includes('10hrs')) {
      return fareData.price10hrs100km || 0;
    }
    
    return 0;
  }
  
  async calculateOutstationFare(params: { vehicleId: string, distance: number, tripMode: 'one-way' | 'round-trip', pickupDate?: Date }): Promise<number> {
    const { vehicleId, distance, tripMode } = params;
    console.log(`FareStateManager: Calculating outstation fare for ${vehicleId}, distance: ${distance}, mode: ${tripMode}`);
    const fareData = await this.getOutstationFareForVehicle(vehicleId);
    
    if (!fareData) return 0;
    
    // Calculate based on trip mode
    if (tripMode === 'round-trip') {
      return (fareData.roundTripBasePrice || 0) + (distance * (fareData.roundTripPricePerKm || 0));
    } else {
      return (fareData.basePrice || 0) + (distance * (fareData.pricePerKm || 0));
    }
  }
  
  async calculateAirportFare(params: { vehicleId: string, distance: number }): Promise<number> {
    const { vehicleId, distance } = params;
    console.log(`FareStateManager: Calculating airport fare for ${vehicleId}, distance: ${distance}`);
    const fareData = await this.getAirportFareForVehicle(vehicleId);
    
    if (!fareData) return 0;
    
    let fare = fareData.basePrice || 0;
    
    if (distance <= 10) {
      fare += fareData.tier1Price || 0;
    } else if (distance <= 20) {
      fare += fareData.tier2Price || 0;
    } else if (distance <= 30) {
      fare += fareData.tier3Price || 0;
    } else {
      fare += fareData.tier4Price || 0;
      const extraKm = distance - 30;
      if (extraKm > 0) {
        fare += extraKm * (fareData.extraKmCharge || 0);
      }
    }
    
    return fare + (distance * (fareData.pricePerKm || 0));
  }
}

// Create and export a singleton instance
const fareStateManager = new FareStateManager();
export default fareStateManager;
