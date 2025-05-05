
import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { toast } from 'sonner';
import { FleetVehicle } from '@/types/cab';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';

// Mock data for demo purposes - will only be used as a last resort fallback
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
      
      // Try direct API call with the correct domain
      try {
        const apiUrl = getApiUrl('/api/admin/fleet-vehicles');
        console.log("Fetching vehicles from:", apiUrl);
        
        const response = await axios.get(apiUrl, {
          headers: {
            ...forceRefreshHeaders
          },
          params: { 
            include_all: includeAll ? 1 : 0 
          }
        });
        
        console.log("Fleet API response:", response.data);
        
        if (response.data && (Array.isArray(response.data.vehicles) || Array.isArray(response.data))) {
          const vehicles = Array.isArray(response.data.vehicles) ? response.data.vehicles : response.data;
          return { vehicles };
        }
      } catch (directError) {
        console.warn("Direct API call failed:", directError);
        
        // Try with explicit API_BASE_URL from config
        try {
          const apiUrl = `${API_BASE_URL}/api/admin/fleet-vehicles.php`;
          console.log("Trying alternative URL:", apiUrl);
          
          const response = await axios.get(apiUrl, {
            headers: {
              ...forceRefreshHeaders
            },
            params: { 
              include_all: includeAll ? 1 : 0 
            }
          });
          
          if (response.data && (Array.isArray(response.data.vehicles) || Array.isArray(response.data))) {
            const vehicles = Array.isArray(response.data.vehicles) ? response.data.vehicles : response.data;
            return { vehicles };
          }
        } catch (baseUrlError) {
          console.warn("API_BASE_URL call failed:", baseUrlError);
          throw new Error("Failed to fetch vehicles from API");
        }
      }
      
      // If both API calls fail, use mock data
      console.log("Using mock fleet data");
      return { vehicles: mockVehicles };
    } catch (error) {
      console.error("Error fetching fleet vehicles:", error);
      // If any error occurs, fall back to mock data
      return { vehicles: mockVehicles };
    }
  },
  
  /**
   * Get all drivers
   */
  getDrivers: async () => {
    try {
      // Try direct API call first with correct domain
      try {
        const apiUrl = getApiUrl('/api/admin/fleet-drivers');
        console.log("Fetching drivers from:", apiUrl);
        
        const response = await axios.get(apiUrl, {
          headers: {
            ...forceRefreshHeaders
          }
        });
        
        if (response.data && (Array.isArray(response.data.drivers) || Array.isArray(response.data))) {
          const drivers = Array.isArray(response.data.drivers) ? response.data.drivers : response.data;
          return drivers;
        }
      } catch (directError) {
        console.warn("Direct API call failed:", directError);
        
        // Try with explicit API_BASE_URL
        try {
          const apiUrl = `${API_BASE_URL}/api/admin/fleet-drivers.php`;
          console.log("Trying alternative URL:", apiUrl);
          
          const response = await axios.get(apiUrl, {
            headers: {
              ...forceRefreshHeaders
            }
          });
          
          if (response.data && (Array.isArray(response.data.drivers) || Array.isArray(response.data))) {
            const drivers = Array.isArray(response.data.drivers) ? response.data.drivers : response.data;
            return drivers;
          }
        } catch (baseUrlError) {
          console.warn("API_BASE_URL call failed:", baseUrlError);
          throw new Error("Failed to fetch drivers from API");
        }
      }
      
      // If both API calls fail, use mock data
      console.log("Using mock driver data");
      return mockDrivers;
    } catch (error) {
      console.error("Error fetching drivers:", error);
      // If any error occurs, fall back to mock data
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
      
      // Try direct API call first with correct domain
      try {
        const apiUrl = getApiUrl('/api/admin/booking-assign-vehicle');
        console.log("Posting to:", apiUrl);
        
        const response = await axios.post(apiUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            ...forceRefreshHeaders
          }
        });
        
        console.log("Vehicle assignment response:", response.data);
        
        if (response.data && response.data.status === 'success') {
          return true;
        }
      } catch (directError) {
        console.warn("Direct API call failed:", directError);
        
        // Try with explicit API_BASE_URL
        try {
          const apiUrl = `${API_BASE_URL}/api/admin/booking-assign-vehicle.php`;
          console.log("Trying alternative URL:", apiUrl);
          
          const response = await axios.post(apiUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              ...forceRefreshHeaders
            }
          });
          
          console.log("Vehicle assignment response with base URL:", response.data);
          
          if (response.data && response.data.status === 'success') {
            return true;
          }
        } catch (baseUrlError) {
          console.warn("Base URL API call failed:", baseUrlError);
          // Continue to fallback
        }
      }
      
      // If API calls failed but didn't throw, try one more approach
      try {
        const apiUrl = `${API_BASE_URL}/api/update-booking.php`;
        console.log("Trying booking update endpoint:", apiUrl);
        
        const response = await axios.post(apiUrl, {
          booking_id: bookingId,
          vehicleNumber: vehicleId,
          status: "confirmed"
        }, {
          headers: {
            'Content-Type': 'application/json',
            ...forceRefreshHeaders
          }
        });
        
        if (response.status === 200) {
          return true;
        }
      } catch (updateError) {
        console.warn("Update booking API call failed:", updateError);
      }
      
      // If all API calls fail but we want to allow the user to continue
      toast.warning("API connection issue - changes may not be saved to the server");
      return true;
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
      
      // Try direct API call first with correct domain
      try {
        const apiUrl = getApiUrl('/api/admin/fleet-vehicles-create');
        console.log("Posting to:", apiUrl);
        
        const response = await axios.post(apiUrl, vehicleData, {
          headers: {
            'Content-Type': 'application/json',
            ...forceRefreshHeaders
          }
        });
        
        console.log("Add vehicle response:", response.data);
        
        if (response.data && response.data.status === 'success') {
          return response.data.vehicle || vehicleData;
        }
      } catch (directError) {
        console.warn("Direct API call failed:", directError);
        
        // Try with API_BASE_URL
        try {
          const apiUrl = `${API_BASE_URL}/api/admin/fleet-vehicles-create.php`;
          console.log("Trying alternative URL:", apiUrl);
          
          const response = await axios.post(apiUrl, vehicleData, {
            headers: {
              'Content-Type': 'application/json',
              ...forceRefreshHeaders
            }
          });
          
          console.log("Add vehicle response with base URL:", response.data);
          
          if (response.data && response.data.status === 'success') {
            return response.data.vehicle || vehicleData;
          }
        } catch (baseUrlError) {
          console.warn("API_BASE_URL call failed:", baseUrlError);
          throw new Error("Failed to add vehicle to fleet");
        }
      }
      
      // If API calls succeed but don't return proper data, return the input data
      return vehicleData;
    } catch (error) {
      console.error("Error adding vehicle to fleet:", error);
      // Show an error toast but return the input data as fallback
      toast.error("Error adding vehicle to fleet. Please check logs.");
      return vehicleData;
    }
  }
};
