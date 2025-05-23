import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FuelRecord, FuelPrice, FleetVehicle } from '@/types/cab';
import { format, subDays } from 'date-fns';
import { FuelPriceManager } from '@/components/admin/fuel/FuelPriceManager';
import { FuelRecordForm } from '@/components/admin/fuel/FuelRecordForm';
import { 
  Fuel, 
  Trash, 
  Edit, 
  Filter, 
  Search, 
  CreditCard, 
  Banknote, 
  CircleDollarSign,
  Calendar,
  Gauge 
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import AdminLayout from "@/components/admin/AdminLayout";

export default function FuelManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("fuel");
  const [fuelData, setFuelData] = useState<FuelRecord[]>([]);
  const [filteredFuelData, setFilteredFuelData] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [filterFuelType, setFilterFuelType] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [dateRangeType, setDateRangeType] = useState<string>("all");
  
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [fuelData, searchTerm, filterVehicle, filterFuelType, filterPaymentMethod, filterDateRange]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch vehicles
      const vehiclesResponse = await fetch('/api/admin/fleet_vehicles.php/vehicles');
      if (!vehiclesResponse.ok) throw new Error('Failed to fetch vehicles');
      const vehiclesJson = await vehiclesResponse.json();
      if (vehiclesJson.vehicles) {
        setVehicles(vehiclesJson.vehicles);
      }
      
      // Fetch fuel records
      const fuelResponse = await fetch('/api/admin/fuel_records.php');
      if (!fuelResponse.ok) throw new Error('Failed to fetch fuel records');
      const fuelJson = await fuelResponse.json();
      if (fuelJson.status === 'success' && fuelJson.data?.fuelRecords) {
        setFuelData(fuelJson.data.fuelRecords);
      } else if (fuelJson.records) {
        setFuelData(fuelJson.records);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load data from the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...fuelData];

    // Apply text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(record => 
        record.fuelStation?.toLowerCase().includes(search) ||
        getVehicleDisplayName(record.vehicleId).toLowerCase().includes(search) ||
        record.fuelType.toLowerCase().includes(search) ||
        record.paymentMethod.toLowerCase().includes(search)
      );
    }

    // Apply vehicle filter
    if (filterVehicle !== "all") {
      filtered = filtered.filter(record => record.vehicleId === filterVehicle);
    }

    // Apply fuel type filter
    if (filterFuelType !== "all") {
      filtered = filtered.filter(record => record.fuelType === filterFuelType);
    }

    // Apply payment method filter
    if (filterPaymentMethod !== "all") {
      filtered = filtered.filter(record => record.paymentMethod === filterPaymentMethod);
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
          startDate = subDays(today, 7);
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
      filtered = filtered.filter(record => new Date(record.fillDate) >= startDate);
    }

    // Apply custom date range filter only if selected
    if (dateRangeType === 'custom' && dateRange && dateRange.from && dateRange.to) {
      const from = new Date(dateRange.from).setHours(0,0,0,0);
      const to = new Date(dateRange.to).setHours(23,59,59,999);
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.fillDate).getTime();
        return recordDate >= from && recordDate <= to;
      });
    }

    setFilteredFuelData(filtered);
  };

  const handleAddFuelRecord = () => {
    setEditingRecord(null);
    setIsFormOpen(true);
  };

  const handleEditFuelRecord = (record: FuelRecord) => {
    setEditingRecord(record);
    setIsFormOpen(true);
  };

  const handleSaveFuelRecord = async (record: Partial<FuelRecord>): Promise<void> => {
    try {
      if (!record.id) {
        // Add new record (POST)
        const response = await fetch('/api/admin/fuel_records.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Failed to add record');
        toast.success('Fuel record added successfully');
      } else {
        // Update existing record (PUT)
        const response = await fetch(`/api/admin/fuel_records.php?id=${record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        const data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Failed to update record');
        toast.success('Fuel record updated successfully');
      }
      // Refresh data from backend
      fetchData();
    } catch (error) {
      console.error("Error saving fuel record:", error);
      toast.error('Failed to save fuel record');
      throw error;
    }
  };

  const handleDeleteFuelRecord = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/fuel_records.php?id=${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.status !== 'success') throw new Error(data.message || 'Failed to delete record');
      toast.success('Fuel record deleted successfully');
      fetchData();
    } catch (error) {
      console.error("Error deleting fuel record:", error);
      toast.error('Failed to delete fuel record');
    } finally {
      setConfirmDeleteRecord(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterVehicle("all");
    setFilterFuelType("all");
    setFilterPaymentMethod("all");
    setFilterDateRange("all");
    setIsFilterDialogOpen(false);
  };

  const getVehicleDisplayName = (vehicleId: string): string => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return vehicleId;
    return `${vehicle.vehicleNumber} - ${vehicle.name} ${vehicle.model}`;
  };

  // Utility to calculate mileage for each record
  function calculateMileage(records: FuelRecord[]): FuelRecord[] {
    // Group records by vehicleId
    const grouped: { [vehicleId: string]: FuelRecord[] } = {};
    records.forEach(record => {
      if (!grouped[record.vehicleId]) grouped[record.vehicleId] = [];
      grouped[record.vehicleId].push(record);
    });
    // For each vehicle, sort by fillDate and calculate mileage
    Object.values(grouped).forEach(vehicleRecords => {
      vehicleRecords.sort((a, b) => new Date(a.fillDate).getTime() - new Date(b.fillDate).getTime());
      for (let i = 1; i < vehicleRecords.length; i++) {
        const prev = vehicleRecords[i - 1];
        const curr = vehicleRecords[i];
        const distance = curr.odometer - prev.odometer;
        const fuel = curr.quantity;
        curr.calculatedMileage = (fuel > 0 && distance > 0) ? distance / fuel : null;
      }
      // First record has no previous, so no mileage
      if (vehicleRecords.length > 0) vehicleRecords[0].calculatedMileage = null;
    });
    return records;
  }

  // Calculate totals for the filtered data
  const recordsWithMileage = calculateMileage(filteredFuelData);
  const totalFuelCost = recordsWithMileage.reduce((sum, record) => sum + record.totalCost, 0);
  const totalLiters = recordsWithMileage.reduce((sum, record) => sum + record.quantity, 0);
  const averageCostPerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;
  
  // Calculate average mileage from calculatedMileage
  const mileageRecords = recordsWithMileage.filter(r => r.calculatedMileage && r.calculatedMileage > 0);
  const averageMileage = mileageRecords.length > 0 
    ? mileageRecords.reduce((sum, r) => sum + r.calculatedMileage, 0) / mileageRecords.length
    : 0;

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Get payment method display with icon
  const getPaymentMethodDisplay = (method: string, details?: { bankName?: string, lastFourDigits?: string }) => {
    switch (method) {
      case 'Cash':
        return (
          <div className="flex items-center">
            <Banknote className="h-4 w-4 mr-1 text-green-600" />
            <span>Cash</span>
          </div>
        );
      case 'Card':
        return (
          <div className="flex items-center">
            <CreditCard className="h-4 w-4 mr-1 text-blue-600" />
            <span>
              {details?.bankName ? `${details.bankName}${details.lastFourDigits ? ` - ${details.lastFourDigits}` : ''}` : 'Card'}
            </span>
          </div>
        );
      case 'Company':
        return (
          <div className="flex items-center">
            <CircleDollarSign className="h-4 w-4 mr-1 text-purple-600" />
            <span>Company</span>
          </div>
        );
      case 'Customer':
        return (
          <div className="flex items-center">
            <CircleDollarSign className="h-4 w-4 mr-1 text-orange-600" />
            <span>Customer</span>
          </div>
        );
      default:
        return method;
    }
  };

  // Type-safe function to handle confirmation ID setting
  const handleConfirmDelete = (id: string | number) => {
    // Convert to string to ensure type compatibility with state
    setConfirmDeleteRecord(id.toString());
  };

  const handleApplyFilters = () => {
    if (dateRange && dateRange.from && dateRange.to && dateRangeType !== 'custom') {
      toast.warning('Please select "Custom Date Range" in the Date Range dropdown to apply your selected dates.');
      return;
    }
    setIsFilterDialogOpen(false);
    applyFilters();
  };

  return (
    <AdminLayout activeTab="fuel">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fuel Management</h1>
            <p className="text-gray-500">Track and manage fuel consumption, expenses, and prices</p>
          </div>
          <Button onClick={handleAddFuelRecord}>
            <Fuel className="mr-2 h-4 w-4" />
            Add Fuel Record
          </Button>
        </div>

        {/* Fuel Price Manager Component */}
        <div className="mb-6">
          <FuelPriceManager onPriceUpdate={fetchData} />
        </div>

        {/* Fuel Statistics */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Fuel Cost</p>
                <h3 className="text-2xl font-bold">₹{totalFuelCost.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Total Liters/Units</p>
                <h3 className="text-2xl font-bold">{totalLiters.toFixed(1)} L</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Average Price Per Liter</p>
                <h3 className="text-2xl font-bold">₹{averageCostPerLiter.toFixed(2)}</h3>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                <p className="text-sm text-gray-500">Average Mileage</p>
                <h3 className="text-2xl font-bold">{averageMileage.toFixed(1)} km/L</h3>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fuel Records */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Fuel Records</h3>
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
            {(filterVehicle !== "all" || filterFuelType !== "all" || filterPaymentMethod !== "all" || filterDateRange !== 'all') && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filterVehicle !== "all" && (
                  <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Vehicle: {getVehicleDisplayName(filterVehicle)}
                    <button onClick={() => setFilterVehicle("all")} className="ml-1 text-blue-800 hover:text-blue-900">
                      ×
                    </button>
                  </div>
                )}
                {filterFuelType !== "all" && (
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Fuel: {filterFuelType}
                    <button onClick={() => setFilterFuelType("all")} className="ml-1 text-green-800 hover:text-green-900">
                      ×
                    </button>
                  </div>
                )}
                {filterPaymentMethod !== "all" && (
                  <div className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Payment: {filterPaymentMethod}
                    <button onClick={() => setFilterPaymentMethod("all")} className="ml-1 text-purple-800 hover:text-purple-900">
                      ×
                    </button>
                  </div>
                )}
                {filterDateRange !== 'all' && (
                  <div className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Date: {filterDateRange === 'today' ? 'Today' : filterDateRange === 'week' ? 'Last 7 days' : 'This month'}
                    <button onClick={() => setFilterDateRange("all")} className="ml-1 text-yellow-800 hover:text-yellow-900">
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
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Fuel Type</TableHead>
                      <TableHead className="text-right">Liters</TableHead>
                      <TableHead className="text-right">Price/L (₹)</TableHead>
                      <TableHead className="text-right">Total Cost (₹)</TableHead>
                      <TableHead className="text-right">Odometer</TableHead>
                      <TableHead className="text-right">Mileage</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Fuel Station</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFuelData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          <p className="text-gray-500">No fuel records found. Add a new record or adjust your filters.</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFuelData.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{formatDate(record.fillDate)}</TableCell>
                          <TableCell className="font-medium">{getVehicleDisplayName(record.vehicleId)}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              record.fuelType === 'Petrol' ? 'bg-green-100 text-green-800' :
                              record.fuelType === 'Diesel' ? 'bg-blue-100 text-blue-800' :
                              record.fuelType === 'CNG' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {record.fuelType}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{record.quantity.toFixed(1)}</TableCell>
                          <TableCell className="text-right">{record.pricePerUnit.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">₹{record.totalCost.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{record.odometer.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {record.calculatedMileage ? (
                              <span className="inline-flex items-center">
                                <Gauge className="h-3 w-3 mr-1 text-green-600" />
                                {record.calculatedMileage.toFixed(1)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{getPaymentMethodDisplay(record.paymentMethod, record.paymentDetails)}</TableCell>
                          <TableCell>{record.fuelStation}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditFuelRecord(record)}>
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700" 
                                onClick={() => handleConfirmDelete(record.id)}
                              >
                                <Trash className="h-3.5 w-3.5" />
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

        {/* Fuel Record Form Dialog */}
        <FuelRecordForm 
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveFuelRecord}
          editingRecord={editingRecord}
        />

        {/* Filter Dialog */}
        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Filter Fuel Records</DialogTitle>
              <DialogDescription>
                Apply filters to narrow down the fuel records.
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
                        {vehicle.vehicleNumber} - {vehicle.name} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterFuelType">Fuel Type</Label>
                <Select value={filterFuelType} onValueChange={setFilterFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All fuel types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All fuel types</SelectItem>
                    <SelectItem value="Petrol">Petrol</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="CNG">CNG</SelectItem>
                    <SelectItem value="Electric">Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterPaymentMethod">Payment Method</Label>
                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All payment methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All payment methods</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Company">Company Account</SelectItem>
                    <SelectItem value="Customer">Customer Account</SelectItem>
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

              <div>
                <Label htmlFor="dateRange">Custom Date Range</Label>
                <DatePickerWithRange 
                  date={dateRange} 
                  setDate={(range) => {
                    setDateRange(range);
                    if (range && range.from && range.to && (typeof dateRangeType !== 'string' || dateRangeType.trim().toLowerCase() !== 'custom')) {
                      setDateRangeType('custom');
                      toast.info('Custom Date Range selected.');
                    }
                  }} 
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <Button onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!confirmDeleteRecord} onOpenChange={(open) => !open && setConfirmDeleteRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Fuel Record</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this fuel record? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDeleteRecord(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => confirmDeleteRecord && handleDeleteFuelRecord(confirmDeleteRecord)}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
