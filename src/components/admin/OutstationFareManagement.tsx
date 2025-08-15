
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Save, 
  RefreshCw, 
  Database, 
  Loader, 
  Car,
  Layers
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

  // Debug: Log when fareData changes
  useEffect(() => {
    if (fareData) {
      console.log('FareData state updated:', {
        tier1Price: fareData.tier1Price,
        tier2Price: fareData.tier2Price,
        tier3Price: fareData.tier3Price,
        tier4Price: fareData.tier4Price,
        extraKmCharge: fareData.extraKmCharge
      });
    }
  }, [fareData]);

  const loadFareData = async (vehicleId: string) => {
    if (!vehicleId) return;
    
    setLoading(true);
    try {
      console.log(`Loading outstation fare data for vehicle ${vehicleId}...`);
      // Force refresh by clearing any cached data
      const data = await fetchOutstationFare(vehicleId);
      
                    if (data) {
         console.log('Loaded outstation fare data:', data);
         console.log('Tier pricing values:', {
           tier1Price: data.tier1Price,
           tier2Price: data.tier2Price,
           tier3Price: data.tier3Price,
           tier4Price: data.tier4Price,
           extraKmCharge: data.extraKmCharge
         });
         console.log('Raw tier pricing data from API:', {
           tier1Price: { type: typeof data.tier1Price, value: data.tier1Price },
           tier2Price: { type: typeof data.tier2Price, value: data.tier2Price },
           tier3Price: { type: typeof data.tier3Price, value: data.tier3Price },
           tier4Price: { type: typeof data.tier4Price, value: data.tier4Price },
           extraKmCharge: { type: typeof data.extraKmCharge, value: data.extraKmCharge }
         });
         console.log('Setting fare data with tier prices:', {
           tier1Price: data.tier1Price,
           tier2Price: data.tier2Price,
           tier3Price: data.tier3Price,
           tier4Price: data.tier4Price
         });
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
          nightHaltCharge: 700,
          // Default tier pricing
          tier1Price: 3500,
          tier2Price: 4200,
          tier3Price: 4900,
          tier4Price: 5600,
          extraKmCharge: 14,
          tier1MinKm: 35,
          tier1MaxKm: 50,
          tier2MinKm: 51,
          tier2MaxKm: 75,
          tier3MinKm: 76,
          tier3MaxKm: 100,
          tier4MinKm: 101,
          tier4MaxKm: 149
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
        nightHaltCharge: 700,
        // Default tier pricing
        tier1Price: 3500,
        tier2Price: 4200,
        tier3Price: 4900,
        tier4Price: 5600,
        extraKmCharge: 14,
        tier1MinKm: 35,
        tier1MaxKm: 50,
        tier2MinKm: 51,
        tier2MaxKm: 75,
        tier3MinKm: 76,
        tier3MaxKm: 100,
        tier4MinKm: 101,
        tier4MaxKm: 149
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
      // For tier pricing fields, allow 0 values but ensure they're numbers
      if (field.includes('tier') || field === 'extraKmCharge') {
        value = e.target.value === '' ? 0 : parseFloat(value) || 0;
      } else {
        value = parseFloat(value) || 0;
      }
    }
    
    console.log(`Input change for ${field}:`, { rawValue: e.target.value, processedValue: value });
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
       console.log('Tier pricing values being saved:', {
         tier1Price: dataToSave.tier1Price,
         tier2Price: dataToSave.tier2Price,
         tier3Price: dataToSave.tier3Price,
         tier4Price: dataToSave.tier4Price,
         extraKmCharge: dataToSave.extraKmCharge
       });
       console.log('Raw tier pricing values (before API call):', {
         tier1Price: { type: typeof dataToSave.tier1Price, value: dataToSave.tier1Price },
         tier2Price: { type: typeof dataToSave.tier2Price, value: dataToSave.tier2Price },
         tier3Price: { type: typeof dataToSave.tier3Price, value: dataToSave.tier3Price },
         tier4Price: { type: typeof dataToSave.tier4Price, value: dataToSave.tier4Price },
         extraKmCharge: { type: typeof dataToSave.extraKmCharge, value: dataToSave.extraKmCharge }
       });
      
      const success = await updateOutstationFare(dataToSave);
      
              if (success) {
          toast({
            title: "Success",
            description: "Outstation fare saved successfully.",
          });
          
          // Refresh data after successful save
          setTimeout(() => {
            setRefreshKey(prev => prev + 1);
            // Also reload the fare data immediately
            if (selectedVehicleId) {
              console.log('Reloading fare data after save for vehicle:', selectedVehicleId);
              loadFareData(selectedVehicleId);
            }
          }, 500); // Reduced timeout for faster refresh
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
           <Button
             variant="outline"
             onClick={() => {
               if (selectedVehicleId) {
                 console.log('Manual refresh triggered for vehicle:', selectedVehicleId);
                 setRefreshKey(prev => prev + 1);
                 loadFareData(selectedVehicleId);
               }
             }}
             disabled={syncing || loading || !selectedVehicleId}
             className="flex items-center gap-1"
           >
             <RefreshCw className="h-4 w-4" />
             <span>Refresh Data</span>
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
            <TabsList className="grid grid-cols-3 w-full mb-6">
              <TabsTrigger value="one-way">One Way</TabsTrigger>
              <TabsTrigger value="round-trip">Round Trip</TabsTrigger>
              <TabsTrigger value="tier-pricing">Tier Pricing</TabsTrigger>
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

            <TabsContent value="tier-pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Dynamic Tier Pricing for One-Way Trips
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure pricing tiers for different distance ranges. This applies only to one-way outstation trips.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tier 1 */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="tier1MinKm">Min KM</Label>
                      <Input
                        id="tier1MinKm"
                        type="number"
                        value={fareData.tier1MinKm || 35}
                        onChange={handleInputChange('tier1MinKm')}
                        placeholder="35"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier1MaxKm">Max KM</Label>
                      <Input
                        id="tier1MaxKm"
                        type="number"
                        value={fareData.tier1MaxKm || 50}
                        onChange={handleInputChange('tier1MaxKm')}
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier1Price">Price (₹)</Label>
                                             <Input
                         id="tier1Price"
                         type="number"
                         value={fareData.tier1Price ?? 0}
                         onChange={handleInputChange('tier1Price')}
                         placeholder="3500"
                         onFocus={() => console.log('Tier1Price input focused, current value:', fareData.tier1Price)}
                       />
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm font-medium text-muted-foreground">
                        Tier 1 (35-50 km)
                      </div>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="tier2MinKm">Min KM</Label>
                      <Input
                        id="tier2MinKm"
                        type="number"
                        value={fareData.tier2MinKm || 51}
                        onChange={handleInputChange('tier2MinKm')}
                        placeholder="51"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier2MaxKm">Max KM</Label>
                      <Input
                        id="tier2MaxKm"
                        type="number"
                        value={fareData.tier2MaxKm || 75}
                        onChange={handleInputChange('tier2MaxKm')}
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier2Price">Price (₹)</Label>
                                             <Input
                         id="tier2Price"
                         type="number"
                         value={fareData.tier2Price ?? 0}
                         onChange={handleInputChange('tier2Price')}
                         placeholder="4200"
                         onFocus={() => console.log('Tier2Price input focused, current value:', fareData.tier2Price)}
                       />
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm font-medium text-muted-foreground">
                        Tier 2 (51-75 km)
                      </div>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="tier3MinKm">Min KM</Label>
                      <Input
                        id="tier3MinKm"
                        type="number"
                        value={fareData.tier3MinKm || 76}
                        onChange={handleInputChange('tier3MinKm')}
                        placeholder="76"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier3MaxKm">Max KM</Label>
                      <Input
                        id="tier3MaxKm"
                        type="number"
                        value={fareData.tier3MaxKm || 100}
                        onChange={handleInputChange('tier3MaxKm')}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier3Price">Price (₹)</Label>
                                             <Input
                         id="tier3Price"
                         type="number"
                         value={fareData.tier3Price ?? 0}
                         onChange={handleInputChange('tier3Price')}
                         placeholder="4900"
                         onFocus={() => console.log('Tier3Price input focused, current value:', fareData.tier3Price)}
                       />
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm font-medium text-muted-foreground">
                        Tier 3 (76-100 km)
                      </div>
                    </div>
                  </div>

                  {/* Tier 4 */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 border rounded-lg">
                    <div>
                      <Label htmlFor="tier4MinKm">Min KM</Label>
                      <Input
                        id="tier4MinKm"
                        type="number"
                        value={fareData.tier4MinKm || 101}
                        onChange={handleInputChange('tier4MinKm')}
                        placeholder="101"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier4MaxKm">Max KM</Label>
                      <Input
                        id="tier4MaxKm"
                        type="number"
                        value={fareData.tier4MaxKm || 149}
                        onChange={handleInputChange('tier4MaxKm')}
                        placeholder="149"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tier4Price">Price (₹)</Label>
                                             <Input
                         id="tier4Price"
                         type="number"
                         value={fareData.tier4Price ?? 0}
                         onChange={handleInputChange('tier4Price')}
                         placeholder="5600"
                         onFocus={() => console.log('Tier4Price input focused, current value:', fareData.tier4Price)}
                       />
                    </div>
                    <div className="flex items-end">
                      <div className="text-sm font-medium text-muted-foreground">
                        Tier 4 (101-149 km)
                      </div>
                    </div>
                  </div>

                  {/* Extra KM Charge */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="extraKmCharge">Extra KM Charge (₹)</Label>
                                             <Input
                         id="extraKmCharge"
                         type="number"
                         value={fareData.extraKmCharge ?? 0}
                         onChange={handleInputChange('extraKmCharge')}
                         placeholder="14"
                       />
                      <p className="text-sm text-muted-foreground mt-1">
                        For distances beyond Tier 4 (149km)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
