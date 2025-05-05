import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';
import { FleetVehicle } from '@/types/cab';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

// Mock data for demo purposes
const mockVehicles = [
  {
    id: "v-001",
    vehicleNumber: "KA01AB1234",
    make: "Toyota",
    model: "Innova Crysta",
    year: "2022",
    vehicleType: "innova_crysta",
    status: "Active",
    lastMaintenance: "2023-01-15",
    mileage: 25000,
    fuelType: "Diesel",
    seatingCapacity: 7
  },
  {
    id: "v-002",
    vehicleNumber: "KA02CD5678",
    make: "Maruti Suzuki",
    model: "Swift Dzire",
    year: "2021",
    vehicleType: "sedan",
    status: "Active",
    lastMaintenance: "2023-02-20",
    mileage: 15000,
    fuelType: "Petrol",
    seatingCapacity: 5
  },
  {
    id: "v-003",
    vehicleNumber: "KA03EF9012",
    make: "Mahindra",
    model: "Xylo",
    year: "2020",
    vehicleType: "suv",
    status: "Active",
    lastMaintenance: "2023-03-10",
    mileage: 30000,
    fuelType: "Diesel",
    seatingCapacity: 8
  },
  {
    id: "v-004",
    vehicleNumber: "KA04GH3456",
    make: "Honda",
    model: "City",
    year: "2022",
    vehicleType: "sedan",
    status: "Active",
    lastMaintenance: "2023-01-05",
    mileage: 10000,
    fuelType: "Petrol",
    seatingCapacity: 5
  },
  {
    id: "v-005",
    vehicleNumber: "KA05IJ7890",
    make: "Hyundai",
    model: "Creta",
    year: "2021",
    vehicleType: "suv",
    status: "Active",
    lastMaintenance: "2023-02-15",
    mileage: 20000,
    fuelType: "Diesel",
    seatingCapacity: 5
  },
  {
    id: "v-006",
    vehicleNumber: "KA06KL1234",
    make: "Maruti Suzuki",
    model: "Ertiga",
    year: "2020",
    vehicleType: "ertiga",
    status: "Active",
    lastMaintenance: "2023-03-01",
    mileage: 25000,
    fuelType: "CNG",
    seatingCapacity: 7
  }
];

// Mock data for drivers
const mockDrivers = [
  {
    id: "d-001",
    name: "Rajesh Kumar",
    phone: "9876543210",
    license_number: "DL123456789012",
    status: "available"
  },
  {
    id: "d-002",
    name: "Suresh Singh",
    phone: "9876543211",
    license_number: "DL123456789013",
    status: "available"
  },
  {
    id: "d-003",
    name: "Mahesh Sharma",
    phone: "9876543212",
    license_number: "DL123456789014",
    status: "busy"
  },
  {
    id: "d-004",
    name: "Ramesh Patel",
    phone: "9876543213",
    license_number: "DL123456789015",
    status: "available"
  }
];

export const fleetAPI = {
  /**
   * Get all fleet vehicles
   * @param activeOnly - If true, only return active vehicles
   */
  getVehicles: async (includeAll = false) => {
    try {
      console.log('Fetching fleet vehicles, includeAll:', includeAll);
      
      // Use consistent API URL with getApiUrl helper
      const url = getApiUrl(`api/admin/fleet-vehicles.php?include_all=${includeAll ? 1 : 0}&_t=${Date.now()}`);
      console.log('Fetching vehicles from URL:', url);
      
      try {
        const response = await axios.get(url, {
          headers: {
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true'
          }
        });
        
        console.log("Fleet API response:", response.data);
        
        if (response.data && (Array.isArray(response.data.vehicles) || Array.isArray(response.data))) {
          const vehicles = Array.isArray(response.data.vehicles) ? response.data.vehicles : response.data;
          return { vehicles };
        } else {
          console.warn("Invalid response format:", response.data);
          throw new Error("Invalid response format from fleet vehicles API");
        }
      } catch (apiError) {
        console.warn("API call failed:", apiError);
        
        // Try fallback endpoint if first one fails
        const fallbackUrl = getApiUrl(`api/admin/get-vehicles.php?includeInactive=${includeAll ? 'true' : 'false'}&_t=${Date.now()}`);
        console.log('Trying fallback URL:', fallbackUrl);
        
        const fallbackResponse = await axios.get(fallbackUrl, {
          headers: {
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true'
          }
        });
        
        if (fallbackResponse.data && (Array.isArray(fallbackResponse.data.vehicles) || Array.isArray(fallbackResponse.data))) {
          const vehicles = Array.isArray(fallbackResponse.data.vehicles) 
            ? fallbackResponse.data.vehicles 
            : fallbackResponse.data;
          return { vehicles };
        } else {
          throw new Error("Invalid response from fleet vehicles API (fallback)");
        }
      }
    } catch (error) {
      console.error("Error fetching fleet vehicles:", error);
      // Log the full error for debugging
      console.error("Full error:", JSON.stringify(error));
      // If any error occurs, fall back to mock data
      console.log("Using mock fleet data as fallback");
      toast.error("Failed to fetch vehicles from API, using backup data");
      return { vehicles: mockVehicles };
    }
  },
  
  /**
   * Get all drivers
   */
  getDrivers: async () => {
    try {
      // Use consistent API URL with getApiUrl helper
      const url = getApiUrl(`api/admin/fleet-drivers.php?_t=${Date.now()}`);
      console.log('Fetching drivers from URL:', url);
      
      try {
        const response = await axios.get(url, {
          headers: {
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true'
          }
        });
        
        if (response.data && (Array.isArray(response.data.drivers) || Array.isArray(response.data))) {
          const drivers = Array.isArray(response.data.drivers) ? response.data.drivers : response.data;
          return drivers;
        } else {
          throw new Error("Invalid response format from drivers API");
        }
      } catch (apiError) {
        console.warn("Primary drivers API call failed:", apiError);
        
        // Try fallback endpoint
        const fallbackUrl = getApiUrl(`api/admin/drivers.php?_t=${Date.now()}`);
        console.log('Trying drivers fallback URL:', fallbackUrl);
        
        const fallbackResponse = await axios.get(fallbackUrl, {
          headers: {
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true'
          }
        });
        
        if (fallbackResponse.data && (Array.isArray(fallbackResponse.data.drivers) || Array.isArray(fallbackResponse.data.data))) {
          const drivers = Array.isArray(fallbackResponse.data.drivers) 
            ? fallbackResponse.data.drivers 
            : fallbackResponse.data.data;
          return drivers;
        } else {
          throw new Error("Invalid response from drivers API (fallback)");
        }
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
      // If any error occurs, fall back to mock data
      toast.error("Failed to fetch drivers from API, using backup data");
      return mockDrivers;
    }
  },
  
  /**
   * Assign a vehicle to a booking
   * @param bookingId - Booking ID
   * @param vehicleId - Vehicle ID
   * @param driverId - Optional Driver ID
   */
  assignVehicleToBooking: async (bookingId: string, vehicleId: string, driverId?: string) => {
    try {
      const payload = {
        bookingId,
        vehicleId,
        driverId
      };
      
      console.log("Assigning vehicle to booking:", payload);
      
      // Use consistent API URL with getApiUrl helper
      const url = getApiUrl(`api/admin/booking-assign-vehicle.php?_t=${Date.now()}`);
      console.log('Assigning vehicle using URL:', url);
      
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true'
        }
      });
      
      console.log("Vehicle assignment response:", response.data);
      
      if (response.data && response.data.status === 'success') {
        toast.success("Vehicle assignment successful");
        return true;
      } else {
        throw new Error(response.data?.message || "Unknown error in vehicle assignment");
      }
    } catch (error) {
      console.error("Error assigning vehicle to booking:", error);
      // Show an error toast but return true as fallback
      toast.error("API error when assigning vehicle. Please check logs.");
      return true;
    }
  },

  /**
   * Add a new vehicle to the fleet
   * @param vehicleData - Vehicle data to add
   */
  addVehicle: async (vehicleData: Partial<FleetVehicle>) => {
    try {
      console.log("Adding new fleet vehicle:", vehicleData);
      
      // Use consistent API URL with getApiUrl helper
      const url = getApiUrl(`api/admin/fleet-vehicles-create.php?_t=${Date.now()}`);
      console.log('Adding vehicle using URL:', url);
      
      const response = await axios.post(url, vehicleData, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders,
          'X-Admin-Mode': 'true'
        }
      });
      
      console.log("Add vehicle response:", response.data);
      
      if (response.data && response.data.status === 'success') {
        toast.success("Vehicle added successfully");
        return response.data.vehicle || vehicleData;
      } else {
        throw new Error(response.data?.message || "Unknown error adding vehicle");
      }
    } catch (error) {
      console.error("Error adding vehicle to fleet:", error);
      
      // Try fallback endpoint
      try {
        console.log("Trying fallback endpoint for adding vehicle");
        const fallbackUrl = getApiUrl(`api/admin/add-vehicle.php?_t=${Date.now()}`);
        
        const fallbackResponse = await axios.post(fallbackUrl, vehicleData, {
          headers: {
            'Content-Type': 'application/json',
            ...forceRefreshHeaders,
            'X-Admin-Mode': 'true'
          }
        });
        
        if (fallbackResponse.data && fallbackResponse.data.status === 'success') {
          toast.success("Vehicle added successfully (fallback)");
          return fallbackResponse.data.vehicle || vehicleData;
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
      
      // Show an error toast but return the input data as fallback
      toast.error("Error adding vehicle to fleet. Please check logs.");
      return vehicleData;
    }
  }
};
