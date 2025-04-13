
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Save, 
  RefreshCw, 
  Database, 
  Loader, 
  Car
} from 'lucide-react';
import VehicleSelection from '@/components/admin/VehicleSelection';
import { 
  OutstationFareData, 
  fetchOutstationFare, 
  updateOutstationFare,
  initializeOutstationFareTables,
  syncOutstationFareTables 
} from '@/services/outstationFareService';

const OutstationFareManagement: React.FC = () => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [fareData, setFareData] = useState<OutstationFareData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('one-way');
  const { toast } = useToast();

  // Load fare data when vehicle selection changes
  useEffect(() => {
    if (selectedVehicleId) {
      loadFareData(selectedVehicleId);
    } else {
      setFareData(null);
    }
  }, [selectedVehicleId, refreshKey]);

  const loadFareData = async (vehicleId: string) => {
    if (!vehicleId) return;
    
    setLoading(true);
    try {
      console.log(`Loading outstation fare data for vehicle ${vehicleId}...`);
      const data = await fetchOutstationFare(vehicleId);
      
      if (data) {
        console.log('Loaded outstation fare data:', data);
        setFareData(data);
      } else {
        console.log('No fare data found, creating default fare data');
        setFareData({
          vehicleId: vehicleId,
          oneWayBasePrice: 0,
          oneWayPricePerKm: 0,
          roundTripBasePrice: 0,
          roundTripPricePerKm: 0,
          driverAllowance: 300,
          nightHaltCharge: 700
        });
      }
    } catch (error) {
      console.error(`Error loading fare data for ${vehicleId}:`, error);
      toast({
        title: "Error",
        description: "Failed to load outstation fare data. Please try again.",
        variant: "destructive"
      });
      
      // Set default data even on error
      setFareData({
        vehicleId: vehicleId,
        oneWayBasePrice: 0,
        oneWayPricePerKm: 0,
        roundTripBasePrice: 0,
        roundTripPricePerKm: 0,
        driverAllowance: 300,
        nightHaltCharge: 700
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    console.log('Vehicle selection changed to:', vehicleId);
    setSelectedVehicleId(vehicleId);
  };

  const handleInputChange = (field: keyof OutstationFareData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fareData) return;
    
    let value: number | string = e.target.value;
    if (field !== 'vehicleId' && field !== 'vehicle_id') {
      value = parseFloat(value) || 0;
    }
    
    setFareData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSaveFare = async () => {
    if (!fareData || !selectedVehicleId) {
      toast({
        title: "Error",
        description: "Please select a vehicle and provide fare details.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Make sure the vehicle ID is correct
      const dataToSave: OutstationFareData = {
        ...fareData,
        vehicleId: selectedVehicleId
      };
      
      console.log('Saving outstation fare data:', dataToSave);
      
      const success = await updateOutstationFare(dataToSave);
      
      if (success) {
        toast({
          title: "Success",
          description: "Outstation fare saved successfully.",
        });
        
        // Refresh data after successful save
        setTimeout(() => {
          setRefreshKey(prev => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Error saving outstation fare:', error);
      toast({
        title: "Error",
        description: `Failed to save outstation fare: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeTables = async () => {
    setSyncing(true);
    try {
      const success = await initializeOutstationFareTables();
      
      if (success) {
        toast({
          title: "Success",
          description: "Outstation fare tables initialized successfully.",
        });
        
        if (selectedVehicleId) {
          setRefreshKey(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error initializing outstation fare tables:', error);
      toast({
        title: "Error",
        description: `Failed to initialize outstation fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncTables = async () => {
    setSyncing(true);
    try {
      const success = await syncOutstationFareTables();
      
      if (success) {
        toast({
          title: "Success",
          description: "Outstation fare tables synced successfully.",
        });
        
        if (selectedVehicleId) {
          setRefreshKey(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Error syncing outstation fare tables:', error);
      toast({
        title: "Error",
        description: `Failed to sync outstation fare tables: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Car className="h-6 w-6 text-cabBlue-500" />
          <span>Outstation Fare Management</span>
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleInitializeTables}
            disabled={syncing || loading}
            className="flex items-center gap-1"
          >
            {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            <span>Initialize DB Tables</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncTables}
            disabled={syncing || loading}
            className="flex items-center gap-1"
          >
            {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Sync Tables</span>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="grid gap-2">
          <Label className="font-medium">Vehicle Type</Label>
          <VehicleSelection
            onVehicleSelect={handleVehicleChange}
            selectedVehicleId={selectedVehicleId}
          />
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : selectedVehicleId && fareData ? (
          <Tabs defaultValue="one-way" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="one-way">One Way</TabsTrigger>
              <TabsTrigger value="round-trip">Round Trip</TabsTrigger>
            </TabsList>
            
            <TabsContent value="one-way" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="oneWayBasePrice">Base Price (₹)</Label>
                  <Input
                    id="oneWayBasePrice"
                    type="number"
                    value={fareData.oneWayBasePrice || 0}
                    onChange={handleInputChange('oneWayBasePrice')}
                    placeholder="0"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="oneWayPricePerKm">Price Per KM (₹)</Label>
                  <Input
                    id="oneWayPricePerKm"
                    type="number"
                    value={fareData.oneWayPricePerKm || 0}
                    onChange={handleInputChange('oneWayPricePerKm')}
                    placeholder="0"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="round-trip" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="roundTripBasePrice">Base Price (₹)</Label>
                  <Input
                    id="roundTripBasePrice"
                    type="number"
                    value={fareData.roundTripBasePrice || 0}
                    onChange={handleInputChange('roundTripBasePrice')}
                    placeholder="0"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="roundTripPricePerKm">Price Per KM (₹)</Label>
                  <Input
                    id="roundTripPricePerKm"
                    type="number"
                    value={fareData.roundTripPricePerKm || 0}
                    onChange={handleInputChange('roundTripPricePerKm')}
                    placeholder="0"
                  />
                </div>
              </div>
            </TabsContent>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="grid gap-2">
                <Label htmlFor="driverAllowance">Driver Allowance (₹)</Label>
                <Input
                  id="driverAllowance"
                  type="number"
                  value={fareData.driverAllowance || 0}
                  onChange={handleInputChange('driverAllowance')}
                  placeholder="300"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="nightHaltCharge">Night Halt Charge (₹)</Label>
                <Input
                  id="nightHaltCharge"
                  type="number"
                  value={fareData.nightHaltCharge || 0}
                  onChange={handleInputChange('nightHaltCharge')}
                  placeholder="700"
                />
              </div>
            </div>
          </Tabs>
        ) : (
          <div className="border border-gray-200 rounded-md p-6 text-center">
            <p className="text-gray-500">Please select a vehicle to manage outstation fares</p>
          </div>
        )}
        
        {selectedVehicleId && fareData && (
          <Button 
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSaveFare}
            disabled={loading || syncing}
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Fares</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OutstationFareManagement;
