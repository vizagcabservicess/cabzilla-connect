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

// Test API connection to check if the server is responding
const testApiConnection = async () => {
  try {
    console.log('Testing API connection...');
    const testEndpoints = [
      '/api/health-check',
      '/api/admin/ping',
      '/api/admin/direct-vehicle-modify.php?action=ping'
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const url = getApiUrl(endpoint);
        console.log(`Testing endpoint: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            ...forceRefreshHeaders
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          console.log(`Connection successful to ${endpoint}`);
          return true;
        }
      } catch (err) {
        console.log(`Failed to connect to ${endpoint}`);
      }
    }
    
    console.warn('All test endpoints failed');
    return false;
  } catch (error) {
    console.error('Error testing API connection:', error);
    return false;
  }
};

export const fleetAPI = {
  /**
   * Get all fleet vehicles
   * @param activeOnly - If true, only return active vehicles
   */
  getVehicles: async (includeAll = false) => {
    try {
      console.log('Fetching fleet vehicles, includeAll:', includeAll);
      
      // First test API connection
      const isApiConnected = await testApiConnection();
      console.log('API connection test result:', isApiConnected);
      
      // Define working endpoints in order of preference - focus on direct-vehicle-modify.php which works
      const endpoints = [
        '/api/admin/direct-vehicle-modify.php?action=load',
        '/api/admin/vehicles-data',
        '/api/fares/vehicles'
      ];
      
      // Try each endpoint until we get a valid response
      for (const endpoint of endpoints) {
        try {
          const apiUrl = getApiUrl(endpoint);
          console.log("Fetching fleet vehicles from:", apiUrl);
          
          const response = await axios.get(apiUrl, {
            headers: {
              ...forceRefreshHeaders
            },
            params: { 
              include_all: includeAll ? 1 : 0,
              includeInactive: includeAll ? 'true' : 'false',
              _t: Date.now() // Prevent caching
            }
          });
          
          console.log("Fleet API response from " + endpoint + ":", response.data);
          
          if (response.data) {
            // Different endpoints may return data in different formats
            let vehicles = [];
            
            if (Array.isArray(response.data)) {
              vehicles = response.data;
            } else if (Array.isArray(response.data.vehicles)) {
              vehicles = response.data.vehicles;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              vehicles = response.data.data;
            } else if (typeof response.data === 'object' && Object.keys(response.data).length > 0) {
              // Try to extract vehicle data from any valid object
              const firstKey = Object.keys(response.data)[0];
              if (Array.isArray(response.data[firstKey])) {
                vehicles = response.data[firstKey];
              }
            }
            
            if (vehicles.length > 0) {
              const mappedVehicles = vehicles.map((v: any) => ({
                ...v,
                vehicleNumber: v.vehicleNumber || v.vehicle_number || '',
                make: v.make || v.Make || '',
                model: v.model || v.Model || '',
              }));
              console.log(`Successfully fetched ${mappedVehicles.length} fleet vehicles from ${endpoint}`);
              return { vehicles: mappedVehicles };
            }
          }
        } catch (endpointError) {
          console.warn(`Failed to fetch from ${endpoint}:`, endpointError);
          // Continue to next endpoint
        }
      }
      
      // Try with explicit API_BASE_URL as a fallback
      try {
        const apiUrl = `${API_BASE_URL}/api/admin/direct-vehicle-modify.php`;
        console.log("Trying final fallback URL:", apiUrl);
        
        const response = await axios.get(apiUrl, {
          headers: {
            ...forceRefreshHeaders
          },
          params: { 
            action: 'load',
            include_all: includeAll ? 1 : 0,
            _t: Date.now() // Prevent caching
          }
        });
        
        if (response.data && (Array.isArray(response.data) || 
            Array.isArray(response.data.vehicles) || 
            (response.data.data && Array.isArray(response.data.data)))) {
          
          const vehicles = Array.isArray(response.data) ? response.data : 
                          Array.isArray(response.data.vehicles) ? response.data.vehicles :
                          response.data.data;
                          
          const mappedVehicles = vehicles.map((v: any) => ({
            ...v,
            vehicleNumber: v.vehicleNumber || v.vehicle_number || '',
            make: v.make || v.Make || '',
            model: v.model || v.Model || '',
          }));
          
          console.log("Successfully fetched fleet vehicles from fallback URL");
          return { vehicles: mappedVehicles };
        }
      } catch (fallbackError) {
        console.warn("Fallback API call failed:", fallbackError);
      }
      
      // If all API calls fail, show a warning and use mock data
      console.log("All API endpoints failed. Using mock fleet data as last resort");
      toast.warning("Could not connect to vehicle database. Using demo data.");
      return { vehicles: mockVehicles };
    } catch (error) {
      console.error("Error fetching fleet vehicles:", error);
      toast.error("Failed to fetch vehicle data");
      // If any error occurs, fall back to mock data
      return { vehicles: mockVehicles };
    }
  },
  
  /**
   * Get all drivers
   */
  getDrivers: async () => {
    try {
      // Fetch from the correct driver API endpoint
      const apiUrl = getApiUrl('/api/admin/driver.php');
      console.log("Fetching drivers from:", apiUrl);
      const response = await axios.get(apiUrl, {
        headers: {
          ...forceRefreshHeaders
        }
      });
      if (response.data) {
        if (response.data.status === 'success' && Array.isArray(response.data.data)) {
          return response.data.data;
        } else if (Array.isArray(response.data)) {
          return response.data;
        }
      }
      // If API call fails or returns unexpected data, use mock data
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
      
      console.log("Assigning fleet vehicle to booking:", payload);
      
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
        
        console.log("Fleet vehicle assignment response:", response.data);
        
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
          
          console.log("Fleet vehicle assignment response with base URL:", response.data);
          
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
      console.error("Error assigning fleet vehicle to booking:", error);
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
