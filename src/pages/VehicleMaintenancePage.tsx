import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { MaintenanceRecord } from '@/types/maintenance';
import { FleetVehicle } from '@/types/cab';
import { maintenanceAPI } from '@/services/api/maintenanceAPI';
import { fleetAPI } from '@/services/api/fleetAPI';
import { Input } from "@/components/ui/input";
import { format, isBefore, addDays } from 'date-fns';
import { MaintenanceRecordForm } from '@/components/admin/maintenance/MaintenanceRecordForm';
import { MaintenanceRecordDetail } from '@/components/admin/maintenance/MaintenanceRecordDetail';
import { 
  Filter, 
  Search, 
  Plus,
  Calendar, 
  Wrench,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import AdminLayout from "@/components/admin/AdminLayout";

export default function VehicleMaintenancePage() {
  const [activeTab, setActiveTab] = useState<string>("maintenance");
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceRecord[]>([]);
  const [filteredData, setFilteredData] = useState<MaintenanceRecord[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [filterServiceType, setFilterServiceType] = useState<string>("all");
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<string | number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateRangeType, setDateRangeType] = useState<string>('all');
  const { toast } = useToast();
  
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [maintenanceData, searchTerm, filterVehicle, filterServiceType, dateRange, dateRangeType]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch vehicles from the same endpoint as FleetManagementPage
      const response = await fetch('/api/admin/fleet_vehicles.php/vehicles');
      const data = await response.json();
      const vehicles = data.vehicles || [];
      setVehicles(vehicles);

      // Fetch maintenance records
      const records = await maintenanceAPI.getMaintenanceRecords();
      const mappedRecords = records.map((r: any) => ({
        ...r,
        vehicleNumber: r.vehicleNumber || r.vehicle_number || '',
        serviceType: r.serviceType || r.service_type || '',
        serviceDate: r.serviceDate || r.service_date || '',
        nextServiceDate: r.nextServiceDate || r.next_service_date || '',
        odometer: r.odometer ?? r.odometer ?? null,
        nextServiceOdometer: r.nextServiceOdometer ?? r.next_service_odometer ?? null,
        make: r.make || r.vehicleMake || '',
        model: r.model || r.vehicleModel || '',
      }));
      setMaintenanceData(mappedRecords);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load maintenance data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...maintenanceData];
    
    // Apply text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.description.toLowerCase().includes(search) ||
        record.serviceType.toLowerCase().includes(search) ||
        record.vendor.toLowerCase().includes(search) ||
        getVehicleDisplayName(record.vehicleId, record).toLowerCase().includes(search)
      );
    }
    
    // Apply vehicle filter
    if (filterVehicle !== "all") {
      filtered = filtered.filter(record => record.vehicleId === filterVehicle);
    }
    
    // Apply service type filter
    if (filterServiceType !== "all") {
      filtered = filtered.filter(record => record.serviceType === filterServiceType);
    }
    
    // Apply built-in date range filter
    if (dateRangeType !== 'all' && dateRangeType !== 'custom') {
      const today = new Date();
      let startDate: Date;
      switch(dateRangeType) {
        case 'today':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(today);
          startDate.setDate(today.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        case 'lastMonth':
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          break;
        case 'quarter':
          startDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
          break;
        case 'year':
          startDate = new Date(today.getFullYear(), 0, 1);
          break;
        case 'lastYear':
          startDate = new Date(today.getFullYear() - 1, 0, 1);
          break;
        default:
          startDate = new Date(0);
      }
      filtered = filtered.filter(record => {
        const d = record.serviceDate || record.date;
        if (!d) return false;
        const recordDate = new Date(d);
        return recordDate >= startDate;
      });
    }
    // Apply custom date range filter
    if (dateRangeType === 'custom' && dateRange && dateRange.from && dateRange.to) {
      const from = new Date(dateRange.from).setHours(0,0,0,0);
      const to = new Date(dateRange.to).setHours(23,59,59,999);
      filtered = filtered.filter(record => {
        const d = record.serviceDate || record.date;
        if (!d) return false;
        const recordDate = new Date(d).getTime();
        return recordDate >= from && recordDate <= to;
      });
    }
    
    setFilteredData(filtered);
  };

  const handleAddMaintenanceRecord = () => {
    setSelectedRecord(null);
    setIsFormOpen(true);
  };

  const handleEditMaintenanceRecord = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handleViewMaintenanceRecord = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const handleSaveMaintenanceRecord = async (record: Partial<MaintenanceRecord>): Promise<void> => {
    try {
      if (selectedRecord?.id) {
        // Update existing record
        await maintenanceAPI.updateMaintenanceRecord(selectedRecord.id, record);
      } else {
        // Add new record
        await maintenanceAPI.addMaintenanceRecord(record);
      }
      
      // Refresh data
      fetchData();
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error saving maintenance record:", error);
      toast({
        title: "Error",
        description: "Failed to save maintenance record.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteMaintenanceRecord = async (id: string | number) => {
    try {
      const success = await maintenanceAPI.deleteMaintenanceRecord(id);
      if (success) {
        setIsDetailOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error deleting maintenance record:", error);
      toast({
        title: "Error",
        description: "Failed to delete maintenance record.",
        variant: "destructive",
      });
    } finally {
      setConfirmDeleteRecord(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterVehicle("all");
    setFilterServiceType("all");
    setDateRange(undefined);
    setDateRangeType('all');
    setIsFilterDialogOpen(false);
  };

  const getVehicleDisplayName = (vehicleId: string, record?: any): string => {
    if (record && (record.vehicleNumber || record.make || record.model)) {
      return `${record.vehicleNumber || ''} - ${record.make || ''} ${record.model || ''}`.trim();
    }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return vehicleId;
    return `${vehicle.vehicleNumber} - ${vehicle.make} ${vehicle.model}`;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Calculate total maintenance cost
  const totalMaintenanceCost = filteredData.reduce((sum, record) => sum + Number(record.cost), 0);
  
  // Get unique service types for filter
  const serviceTypes = Array.from(new Set(maintenanceData.map(record => record.serviceType)));
  
  // Calculate upcoming services (next 30 days)
  const currentDate = new Date();
  const upcomingServices = maintenanceData.filter(record => {
    if (!record.nextServiceDate) return false;
    const nextDate = new Date(record.nextServiceDate);
    return isBefore(currentDate, nextDate) && isBefore(nextDate, addDays(currentDate, 30));
  }).length;

  return (
    <AdminLayout activeTab="maintenance">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vehicle Maintenance</h1>
            <p className="text-gray-500">Track vehicle maintenance history and schedule</p>
          </div>
          <Button onClick={handleAddMaintenanceRecord}>
            <Plus className="mr-2 h-4 w-4" />
            Add Maintenance Record
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Maintenance Cost</p>
                <h3 className="text-2xl font-bold">₹{Number(totalMaintenanceCost).toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Maintenance Records</p>
                <h3 className="text-2xl font-bold">{maintenanceData.length}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Upcoming Services (30 days)</p>
                <h3 className="text-2xl font-bold">{upcomingServices}</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Maintenance Records</h3>
              <div className="flex gap-2">
                <div className="relative rounded-md w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search records..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsFilterDialogOpen(true)}>
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
            
            {/* Filter indicators */}
            {(filterVehicle !== "all" || filterServiceType !== "all") && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filterVehicle !== "all" && (
                  <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Vehicle: {getVehicleDisplayName(filterVehicle)}
                    <button onClick={() => setFilterVehicle("all")} className="ml-1 text-blue-800 hover:text-blue-900">
                      ×
                    </button>
                  </div>
                )}
                {filterServiceType !== "all" && (
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Service: {filterServiceType}
                    <button onClick={() => setFilterServiceType("all")} className="ml-1 text-green-800 hover:text-green-900">
                      ×
                    </button>
                  </div>
                )}
                <button 
                  onClick={resetFilters}
                  className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded hover:bg-gray-200"
                >
                  Clear all filters
                </button>
              </div>
            )}
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Service Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Cost (₹)</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Next Service</TableHead>
                      <TableHead>Odometer</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <p className="text-gray-500">No maintenance records found. Add a new record or adjust your filters.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{getVehicleDisplayName(record.vehicleId, record)}</TableCell>
                          <TableCell>{formatDate(record.serviceDate || record.date)}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Wrench className="h-4 w-4 mr-1 text-blue-600" />
                              {record.serviceType}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                          <TableCell className="text-right">₹{Number(record.cost).toFixed(2)}</TableCell>
                          <TableCell>{record.vendor}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-green-600" />
                              {record.nextServiceDate && record.nextServiceDate !== 'null' && record.nextServiceDate !== '' ? formatDate(record.nextServiceDate) : 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {record.odometer !== null && record.odometer !== undefined && record.odometer !== 0 ? record.odometer : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewMaintenanceRecord(record)}
                              >
                                Details
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditMaintenanceRecord(record)}
                              >
                                Edit
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Maintenance Record Form Dialog */}
        <MaintenanceRecordForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveMaintenanceRecord}
          editingRecord={selectedRecord}
          vehicles={vehicles}
        />
        
        {/* Maintenance Record Detail Dialog */}
        <MaintenanceRecordDetail
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          record={selectedRecord}
          onEdit={handleEditMaintenanceRecord}
          onDelete={(recordId) => setConfirmDeleteRecord(recordId)}
        />

        {/* Filter Dialog */}
        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Filter Maintenance Records</DialogTitle>
              <DialogDescription>
                Apply filters to narrow down the maintenance records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="filterVehicle">Vehicle</Label>
                <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="All vehicles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vehicles</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNumber} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="filterServiceType">Service Type</Label>
                <Select value={filterServiceType} onValueChange={setFilterServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All service types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All service types</SelectItem>
                    {serviceTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateRangeType">Date Range</Label>
                <Select value={dateRangeType} onValueChange={setDateRangeType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Daily (Today)</SelectItem>
                    <SelectItem value="week">Weekly (This Week)</SelectItem>
                    <SelectItem value="month">Monthly (This Month)</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="quarter">Quarterly</SelectItem>
                    <SelectItem value="year">Yearly (This Year)</SelectItem>
                    <SelectItem value="lastYear">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {dateRangeType === 'custom' && (
                <div>
                  <Label htmlFor="dateRange">Custom Date Range</Label>
                  <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="w-full"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <Button onClick={() => { setIsFilterDialogOpen(false); applyFilters(); }}>
                Apply Filters
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!confirmDeleteRecord} onOpenChange={(open) => !open && setConfirmDeleteRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Maintenance Record</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this maintenance record? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteRecord(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => confirmDeleteRecord && handleDeleteMaintenanceRecord(confirmDeleteRecord)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
