import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, Car, CheckCircle, Circle, Plus, RefreshCw, Trash2, Edit } from 'lucide-react';
import { cn } from "@/lib/utils"
import { DateRange } from "react-day-picker"
import { addDays, parseISO } from "date-fns";
import { DateRangePicker } from "@/components/date-range-picker"
import { maintenanceAPI } from '@/services/api/maintenanceAPI';
import { MaintenanceRecord, ServiceType } from '@/types/maintenance';
import { toast } from 'sonner';
import { MaintenanceForm } from '@/components/maintenance/MaintenanceForm';
import { DeleteMaintenanceRecordDialog } from '@/components/maintenance/DeleteMaintenanceRecordDialog';
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { getApiUrl } from '@/config/api';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminPageExplanation } from '@/components/admin/AdminPageExplanation';

const defaultMaintenanceRecord: MaintenanceRecord = {
  id: '',
  vehicleId: '',
  date: '',
  serviceType: 'Oil Change',
  description: '',
  cost: 0,
  vendor: '',
  nextServiceDate: '',
  notes: '',
  odometer: 0,
  nextServiceOdometer: 0,
  vehicleNumber: '',
  vehicleMake: '',
  vehicleModel: '',
  make: '',
  model: ''
};

export function VehicleMaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord>(defaultMaintenanceRecord);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<MaintenanceRecord>(defaultMaintenanceRecord);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();

  const fetchMaintenanceRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await maintenanceAPI.getMaintenanceRecords();
      setRecords(data);
    } catch (error: any) {
      console.error('Error fetching maintenance records:', error);
      setError(error.message || 'Failed to load maintenance records');
      toast.error('Failed to load maintenance records');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [fetchMaintenanceRecords]);

  useEffect(() => {
    applyFilters(records, searchTerm, serviceTypeFilter, dateRange);
  }, [searchTerm, serviceTypeFilter, dateRange, records]);

  const applyFilters = (
    recordsArray: MaintenanceRecord[],
    search: string,
    serviceType: string,
    dateRange: DateRange | undefined
  ) => {
    let filtered = [...recordsArray];

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(record =>
        record.vehicleId.toLowerCase().includes(term) ||
        record.description.toLowerCase().includes(term) ||
        record.vendor.toLowerCase().includes(term) ||
        (record.vehicleNumber && record.vehicleNumber.toLowerCase().includes(term)) ||
        (record.vehicleMake && record.vehicleMake.toLowerCase().includes(term)) ||
        (record.vehicleModel && record.vehicleModel.toLowerCase().includes(term))
      );
    }

    if (serviceType !== 'all') {
      filtered = filtered.filter(record => record.serviceType === serviceType);
    }

    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.date);
        const fromDate = dateRange.from as Date;
        const toDate = dateRange.to as Date;
        return recordDate >= fromDate && recordDate <= addDays(toDate, 1);
      });
    }

    setFilteredRecords(filtered);
  };

  const handleAddRecord = () => {
    setIsAdding(true);
  };

  const handleEditRecord = (record: MaintenanceRecord) => {
    setEditingRecord(record);
    setIsEditing(true);
  };

  const handleDeleteRecord = (record: MaintenanceRecord) => {
    setDeletingRecord(record);
    setIsDeleting(true);
  };

  const handleCloseForm = () => {
    setIsAdding(false);
    setIsEditing(false);
    setEditingRecord(defaultMaintenanceRecord);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleting(false);
    setDeletingRecord(defaultMaintenanceRecord);
  };

  const handleCreate = async (record: MaintenanceRecord) => {
    setIsSubmitting(true);
    try {
      const newRecord = await maintenanceAPI.addMaintenanceRecord(record);
      setRecords(prev => [...prev, newRecord]);
      toast.success('Maintenance record added successfully');
    } catch (error: any) {
      console.error('Error adding maintenance record:', error);
      toast.error('Failed to add maintenance record');
    } finally {
      setIsAdding(false);
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string | number, record: MaintenanceRecord) => {
    setIsSubmitting(true);
    try {
      const updatedRecord = await maintenanceAPI.updateMaintenanceRecord(id, record);
      setRecords(prev => prev.map(r => r.id === id ? updatedRecord : r));
      toast.success('Maintenance record updated successfully');
    } catch (error: any) {
      console.error('Error updating maintenance record:', error);
      toast.error('Failed to update maintenance record');
    } finally {
      setIsEditing(false);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      if (deletingRecord.id) {
        await maintenanceAPI.deleteMaintenanceRecord(deletingRecord.id);
        setRecords(prev => prev.filter(r => r.id !== deletingRecord.id));
        toast.success('Maintenance record deleted successfully');
      } else {
        toast.error('Record ID is missing');
      }
    } catch (error: any) {
      console.error('Error deleting maintenance record:', error);
      toast.error('Failed to delete maintenance record');
    } finally {
      setIsDeleting(false);
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchMaintenanceRecords();
      toast.success('Maintenance records refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing maintenance records:', error);
      toast.error('Failed to refresh maintenance records');
    } finally {
      setIsRefreshing(false);
    }
  };

  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isUpcoming = (record: MaintenanceRecord) => record.nextServiceDate && new Date(record.nextServiceDate) > new Date();

  if (isLoading) {
    return (
      <AdminLayout activeTab="maintenance">
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout activeTab="maintenance">
        <ApiErrorFallback
          error={error}
          onRetry={fetchMaintenanceRecords}
          title="Unable to Load Maintenance Records"
        />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeTab="maintenance">
      <div className="container mx-auto py-10">
        <MaintenanceForm
          isOpen={isAdding}
          onClose={handleCloseForm}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />

        <MaintenanceForm
          isOpen={isEditing}
          onClose={handleCloseForm}
          onSubmit={(record) => handleUpdate(editingRecord.id, record)}
          initialData={editingRecord}
          isSubmitting={isSubmitting}
        />

        <DeleteMaintenanceRecordDialog
          isOpen={isDeleting}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleDelete}
          record={deletingRecord}
          isSubmitting={isSubmitting}
        />

        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div className="flex items-center space-y-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Vehicle Maintenance</h2>
              <p className="text-gray-500">Manage and track maintenance records for your vehicles.</p>
            </div>
            <AdminPageExplanation 
              title="About Vehicle Maintenance"
              description="Track all maintenance activities performed on your fleet vehicles."
            >
              <div className="pt-2">
                <h5 className="font-medium text-xs">Features:</h5>
                <ul className="text-xs list-disc pl-4 text-gray-500 space-y-1 pt-1">
                  <li>Add new maintenance records</li>
                  <li>Schedule upcoming maintenance</li>
                  <li>Filter by service type or date range</li>
                  <li>Track maintenance costs</li>
                </ul>
              </div>
            </AdminPageExplanation>
          </div>
          <Button onClick={handleAddRecord}><Plus className="mr-2 h-4 w-4" /> Add Record</Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="search">Search:</Label>
            <Input
              id="search"
              placeholder="Vehicle ID, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Label htmlFor="serviceType">Service Type:</Label>
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger id="serviceType">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Oil Change">Oil Change</SelectItem>
                <SelectItem value="Tire Replacement">Tire Replacement</SelectItem>
                <SelectItem value="Battery Replacement">Battery Replacement</SelectItem>
                <SelectItem value="Brake Service">Brake Service</SelectItem>
                <SelectItem value="Air Filter Replacement">Air Filter Replacement</SelectItem>
                <SelectItem value="Major Service">Major Service</SelectItem>
                <SelectItem value="AC Service">AC Service</SelectItem>
                <SelectItem value="Transmission Service">Transmission Service</SelectItem>
                <SelectItem value="Engine Repair">Engine Repair</SelectItem>
                <SelectItem value="Electrical Repair">Electrical Repair</SelectItem>
                <SelectItem value="Suspension Repair">Suspension Repair</SelectItem>
                <SelectItem value="Regular Maintenance">Regular Maintenance</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange?.from || !dateRange?.to ? "text-muted-foreground" : undefined
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from && dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                      {format(dateRange.to, "MMM dd, yyyy")}
                    </>
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <DateRangePicker date={dateRange} onSelect={setDateRange} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Vehicle</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Next Service Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.vehicleId}
                    {record.vehicleNumber && (
                      <div className="text-xs text-gray-500">
                        {record.vehicleMake} {record.vehicleModel} ({record.vehicleNumber})
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{record.serviceType}</TableCell>
                  <TableCell>{record.description}</TableCell>
                  <TableCell>{format(new Date(record.date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{record.odometer ? Number(record.odometer).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>₹{record.cost.toLocaleString()}</TableCell>
                  <TableCell>{record.vendor}</TableCell>
                  <TableCell>
                    {record.nextServiceDate ? (
                      <>
                        {format(new Date(record.nextServiceDate), 'MMM dd, yyyy')}
                        {isUpcoming(record) ? (
                          <CheckCircle className="ml-1 inline-block h-4 w-4 text-green-500" aria-label="Upcoming" />
                        ) : (
                          <Circle className="ml-1 inline-block h-4 w-4 text-amber-500" aria-label="Overdue" />
                        )}
                      </>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteRecord(record)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRecords.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center">
                    No maintenance records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={isLoading}
          className="mt-4"
        >
          {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? 'Refreshing...' : 'Refresh Records'}
        </Button>
      </div>
    </AdminLayout>
  );
}

export default VehicleMaintenancePage;
