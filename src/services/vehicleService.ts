
import { toast } from 'sonner';
import { fetchVehicleData, updateVehicleData } from '../api/vehicles-data';
import { CabType } from '@/types/cab';

export interface VehicleUpdateResult {
  success: boolean;
  message: string;
  error?: any;
}

/**
 * Service for handling vehicle-related operations
 */
export const vehicleService = {
  /**
   * Get all available vehicles
   */
  async getVehicles(forceRefresh = false): Promise<CabType[]> {
    try {
      const vehicles = await fetchVehicleData(forceRefresh);
      
      if (!vehicles || !Array.isArray(vehicles)) {
        console.warn("Invalid vehicle data structure received");
        return [];
      }
      
      // Normalize vehicle data to ensure consistent structure
      return vehicles.map(vehicle => ({
        id: vehicle.id || vehicle.cab_id || vehicle.vehicle_id || `cab_${Math.random().toString(36).substring(2, 9)}`,
        name: vehicle.name || vehicle.cab_name || vehicle.vehicle_name || 'Unknown Vehicle',
        description: vehicle.description || vehicle.cab_description || vehicle.vehicle_description || '',
        image: vehicle.image || vehicle.cab_image || vehicle.vehicle_image || '',
        basePrice: Number(vehicle.basePrice || vehicle.base_price || vehicle.price || 0),
        pricePerKm: Number(vehicle.pricePerKm || vehicle.price_per_km || 0),
        price: Number(vehicle.price || vehicle.basePrice || vehicle.base_price || 0),
        capacity: Number(vehicle.capacity || vehicle.passenger_capacity || 4),
        luggage: Number(vehicle.luggage || vehicle.luggage_capacity || 2),
        acAvailable: Boolean(vehicle.acAvailable || vehicle.ac_available || true),
        hr8km80Price: Number(vehicle.hr8km80Price || vehicle.hr_8km_80_price || 0),
        hr10km100Price: Number(vehicle.hr10km100Price || vehicle.hr_10km_100_price || 0),
        driverAllowance: Number(vehicle.driverAllowance || vehicle.driver_allowance || 300),
        nightHaltCharge: Number(vehicle.nightHaltCharge || vehicle.night_halt_charge || 300),
        airportFee: Number(vehicle.airportFee || vehicle.airport_fee || 0)
      }));
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast.error("Failed to load vehicles. Using default vehicles instead.");
      
      // Return default vehicles on error
      return [
        {
          id: "sedan",
          name: "Sedan",
          description: "Comfortable 4-seater sedan",
          image: "/images/cars/sedan.png",
          basePrice: 800,
          pricePerKm: 12,
          price: 800,
          capacity: 4,
          luggage: 2,
          acAvailable: true,
          hr8km80Price: 1200,
          hr10km100Price: 1500,
          driverAllowance: 300,
          nightHaltCharge: 300
        },
        {
          id: "ertiga",
          name: "Ertiga",
          description: "Spacious 6-seater MUV",
          image: "/images/cars/ertiga.png",
          basePrice: 1200,
          pricePerKm: 15,
          price: 1200,
          capacity: 6,
          luggage: 3,
          acAvailable: true,
          hr8km80Price: 1800,
          hr10km100Price: 2100,
          driverAllowance: 350,
          nightHaltCharge: 350
        },
        {
          id: "innovacrys",
          name: "Innova Crysta",
          description: "Premium 6-seater SUV",
          image: "/images/cars/innova.png",
          basePrice: 1500,
          pricePerKm: 18,
          price: 1500,
          capacity: 6,
          luggage: 4,
          acAvailable: true,
          hr8km80Price: 2100,
          hr10km100Price: 2400,
          driverAllowance: 400,
          nightHaltCharge: 400
        }
      ];
    }
  },
  
  /**
   * Update vehicle pricing data
   */
  async updateVehiclePricing(vehicles: CabType[]): Promise<VehicleUpdateResult> {
    try {
      // Prepare vehicles in both camelCase and snake_case formats
      const normalizedVehicles = vehicles.map(vehicle => {
        const normalizedVehicle = {
          ...vehicle,
          // Add snake_case versions
          cab_id: vehicle.id,
          vehicle_id: vehicle.id,
          cab_name: vehicle.name,
          vehicle_name: vehicle.name,
          cab_description: vehicle.description,
          vehicle_description: vehicle.description,
          base_price: vehicle.basePrice,
          price_per_km: vehicle.pricePerKm,
          passenger_capacity: vehicle.capacity,
          luggage_capacity: vehicle.luggage,
          ac_available: vehicle.acAvailable,
          hr_8km_80_price: vehicle.hr8km80Price,
          hr_10km_100_price: vehicle.hr10km100Price,
          driver_allowance: vehicle.driverAllowance,
          night_halt_charge: vehicle.nightHaltCharge,
          airport_fee: vehicle.airportFee
        };
        
        return normalizedVehicle;
      });
      
      const result = await updateVehicleData(normalizedVehicles);
      
      if (result.success) {
        toast.success("Vehicle prices updated successfully!", {
          duration: 3000
        });
      } else {
        toast.error(result.message || "Failed to update vehicle prices. Please try again.", {
          duration: 5000
        });
      }
      
      return result;
    } catch (error) {
      console.error("Error updating vehicle pricing:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to update vehicle prices: ${errorMessage}`, {
        duration: 5000
      });
      
      return {
        success: false,
        message: `Error updating vehicle pricing: ${errorMessage}`,
        error
      };
    }
  },
  
  /**
   * Refresh and reload vehicle data
   */
  async refreshVehicles(): Promise<CabType[]> {
    try {
      toast.info("Refreshing vehicle data...", {
        id: "refresh-vehicles",
        duration: 2000
      });
      
      const vehicles = await this.getVehicles(true);
      
      if (vehicles.length > 0) {
        toast.success(`Successfully refreshed ${vehicles.length} vehicles`, {
          id: "refresh-vehicles",
          duration: 3000
        });
      } else {
        toast.error("No vehicles found during refresh", {
          id: "refresh-vehicles",
          duration: 3000
        });
      }
      
      return vehicles;
    } catch (error) {
      toast.error("Failed to refresh vehicles", {
        id: "refresh-vehicles",
        duration: 3000
      });
      
      return [];
    }
  }
};
