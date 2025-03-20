
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshWarning } from "@/components/cab-options/RefreshWarning";
import { 
  Car, PlaneTakeoff, MapPin, Settings, RefreshCw, 
  Plus, Package2, AlertTriangle
} from "lucide-react";
import { getVehicleData, getVehicleTypes } from '@/services/vehicleDataService';
import { fareService } from '@/services/fareService';
import { VehiclePricingForm } from './vehicle-forms/VehiclePricingForm';
import { LocalPackagePricingForm } from './vehicle-forms/LocalPackagePricingForm';
import { AirportPricingForm } from './vehicle-forms/AirportPricingForm';
import { AddVehicleForm } from './vehicle-forms/AddVehicleForm';

export function VehicleManagement() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("base");
  const [retryCount, setRetryCount] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(false);
  
  useEffect(() => {
    loadVehicleData();
  }, [forceRefresh]);
  
  const loadVehicleData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Loading vehicle data...");
      
      // Clear cache to force fresh data
      localStorage.removeItem('cabTypes');
      localStorage.removeItem('vehicleTypes');
      fareService.clearCache();
      
      // Get vehicle data with increased timeout and retries
      const data = await getVehicleData(true);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Retrieved ${data.length} vehicles:`, data);
        setVehicles(data);
      } else {
        console.warn("Received invalid vehicle data:", data);
        setError("Unable to load vehicle data. Using default vehicles.");
        // Still set default vehicles to allow some functionality
        setVehicles([
          {
            id: 'sedan',
            name: 'Sedan',
            basePrice: 4200,
            pricePerKm: 14,
            nightHaltCharge: 700,
            driverAllowance: 250,
            hr8km80Price: 1800,
            hr10km100Price: 2500,
            extraKmRate: 16,
            extraHourRate: 150,
            airportFee: 200
          },
          {
            id: 'ertiga',
            name: 'Ertiga',
            basePrice: 5400,
            pricePerKm: 18,
            nightHaltCharge: 800, 
            driverAllowance: 250,
            hr8km80Price: 2300,
            hr10km100Price: 2800,
            extraKmRate: 20,
            extraHourRate: 200,
            airportFee: 250
          },
          {
            id: 'innova_crysta',
            name: 'Innova Crysta',
            basePrice: 6000,
            pricePerKm: 20,
            nightHaltCharge: 1000,
            driverAllowance: 300,
            hr8km80Price: 2600,
            hr10km100Price: 3200,
            extraKmRate: 22,
            extraHourRate: 250,
            airportFee: 300
          }
        ]);
      }
    } catch (error) {
      console.error("Error loading vehicle data:", error);
      setError("Failed to load vehicle data. Using default vehicles.");
      setVehicles([
        {
          id: 'sedan',
          name: 'Sedan',
          basePrice: 4200,
          pricePerKm: 14,
          nightHaltCharge: 700,
          driverAllowance: 250,
          hr8km80Price: 1800,
          hr10km100Price: 2500,
          extraKmRate: 16,
          extraHourRate: 150,
          airportFee: 200
        },
        {
          id: 'ertiga',
          name: 'Ertiga',
          basePrice: 5400,
          pricePerKm: 18,
          nightHaltCharge: 800, 
          driverAllowance: 250,
          hr8km80Price: 2300,
          hr10km100Price: 2800,
          extraKmRate: 20,
          extraHourRate: 200,
          airportFee: 250
        },
        {
          id: 'innova_crysta',
          name: 'Innova Crysta',
          basePrice: 6000,
          pricePerKm: 20,
          nightHaltCharge: 1000,
          driverAllowance: 300,
          hr8km80Price: 2600,
          hr10km100Price: 3200,
          extraKmRate: 22,
          extraHourRate: 250,
          airportFee: 300
        }
      ]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    setRetryCount(prev => prev + 1);
    setForceRefresh(prev => !prev);
    toast.info("Refreshing vehicle data...");
  };
  
  const handlePricingSuccess = (vehicleId: string, tripType: string) => {
    toast.success(`Updated ${tripType} pricing for ${vehicleId}`);
    // Force reload data after successful update
    setForceRefresh(prev => !prev);
  };
  
  const handlePricingError = (error: any) => {
    console.error("Pricing update error:", error);
    toast.error("Failed to update pricing. Please try again.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Vehicle Management</h2>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {error && <RefreshWarning />}
      
      <Tabs defaultValue="base" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="base" className="flex items-center gap-1.5">
            <Car className="h-4 w-4" /> Base Pricing
          </TabsTrigger>
          <TabsTrigger value="outstation" className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" /> Outstation
          </TabsTrigger>
          <TabsTrigger value="local" className="flex items-center gap-1.5">
            <Package2 className="h-4 w-4" /> Local
          </TabsTrigger>
          <TabsTrigger value="airport" className="flex items-center gap-1.5">
            <PlaneTakeoff className="h-4 w-4" /> Airport
          </TabsTrigger>
          <TabsTrigger value="add" className="flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Vehicle
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="base">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" /> Base Vehicle Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <VehiclePricingForm 
                  vehicles={vehicles} 
                  onSuccess={handlePricingSuccess}
                  onError={handlePricingError}
                  tripType="base"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="outstation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Outstation Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <VehiclePricingForm 
                  vehicles={vehicles} 
                  onSuccess={handlePricingSuccess}
                  onError={handlePricingError}
                  tripType="outstation"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="local">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package2 className="h-5 w-5" /> Local Package Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <LocalPackagePricingForm
                  vehicles={vehicles}
                  onSuccess={handlePricingSuccess}
                  onError={handlePricingError}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="airport">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlaneTakeoff className="h-5 w-5" /> Airport Transfer Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <AirportPricingForm
                  vehicles={vehicles}
                  onSuccess={handlePricingSuccess}
                  onError={handlePricingError}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Add New Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AddVehicleForm onSuccess={() => {
                toast.success("Vehicle added successfully");
                setForceRefresh(prev => !prev);
                setActiveTab("base");
              }} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
