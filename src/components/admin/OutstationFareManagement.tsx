import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchOutstationFare, updateOutstationFare, syncOutstationFareTables, OutstationFareData as ServiceOutstationFareData } from '@/services/outstationFareService';
import { getVehicleData } from '@/services/vehicleDataService';
import { OutstationFareData } from '@/types/cab';
import { AlertCircle, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

interface OutstationFareManagementProps {
  vehicleId?: string;
}

const OutstationFareManagement: React.FC<OutstationFareManagementProps> = ({ vehicleId }) => {
  const [selectedVehicle, setSelectedVehicle] = useState<string>(vehicleId || '');
  const [fareData, setFareData] = useState<OutstationFareData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableVehicles, setAvailableVehicles] = useState<{ id: string; name: string; }[]>([]);

  useEffect(() => {
    const loadVehicles = async () => {
      setIsLoading(true);
      try {
        const vehicles = await getVehicleData();
        if (vehicles && Array.isArray(vehicles)) {
          setAvailableVehicles(vehicles.map(v => ({ id: v.id, name: v.name })));
        } else {
          setError('Failed to load vehicles.');
        }
      } catch (err) {
        setError('Failed to load vehicles.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadVehicles();
  }, []);

  useEffect(() => {
    const loadFareData = async () => {
      if (!selectedVehicle) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchOutstationFare(selectedVehicle);
        if (data) {
          setFareData({
            vehicleId: selectedVehicle,
            basePrice: data.basePrice || 0,
            pricePerKm: data.pricePerKm || 0,
            roundTripPricePerKm: data.roundTripPricePerKm || 0,
            minDistance: data.minDistance || 0,
            driverAllowance: data.driverAllowance || 0,
            nightHaltCharge: data.nightHaltCharge || 0,
            oneWayBasePrice: data.basePrice || 0,
            oneWayPricePerKm: data.pricePerKm || 0
          });
          
          console.log(`Retrieved outstation fare data for ${selectedVehicle}:`, data);
        } else {
          setFareData({
            vehicleId: selectedVehicle,
            basePrice: 0,
            pricePerKm: 0,
            roundTripPricePerKm: 0,
            minDistance: 0,
            driverAllowance: 0,
            nightHaltCharge: 0,
            oneWayBasePrice: 0,
            oneWayPricePerKm: 0
          });
          
          console.error(`No outstation fare data found for ${selectedVehicle}`);
          setError(`No outstation fare data found for ${selectedVehicle}. Please enter values and save.`);
        }
      } catch (err) {
        setError('Failed to load fare data.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedVehicle) {
      loadFareData();
    }
  }, [selectedVehicle]);

  const handleVehicleChange = (value: string) => {
    setSelectedVehicle(value);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFareData(prev => ({
      ...prev!,
      [name]: Number(value),
    }));
  };

  const handleSaveFare = async () => {
    if (!fareData) return;

    setIsSaving(true);
    setError(null);

    try {
      const serviceData: ServiceOutstationFareData = {
        vehicleId: fareData.vehicleId,
        basePrice: fareData.oneWayBasePrice || fareData.basePrice,
        pricePerKm: fareData.oneWayPricePerKm || fareData.pricePerKm,
        roundTripBasePrice: fareData.roundTripBasePrice,
        roundTripPricePerKm: fareData.roundTripPricePerKm,
        driverAllowance: fareData.driverAllowance,
        nightHaltCharge: fareData.nightHaltCharge,
        minDistance: fareData.minDistance
      };
      
      await updateOutstationFare(serviceData);
      toast.success('Outstation fares updated successfully!');
      
      setTimeout(async () => {
        const refreshedData = await fetchOutstationFare(selectedVehicle);
        console.log('Refreshed outstation fare data after save:', refreshedData);
      }, 1000);
    } catch (err) {
      setError('Failed to update outstation fares.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncTables = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      await syncOutstationFareTables();
      toast.success('Outstation fare tables synced successfully!');
      
      if (selectedVehicle) {
        const refreshedData = await fetchOutstationFare(selectedVehicle);
        if (refreshedData) {
          setFareData({
            vehicleId: selectedVehicle,
            basePrice: refreshedData.basePrice || 0,
            pricePerKm: refreshedData.pricePerKm || 0,
            roundTripPricePerKm: refreshedData.roundTripPricePerKm || 0,
            minDistance: refreshedData.minDistance || 0,
            driverAllowance: refreshedData.driverAllowance || 0,
            nightHaltCharge: refreshedData.nightHaltCharge || 0,
            oneWayBasePrice: refreshedData.basePrice || 0,
            oneWayPricePerKm: refreshedData.pricePerKm || 0
          });
        }
      }
    } catch (err) {
      setError('Failed to sync outstation fare tables.');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Outstation Fare Management</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="vehicle">
              Select Vehicle
            </label>
            <Select onValueChange={handleVehicleChange} defaultValue={selectedVehicle}>
              <SelectTrigger id="vehicle">
                <SelectValue placeholder="Select a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    <Spinner className="mr-2 h-4 w-4" />
                    Loading...
                  </SelectItem>
                ) : (
                  availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {fareData && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="oneWayBasePrice">
                  One Way Base Price
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-muted-foreground file:h-10 file:px-4 file:py-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  type="number"
                  id="oneWayBasePrice"
                  name="oneWayBasePrice"
                  value={fareData.oneWayBasePrice || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="oneWayPricePerKm">
                  One Way Price Per KM
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-muted-foreground file:h-10 file:px-4 file:py-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  type="number"
                  id="oneWayPricePerKm"
                  name="oneWayPricePerKm"
                  value={fareData.oneWayPricePerKm || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="roundTripBasePrice">
                  Round Trip Base Price
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-muted-foreground file:h-10 file:px-4 file:py-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  type="number"
                  id="roundTripBasePrice"
                  name="roundTripBasePrice"
                  value={fareData.roundTripBasePrice || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="roundTripPricePerKm">
                  Round Trip Price Per KM
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-muted-foreground file:h-10 file:px-4 file:py-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  type="number"
                  id="roundTripPricePerKm"
                  name="roundTripPricePerKm"
                  value={fareData.roundTripPricePerKm || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="minDistance">
                  Minimum Distance (km)
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-muted-foreground file:h-10 file:px-4 file:py-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  type="number"
                  id="minDistance"
                  name="minDistance"
                  value={fareData.minDistance || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="driverAllowance">
                  Driver Allowance
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-muted-foreground file:h-10 file:px-4 file:py-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  type="number"
                  id="driverAllowance"
                  name="driverAllowance"
                  value={fareData.driverAllowance || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed" htmlFor="nightHaltCharge">
                  Night Halt Charge
                </label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-muted-foreground file:h-10 file:px-4 file:py-2 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  type="number"
                  id="nightHaltCharge"
                  name="nightHaltCharge"
                  value={fareData.nightHaltCharge || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center p-6">
        <Button
          variant="outline"
          onClick={handleSyncTables}
          disabled={isSyncing}
        >
          {isSyncing ? <Spinner className="mr-2 h-4 w-4" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sync Tables
        </Button>
        <Button
          onClick={handleSaveFare}
          disabled={isSaving || !fareData}
        >
          {isSaving ? <Spinner className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OutstationFareManagement;
