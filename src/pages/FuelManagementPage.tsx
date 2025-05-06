
import React, { useState, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
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
  Cash, 
  CircleDollarSign,
  Calendar,
  Mileage 
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

export default function FuelManagementPage() {
  const [activeTab, setActiveTab] = useState<string>("fuel");
  const [fuelData, setFuelData] = useState<FuelRecord[]>([]);
  const [filteredFuelData, setFilteredFuelData] = useState<FuelRecord[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState<string>("");
  const [filterFuelType, setFilterFuelType] = useState<string>("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<string | null>(null);
  
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
      const vehiclesResponse = await fetch('/api/admin/fleet_vehicles.php/vehicles')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch vehicles');
          return res.json();
        })
        .catch(err => {
          console.error("Error fetching vehicles:", err);
          // If API fails, use sample data
          return {
            vehicles: [
              { id: 'VEH-001', vehicleNumber: 'AP31AA1234', name: 'Swift', model: 'Dzire', make: 'Suzuki', year: 2022 },
              { id: 'VEH-002', vehicleNumber: 'AP31BB5678', name: 'Innova', model: 'Crysta', make: 'Toyota', year: 2023 },
              { id: 'VEH-003', vehicleNumber: 'AP31CC9012', name: 'Alto', model: 'K10', make: 'Suzuki', year: 2021 }
            ]
          };
        });
      
      if (vehiclesResponse.vehicles) {
        setVehicles(vehiclesResponse.vehicles);
      }
      
      // Fetch fuel records
      const fuelResponse = await fetch('/api/admin/fuel_records.php')
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch fuel records');
          return res.json();
        })
        .catch(err => {
          console.error("Error fetching fuel records:", err);
          // If API fails, use sample data
          return {
            status: 'success',
            data: {
              fuelRecords: [
                { 
                  id: '1', 
                  vehicleId: 'VEH-001', 
                  fillDate: '2025-05-01', 
                  quantity: 45.2, 
                  pricePerUnit: 107.5, 
                  totalCost: 4859, 
                  odometer: 15420, 
                  fuelStation: 'HPCL, Gajuwaka', 
                  fuelType: 'Petrol',
                  paymentMethod: 'Cash',
                  mileage: 16.2,
                  createdAt: '2025-05-01T10:30:00Z',
                  updatedAt: '2025-05-01T10:30:00Z'
                },
                { 
                  id: '2', 
                  vehicleId: 'VEH-002', 
                  fillDate: '2025-04-30', 
                  quantity: 35.8, 
                  pricePerUnit: 107.2, 
                  totalCost: 3837.76, 
                  odometer: 12540, 
                  fuelStation: 'Indian Oil, Siripuram', 
                  fuelType: 'Diesel',
                  paymentMethod: 'Card',
                  paymentDetails: {
                    bankName: 'HDFC Bank',
                    lastFourDigits: '1234'
                  },
                  mileage: 14.8,
                  createdAt: '2025-04-30T14:15:00Z',
                  updatedAt: '2025-04-30T14:15:00Z'
                },
                { 
                  id: '3', 
                  vehicleId: 'VEH-003', 
                  fillDate: '2025-04-29', 
                  quantity: 42.5, 
                  pricePerUnit: 107.5, 
                  totalCost: 4568.75, 
                  odometer: 14250, 
                  fuelStation: 'HPCL, Dwaraka Nagar', 
                  fuelType: 'Petrol',
                  paymentMethod: 'Company',
                  mileage: 18.5,
                  createdAt: '2025-04-29T09:45:00Z',
                  updatedAt: '2025-04-29T09:45:00Z'
                },
                { 
                  id: '4', 
                  vehicleId: 'VEH-002', 
                  fillDate: '2025-04-28', 
                  quantity: 38.6, 
                  pricePerUnit: 107.3, 
                  totalCost: 4141.78, 
                  odometer: 13680, 
                  fuelStation: 'BP, Maddilapalem', 
                  fuelType: 'Diesel',
                  paymentMethod: 'Customer',
                  mileage: 13.7,
                  createdAt: '2025-04-28T16:20:00Z',
                  updatedAt: '2025-04-28T16:20:00Z'
                },
                { 
                  id: '5', 
                  vehicleId: 'VEH-001', 
                  fillDate: '2025-04-27', 
                  quantity: 43.8, 
                  pricePerUnit: 106.9, 
                  totalCost: 4682.22, 
                  odometer: 14980, 
                  fuelStation: 'HPCL, Gajuwaka', 
                  fuelType: 'Petrol',
                  paymentMethod: 'Card',
                  paymentDetails: {
                    bankName: 'SBI',
                    lastFourDigits: '5678'
                  },
                  mileage: 17.1,
                  createdAt: '2025-04-27T11:10:00Z',
                  updatedAt: '2025-04-27T11:10:00Z'
                }
              ]
            }
          };
        });
      
      if (fuelResponse.status === 'success' && fuelResponse.data?.fuelRecords) {
        setFuelData(fuelResponse.data.fuelRecords);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load data. Using sample data instead.');
      
      // Set default sample data in case of errors
      setFuelData([]);
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
    if (filterVehicle) {
      filtered = filtered.filter(record => record.vehicleId === filterVehicle);
    }

    // Apply fuel type filter
    if (filterFuelType) {
      filtered = filtered.filter(record => record.fuelType === filterFuelType);
    }

    // Apply payment method filter
    if (filterPaymentMethod) {
      filtered = filtered.filter(record => record.paymentMethod === filterPaymentMethod);
    }

    // Apply date range filter
    if (filterDateRange !== 'all') {
      const today = new Date();
      let startDate: Date;
      
      switch(filterDateRange) {
        case 'today':
          startDate = new Date(today.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = subDays(today, 7);
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }
      
      filtered = filtered.filter(record => new Date(record.fillDate) >= startDate);
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
      // In a real app, this would be an API call to save the fuel record
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!record.id) {
        // Adding a new record
        const newRecord: FuelRecord = {
          id: `temp-${Date.now()}`,
          ...record as any,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        } as FuelRecord;
        
        setFuelData(prev => [newRecord, ...prev]);
        toast.success('Fuel record added successfully');
      } else {
        // Updating an existing record
        setFuelData(prev => 
          prev.map(item => 
            item.id === record.id 
              ? { ...item, ...record, updatedAt: new Date().toISOString() } 
              : item
          )
        );
        toast.success('Fuel record updated successfully');
      }
    } catch (error) {
      console.error("Error saving fuel record:", error);
      toast.error('Failed to save fuel record');
      throw error; // Re-throw to be handled by the form component
    }
  };

  const handleDeleteFuelRecord = async (id: string) => {
    try {
      // In a real app, this would be an API call to delete the fuel record
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setFuelData(prev => prev.filter(record => record.id !== id));
      toast.success('Fuel record deleted successfully');
    } catch (error) {
      console.error("Error deleting fuel record:", error);
      toast.error('Failed to delete fuel record');
    } finally {
      setConfirmDeleteRecord(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setFilterVehicle("");
    setFilterFuelType("");
    setFilterPaymentMethod("");
    setFilterDateRange("all");
    setIsFilterDialogOpen(false);
  };

  const getVehicleDisplayName = (vehicleId: string): string => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (!vehicle) return vehicleId;
    return `${vehicle.vehicleNumber} - ${vehicle.name} ${vehicle.model}`;
  };

  // Calculate totals for the filtered data
  const totalFuelCost = filteredFuelData.reduce((sum, record) => sum + record.totalCost, 0);
  const totalLiters = filteredFuelData.reduce((sum, record) => sum + record.quantity, 0);
  const averageCostPerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;
  
  // Calculate average mileage
  const recordsWithMileage = filteredFuelData.filter(record => record.mileage);
  const averageMileage = recordsWithMileage.length > 0 
    ? recordsWithMileage.reduce((sum, record) => sum + (record.mileage || 0), 0) / recordsWithMileage.length 
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
            <Cash className="h-4 w-4 mr-1 text-green-600" />
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

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto p-8">
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
            {(filterVehicle || filterFuelType || filterPaymentMethod || filterDateRange !== 'all') && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filterVehicle && (
                  <div className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Vehicle: {getVehicleDisplayName(filterVehicle)}
                    <button onClick={() => setFilterVehicle("")} className="ml-1 text-blue-800 hover:text-blue-900">
                      ×
                    </button>
                  </div>
                )}
                {filterFuelType && (
                  <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Fuel: {filterFuelType}
                    <button onClick={() => setFilterFuelType("")} className="ml-1 text-green-800 hover:text-green-900">
                      ×
                    </button>
                  </div>
                )}
                {filterPaymentMethod && (
                  <div className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded flex items-center">
                    Payment: {filterPaymentMethod}
                    <button onClick={() => setFilterPaymentMethod("")} className="ml-1 text-purple-800 hover:text-purple-900">
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
                            {record.mileage ? (
                              <span className="inline-flex items-center">
                                <Mileage className="h-3 w-3 mr-1 text-green-600" />
                                {record.mileage.toFixed(1)}
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
                              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setConfirmDeleteRecord(record.id)}>
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
                    <SelectItem value="">All vehicles</SelectItem>
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
                    <SelectItem value="">All fuel types</SelectItem>
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
                    <SelectItem value="">All payment methods</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Company">Company Account</SelectItem>
                    <SelectItem value="Customer">Customer Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="filterDateRange">Date Range</Label>
                <Select value={filterDateRange} onValueChange={setFilterDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">This month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <Button onClick={() => setIsFilterDialogOpen(false)}>
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
      </main>
    </div>
  );
}
