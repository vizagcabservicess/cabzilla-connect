
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

// Helper function to validate and sanitize date fields
const sanitizeRecord = (record: any): MaintenanceRecord => {
  try {
    // Validate and format date fields
    const validDate = (dateStr: string | undefined): string | undefined => {
      if (!dateStr) return undefined;
      
      // Check if date is in YYYY-MM-DD format
      const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
      
      if (!isValidFormat) {
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) {
            console.warn(`Invalid date: ${dateStr}`);
            return undefined;
          }
          return date.toISOString().split('T')[0];
        } catch (e) {
          console.warn(`Error parsing date: ${dateStr}`, e);
          return undefined;
        }
      }
      
      return dateStr;
    };
    
    return {
      ...record,
      date: validDate(record.date) || new Date().toISOString().split('T')[0],
      nextServiceDate: validDate(record.nextServiceDate),
      cost: typeof record.cost === 'number' ? record.cost : parseInt(record.cost) || 0,
      odometer: record.odometer ? parseInt(record.odometer) : undefined,
      nextServiceOdometer: record.nextServiceOdometer ? parseInt(record.nextServiceOdometer) : undefined,
    };
  } catch (error) {
    console.error('Error sanitizing record:', error);
    return record;
  }
};

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
      let records: MaintenanceRecord[] = [];
      
      if (response.data.status === 'success' && response.data.data?.records) {
        records = response.data.data.records;
      } else if (response.data.records) {
        records = response.data.records;
      } else {
        console.warn('Unexpected API response format, using sample data');
        return sampleMaintenanceData;
      }
      
      // Sanitize all records to ensure valid dates
      return records.map(sanitizeRecord);
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

      // Sanitize record before sending
      const sanitizedRecord = sanitizeRecord(record);

      // Convert to proper payload format
      const payload = {
        ...sanitizedRecord,
        vehicle_id: sanitizedRecord.vehicleId,
        service_type: sanitizedRecord.serviceType,
        service_date: sanitizedRecord.date,
        next_service_date: sanitizedRecord.nextServiceDate,
        next_service_odometer: sanitizedRecord.nextServiceOdometer
      };

      const response = await axios.post(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });

      if (response.data.status === 'success') {
        toast.success('Maintenance record added successfully');
        return { ...sanitizedRecord, id: response.data.id } as MaintenanceRecord;
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

      // Sanitize record before sending
      const sanitizedRecord = sanitizeRecord(record);

      // Convert to proper payload format
      const payload = {
        ...sanitizedRecord,
        vehicle_id: sanitizedRecord.vehicleId,
        service_type: sanitizedRecord.serviceType,
        service_date: sanitizedRecord.date,
        next_service_date: sanitizedRecord.nextServiceDate,
        next_service_odometer: sanitizedRecord.nextServiceOdometer
      };

      const response = await axios.put(apiUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          ...forceRefreshHeaders
        }
      });

      if (response.data.status === 'success') {
        toast.success('Maintenance record updated successfully');
        return { ...sanitizedRecord, id } as MaintenanceRecord;
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
