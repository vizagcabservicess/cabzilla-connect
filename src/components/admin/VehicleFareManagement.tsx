import { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, RefreshCw, Save, Car, Plane, Bus, MapPin } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ApiErrorFallback } from '@/components/ApiErrorFallback';
import { VehiclePricing, TourFare, VehiclePricingUpdateRequest, FareUpdateRequest } from '@/types/api';
import { fareAPI } from '@/services/api';
import { getVehicleData } from '@/services/vehicleDataService';
import { Textarea } from '@/components/ui/textarea';

// Vehicle pricing form schema
const vehiclePricingSchema = z.object({
  vehicleType: z.string().min(1, { message: "Vehicle type is required" }),
  basePrice: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  pricePerKm: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  nightHaltCharge: z.coerce.number().min(0, { message: "Charge cannot be negative" }),
  driverAllowance: z.coerce.number().min(0, { message: "Allowance cannot be negative" }),
  inclusions: z.string().optional(),
  exclusions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  fuelType: z.string().optional(),
});

// Tour fare form schema
const tourFareSchema = z.object({
  tourId: z.string().min(1, { message: "Tour is required" }),
  sedan: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  ertiga: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  innova: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  tempo: z.coerce.number().min(0, { message: "Price cannot be negative" }),
  luxury: z.coerce.number().min(0, { message: "Price cannot be negative" }),
});

export function VehicleFareManagement() {
  // State for different fare types
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [tourFares, setTourFares] = useState<TourFare[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<{id: string, name: string}[]>([]);
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Forms for different fare types
  const vehiclePricingForm = useForm<z.infer<typeof vehiclePricingSchema>>({
    resolver: zodResolver(vehiclePricingSchema),
    defaultValues: {
      vehicleType: "",
      basePrice: 0,
      pricePerKm: 0,
      nightHaltCharge: 0,
      driverAllowance: 0,
    },
  });
  
  const tourFareForm = useForm<z.infer<typeof tourFareSchema>>({
    resolver: zodResolver(tourFareSchema),
    defaultValues: {
      tourId: "",
      sedan: 0,
      ertiga: 0,
      innova: 0,
      tempo: 0,
      luxury: 0,
    },
  });
  
  const [selectedTourPricing, setSelectedTourPricing] = useState<{ [vehicleType: string]: number }>({});
  const [newVehicleType, setNewVehicleType] = useState('');
  const [newVehiclePrice, setNewVehiclePrice] = useState('');
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchAllFareData();
    loadAvailableVehicles();
  }, []);
  
  const loadAvailableVehicles = async () => {
    try {
      console.log("Loading available vehicles for dropdown...");
      // Pass single forceRefresh parameter to load all vehicles including inactive ones
      const vehicles = await getVehicleData(true);
      
      if (vehicles && Array.isArray(vehicles)) {
        const vehicleOptions = vehicles.map(v => ({
          id: v.id || v.vehicleId || '',
          name: v.name || v.id || ''
        }));
        
        console.log("Available vehicles loaded:", vehicleOptions);
        setAvailableVehicles(vehicleOptions);
      } else {
        console.warn("No vehicles found or invalid response format");
        toast.error("Could not load vehicle options");
      }
    } catch (error) {
      console.error("Error loading available vehicles:", error);
      toast.error("Failed to load vehicle options");
    }
  };
  
  const fetchAllFareData = async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Fetch vehicle pricing data
      await fetchVehiclePricing();
      
      // Fetch tour fares data
      await fetchTourFares();
      
      toast.success("All fare data refreshed");
    } catch (error) {
      console.error("Error refreshing fare data:", error);
      setError("Failed to refresh fare data. Please try again.");
      toast.error("Failed to refresh fare data");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const fetchVehiclePricing = async () => {
    try {
      console.log("Fetching vehicle pricing...");
      const data = await fareAPI.getVehiclePricing();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("Fetched vehicle pricing:", data);
        setVehiclePricing(data);
      } else {
        console.warn("Empty or invalid vehicle pricing data:", data);
        setError("No vehicle pricing data available. The API may be down or returned an empty result.");
      }
    } catch (error) {
      console.error("Error fetching vehicle pricing:", error);
      throw error;
    }
  };
  
  const fetchTourFares = async () => {
    try {
      console.log("Fetching tour fares...");
      const data = await fareAPI.getTourFares();
      
      if (Array.isArray(data) && data.length > 0) {
        console.log("Fetched tour fares:", data);
        setTourFares(data);
      } else {
        console.warn("Empty or invalid tour fares data:", data);
      }
    } catch (error) {
      console.error("Error fetching tour fares:", error);
      throw error;
    }
  };
  
  const handleVehicleSelect = (vehicleType: string) => {
    const selectedVehicle = vehiclePricing.find(pricing => pricing.vehicleType === vehicleType);
    if (selectedVehicle) {
      vehiclePricingForm.setValue("vehicleType", selectedVehicle.vehicleType);
      vehiclePricingForm.setValue("basePrice", selectedVehicle.basePrice);
      vehiclePricingForm.setValue("pricePerKm", selectedVehicle.pricePerKm);
      vehiclePricingForm.setValue("nightHaltCharge", selectedVehicle.nightHaltCharge || 0);
      vehiclePricingForm.setValue("driverAllowance", selectedVehicle.driverAllowance || 0);
      vehiclePricingForm.setValue("inclusions", selectedVehicle.inclusions ? selectedVehicle.inclusions.join(", ") : "");
      vehiclePricingForm.setValue("exclusions", selectedVehicle.exclusions ? selectedVehicle.exclusions.join(", ") : "");
      vehiclePricingForm.setValue("cancellationPolicy", selectedVehicle.cancellationPolicy || "");
      vehiclePricingForm.setValue("fuelType", selectedVehicle.fuelType || "");
    }
  };
  
  const handleTourSelect = (tourId: string) => {
    const selectedTour = tourFares.find(fare => fare.tourId === tourId);
    if (selectedTour) {
      setSelectedTourId(selectedTour.tourId);
      setSelectedTourPricing({ ...(selectedTour.pricing || {}) });
    }
  };
  
  const handleAddVehicleType = () => {
    if (newVehicleType && newVehiclePrice) {
      setSelectedTourPricing(prev => ({
        ...prev,
        [newVehicleType]: Number(newVehiclePrice)
      }));
      setNewVehicleType('');
      setNewVehiclePrice('');
    }
  };
  
  const handlePricingChange = (vehicleType: string, value: string) => {
    setSelectedTourPricing(prev => ({
      ...prev,
      [vehicleType]: Number(value)
    }));
  };
  
  const onTourFareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTourId) return;
    try {
      setIsLoading(true);
      const fareUpdateData = {
        pricing: selectedTourPricing
      };
      await fareAPI.updateTourFare(selectedTourId, fareUpdateData);
      toast.success("Tour fare updated successfully");
      await fetchTourFares();
    } catch (error) {
      console.error("Error updating tour fare:", error);
      toast.error("Failed to update tour fare");
    } finally {
      setIsLoading(false);
    }
  };
  
  const onVehiclePricingSubmit = async (values: z.infer<typeof vehiclePricingSchema>) => {
    try {
      setIsLoading(true);
      const inclusions = values.inclusions
        ? values.inclusions.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean)
        : [];
      const exclusions = values.exclusions
        ? values.exclusions.split(/,|\n/).map((s: string) => s.trim()).filter(Boolean)
        : [];
      const updateData: VehiclePricingUpdateRequest = {
        vehicleType: values.vehicleType,
        basePrice: values.basePrice,
        pricePerKm: values.pricePerKm,
        nightHaltCharge: values.nightHaltCharge,
        driverAllowance: values.driverAllowance,
        inclusions,
        exclusions,
        cancellationPolicy: values.cancellationPolicy,
        fuelType: values.fuelType,
      };
      await fareAPI.updateVehiclePricing(updateData.vehicleType, updateData);
      toast.success("Vehicle pricing updated successfully");
      await fetchVehiclePricing();
      window.dispatchEvent(new CustomEvent('fare-data-updated', { detail: { vehicleType: values.vehicleType } }));
    } catch (error) {
      console.error("Error updating vehicle pricing:", error);
      toast.error("Failed to update vehicle pricing");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (error && !vehiclePricing.length && !tourFares.length) {
    return (
      <ApiErrorFallback 
        error={error} 
        onRetry={fetchAllFareData} 
        title="Fare Data Error" 
        description="Unable to load fare data. This may be due to a network issue or server problem."
      />
    );
  }

  return (
    <Tabs defaultValue="outstation">
      <TabsList className="grid grid-cols-4 mb-4">
        <TabsTrigger value="outstation" className="flex items-center gap-1">
          <Car className="h-4 w-4" /> Outstation
        </TabsTrigger>
        <TabsTrigger value="tours" className="flex items-center gap-1">
          <Bus className="h-4 w-4" /> Tours
        </TabsTrigger>
        <TabsTrigger value="airport" className="flex items-center gap-1">
          <Plane className="h-4 w-4" /> Airport
        </TabsTrigger>
        <TabsTrigger value="local" className="flex items-center gap-1">
          <MapPin className="h-4 w-4" /> Local
        </TabsTrigger>
      </TabsList>
      
      {/* Outstation Fare Management */}
      <TabsContent value="outstation">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" /> Outstation Fare Management
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  fetchVehiclePricing();
                  loadAvailableVehicles();
                }} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...vehiclePricingForm}>
              <form onSubmit={vehiclePricingForm.handleSubmit(onVehiclePricingSubmit)} className="space-y-6">
                <FormField
                  control={vehiclePricingForm.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Vehicle Type</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleVehicleSelect(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a vehicle type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Use the combined vehicle list from both sources */}
                          {[...vehiclePricing.map(p => ({
                            id: p.vehicleType,
                            name: p.vehicleType
                          })), ...availableVehicles.filter(v => 
                            !vehiclePricing.some(p => p.vehicleType === v.id)
                          )].map((vehicle) => (
                            <SelectItem 
                              key={vehicle.id} 
                              value={vehicle.id}
                            >
                              {vehicle.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid gap-4 grid-cols-2">
                  <FormField
                    control={vehiclePricingForm.control}
                    name="basePrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Price</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={vehiclePricingForm.control}
                    name="pricePerKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per KM</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={vehiclePricingForm.control}
                    name="nightHaltCharge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Night Halt Charge</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={vehiclePricingForm.control}
                    name="driverAllowance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Driver Allowance</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={vehiclePricingForm.control}
                  name="inclusions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inclusions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., AC, Bottle Water, Music System" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehiclePricingForm.control}
                  name="exclusions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exclusions</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Toll, Parking, State Tax" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehiclePricingForm.control}
                  name="cancellationPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cancellation Policy</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g., Free cancellation up to 1 hour before pickup." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={vehiclePricingForm.control}
                  name="fuelType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select fuel type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Petrol">Petrol</SelectItem>
                          <SelectItem value="Diesel">Diesel</SelectItem>
                          <SelectItem value="CNG">CNG</SelectItem>
                          <SelectItem value="Electric">Electric</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Pricing
                    </>
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Current Outstation Fares</h3>
              {isRefreshing ? (
                <div className="flex justify-center p-6">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : vehiclePricing.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Vehicle Type</th>
                        <th className="text-right py-2 px-2">Base Price</th>
                        <th className="text-right py-2 px-2">Price/KM</th>
                        <th className="text-right py-2 px-2">Night Halt</th>
                        <th className="text-right py-2 px-2">Driver Allowance</th>
                        <th className="text-right py-2 px-2">Inclusions</th>
                        <th className="text-right py-2 px-2">Exclusions</th>
                        <th className="text-right py-2 px-2">Cancellation Policy</th>
                        <th className="text-right py-2 px-2">Fuel Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehiclePricing.map((pricing) => (
                        <tr key={pricing.id || pricing.vehicleType} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{pricing.vehicleType}</td>
                          <td className="text-right py-2 px-2">₹{pricing.basePrice.toLocaleString('en-IN')}</td>
                          <td className="text-right py-2 px-2">₹{pricing.pricePerKm.toLocaleString('en-IN')}</td>
                          <td className="text-right py-2 px-2">₹{(pricing.nightHaltCharge || 0).toLocaleString('en-IN')}</td>
                          <td className="text-right py-2 px-2">₹{(pricing.driverAllowance || 0).toLocaleString('en-IN')}</td>
                          <td className="text-right py-2 px-2">{pricing.inclusions ? pricing.inclusions.join(', ') : '-'}</td>
                          <td className="text-right py-2 px-2">{pricing.exclusions ? pricing.exclusions.join(', ') : '-'}</td>
                          <td className="text-right py-2 px-2">{pricing.cancellationPolicy || '-'}</td>
                          <td className="text-right py-2 px-2">{pricing.fuelType || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No vehicle pricing found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Tours Fare Management */}
      <TabsContent value="tours">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Bus className="h-5 w-5" /> Tour Fare Management
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchTourFares} 
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Form {...tourFareForm}>
              <form onSubmit={onTourFareSubmit} className="space-y-6">
                <div className="mb-4">
                  <label className="block mb-1 font-medium">Select Tour</label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={selectedTourId || ''}
                    onChange={e => handleTourSelect(e.target.value)}
                  >
                    <option value="">Select a tour</option>
                    {tourFares.map(fare => (
                      <option key={fare.tourId} value={fare.tourId}>{fare.tourName}</option>
                    ))}
                  </select>
                </div>
                {Object.entries(selectedTourPricing).map(([vehicleType, price]) => (
                  <div key={vehicleType} className="mb-2">
                    <label className="block mb-1">{vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)} Price</label>
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      value={price}
                      onChange={e => handlePricingChange(vehicleType, e.target.value)}
                    />
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <input
                    placeholder="Vehicle Type"
                    className="border rounded px-2 py-1"
                    value={newVehicleType}
                    onChange={e => setNewVehicleType(e.target.value)}
                  />
                  <input
                    placeholder="Price"
                    type="number"
                    className="border rounded px-2 py-1"
                    value={newVehiclePrice}
                    onChange={e => setNewVehiclePrice(e.target.value)}
                  />
                  <Button type="button" onClick={handleAddVehicleType}>Add</Button>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Update Tour Prices
                    </>
                  )}
                </Button>
              </form>
            </Form>
            
            <div className="mt-8">
              <h3 className="text-lg font-medium mb-4">Current Tour Fares</h3>
              {isRefreshing ? (
                <div className="flex justify-center p-6">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : tourFares.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2">Tour Name</th>
                        {tourFares.length > 0 && Object.keys(tourFares[0].pricing || {}).map(vehicleType => (
                          <th key={vehicleType} className="text-right py-2 px-2">{vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tourFares.map((fare) => (
                        <tr key={fare.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{fare.tourName}</td>
                          {Object.entries(fare.pricing || {}).map(([vehicleType, price]) => (
                            <td key={vehicleType} className="text-right py-2 px-2">₹{price.toLocaleString('en-IN')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No tour fares found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Airport Transfer Fares */}
      <TabsContent value="airport">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" /> Airport Transfer Fare Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Airport transfer fares are calculated based on fixed rates per distance tier.
              </p>
              <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-3">
                {/* Sample airport fare display */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">0-15 km</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Sedan:</span>
                        <span className="font-medium">₹840</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ertiga:</span>
                        <span className="font-medium">₹1,200</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Innova:</span>
                        <span className="font-medium">₹1,500</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">16-20 km</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Sedan:</span>
                        <span className="font-medium">₹1,000</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ertiga:</span>
                        <span className="font-medium">₹1,500</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Innova:</span>
                        <span className="font-medium">₹1,800</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">21-30 km</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Sedan:</span>
                        <span className="font-medium">₹1,200</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ertiga:</span>
                        <span className="font-medium">₹1,800</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Innova:</span>
                        <span className="font-medium">₹2,100</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <p className="mt-8 text-muted-foreground">
                For distances beyond 35 km, additional per-km charges apply:<br />
                Sedan: ₹14/km, Ertiga: ₹18/km, Innova: ₹20/km
              </p>
              
              <Button className="mt-4" variant="outline" disabled>
                <span className="text-muted-foreground">Airport fares are configured in the system</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      {/* Local Package Fares */}
      <TabsContent value="local">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Local Package Fare Management
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Local package fares are available in the Local Fare Management section.
              </AlertDescription>
            </Alert>
            
            <div className="text-center py-4">
              <Button
                variant="default"
                onClick={() => window.location.href = '/admin/local-fares'}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Go to Local Fare Management
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
