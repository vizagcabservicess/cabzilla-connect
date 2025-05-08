
import axios from 'axios';
import { toast } from 'sonner';
import { getApiUrl, forceRefreshHeaders } from '@/config/api';
import { MaintenanceRecord } from '@/types/maintenance';

// Sample maintenance data as fallback
const sampleMaintenanceData: MaintenanceRecord[] = [
  { 
    id: 1, 
    vehicleId: 'VEH-001', 
    date: '2025-04-15', 
    serviceType: 'Oil Change', 
    description: 'Regular oil change and filter replacement', 
    cost: 3500, 
    vendor: 'AutoService Center', 
    nextServiceDate: '2025-07-15',
    vehicleNumber: 'KA01AB1234',
    vehicleMake: 'Toyota',
    vehicleModel: 'Innova'
  },
  { 
    id: 2, 
    vehicleId: 'VEH-002', 
    date: '2025-04-10', 
    serviceType: 'Tire Replacement', 
    description: 'Replaced all four tires', 
    cost: 24000, 
    vendor: 'Tire World', 
    nextServiceDate: '2026-04-10',
    vehicleNumber: 'KA02CD5678',
    vehicleMake: 'Maruti',
    vehicleModel: 'Swift'
  }
];

export const maintenanceAPI = {
  /**
   * Get all maintenance records
   */
  getMaintenanceRecords: async (): Promise<MaintenanceRecord[]> => {
    try {
      const apiUrl = getApiUrl('/api/maintenance_records.php');
      console.log('Fetching maintenance records from:', apiUrl);
      
      const response = await axios.get(apiUrl, {
        headers: {
          ...forceRefreshHeaders
        },
        params: {
          _t: Date.now() // Prevent caching
        }
      });
      
      console.log('Maintenance records response:', response.data);
      
      // Check if response has records
      if (response.data.status === 'success' && response.data.data?.records) {
        return response.data.data.records;
      }
      
      if (response.data.records) {
        return response.data.records;
      }
      
      console.warn('Unexpected API response format, using sample data');
      return sampleMaintenanceData;
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to load maintenance records');
      return sampleMaintenanceData;
    }
  },
  
  /**
   * Add a new maintenance record
   */
  addMaintenanceRecord: async (record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> => {
    try {
      const apiUrl = getApiUrl('/api/maintenance_records.php');
      console.log('Adding maintenance record:', record);

      // Patch: Send both camelCase (for frontend) and snake_case (for backend)
      const payload = {
        ...record,
        vehicle_id: record.vehicleId || '',
        service_type: record.serviceType || '',
        service_date: record.date || record.serviceDate || '',
        next_service_date: record.nextServiceDate || '',
        odometer: record.odometer ?? 0,
        next_service_odometer: record.nextServiceOdometer ?? 0,
      };

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });

      if (response.data.status === 'success') {
        toast.success('Maintenance record added successfully');
        return { ...record, id: response.data.id } as MaintenanceRecord;
      }

      toast.error('Failed to add maintenance record');
      throw new Error('API returned error status');
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      toast.error('Failed to add maintenance record');
      throw error;
    }
  },
  
  /**
   * Update an existing maintenance record
   */
  updateMaintenanceRecord: async (id: number | string, record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> => {
    try {
      const apiUrl = getApiUrl(`/api/maintenance_records.php?id=${id}`);
      console.log('Updating maintenance record:', id, record);

      // Patch: Send both camelCase (for frontend) and snake_case (for backend)
      const payload = {
        ...record,
        vehicle_id: record.vehicleId || '',
        service_type: record.serviceType || '',
        service_date: record.date || record.serviceDate || '',
        next_service_date: record.nextServiceDate || '',
        odometer: record.odometer ?? 0,
        next_service_odometer: record.nextServiceOdometer ?? 0,
      };

      const response = await axios.put(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });

      if (response.data.status === 'success') {
        toast.success('Maintenance record updated successfully');
        return { ...record, id } as MaintenanceRecord;
      }

      toast.error('Failed to update maintenance record');
      throw new Error('API returned error status');
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      toast.error('Failed to update maintenance record');
      throw error;
    }
  },
  
  /**
   * Delete a maintenance record
   */
  deleteMaintenanceRecord: async (id: number | string): Promise<boolean> => {
    try {
      const apiUrl = getApiUrl(`/api/maintenance_records.php?id=${id}`);
      console.log('Deleting maintenance record:', id);
      
      const response = await axios.delete(apiUrl, {
        headers: {
          ...forceRefreshHeaders
        }
      });
      
      if (response.data.status === 'success') {
        toast.success('Maintenance record deleted successfully');
        return true;
      }
      
      toast.error('Failed to delete maintenance record');
      return false;
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
      toast.error('Failed to delete maintenance record');
      return false;
    }
  }
};
