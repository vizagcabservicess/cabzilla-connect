import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';
import { Loader2, RefreshCcw, Save, AlertTriangle } from 'lucide-react';
import { syncLocalFaresWithDatabase } from '@/lib/packageData';
import { fetchAndCacheLocalFares } from '@/services/localFareService';

interface FareItem {
  vehicleId: string;
  vehicleName?: string;
  price4hrs40km: number;
  price8hrs80km: number;
  price10hrs100km: number;
  priceExtraKm: number;
  priceExtraHour: number;
  source?: string;
  isEdited?: boolean;
}

export function LocalPackageFareManager() {
  const [fares, setFares] = useState<FareItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  useEffect(() => {
    loadFares();
  }, []);

  const loadFares = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = getApiUrl('');
      const endpoint = `${apiUrl}/api/admin/direct-local-fares.php`;
      
      const vehiclesResponse = await axios.get(`${apiUrl}/data/vehicles.json`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      const vehicles = vehiclesResponse.data || [];
      const farePromises = vehicles.map(async (vehicle: any) => {
        try {
          const response = await axios.get(`${endpoint}?vehicle_id=${vehicle.id}`, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            }
          });
          
          if (response.data && response.data.fares && response.data.fares.length > 0) {
            const fare = response.data.fares[0];
            return {
              ...fare,
              vehicleName: vehicle.name,
              isEdited: false
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching fare for ${vehicle.id}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(farePromises);
      const validFares = results.filter(fare => fare !== null) as FareItem[];
      
      setFares(validFares);
      setLastFetchTime(new Date());
    } catch (error) {
      console.error('Error loading fares:', error);
      setError('Failed to load local package fares. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (vehicleId: string, field: keyof FareItem, value: number) => {
    setFares(prevFares => 
      prevFares.map(fare => 
        fare.vehicleId === vehicleId 
          ? { ...fare, [field]: value, isEdited: true } 
          : fare
      )
    );
  };

  const handleSyncWithDatabase = async () => {
    setSyncing(true);
    try {
      const success = await syncLocalFaresWithDatabase(true);
      
      if (success) {
        toast.success('Local package fares synced with database');
        await loadFares();
        
        if (window.localPackagePriceCache) {
          window.localPackagePriceCache = {};
        }
        
        fetchAndCacheLocalFares();
      } else {
        toast.error('Failed to sync local package fares');
      }
    } catch (error) {
      console.error('Error syncing fares:', error);
      toast.error('Error occurred while syncing fares');
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    
    try {
      const apiUrl = getApiUrl();
      const editedFares = fares.filter(fare => fare.isEdited);
      
      if (editedFares.length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }
      
      const savePromises = editedFares.map(async (fare) => {
        try {
          const response = await axios.post(`${apiUrl}/api/admin/update-local-fares.php`, {
            vehicleId: fare.vehicleId,
            price4hrs40km: fare.price4hrs40km,
            price8hrs80km: fare.price8hrs80km,
            price10hrs100km: fare.price10hrs100km,
            priceExtraKm: fare.priceExtraKm,
            priceExtraHour: fare.priceExtraHour
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Mode': 'true',
              'X-Force-Refresh': 'true'
            }
          });
          
          return { vehicleId: fare.vehicleId, success: true, response: response.data };
        } catch (error) {
          console.error(`Error saving fare for ${fare.vehicleId}:`, error);
          return { vehicleId: fare.vehicleId, success: false, error };
        }
      });
      
      const results = await Promise.all(savePromises);
      const successCount = results.filter(result => result.success).length;
      const failCount = results.length - successCount;
      
      if (successCount === results.length) {
        toast.success(`Successfully saved changes for ${successCount} vehicles`);
        
        setFares(prevFares => 
          prevFares.map(fare => ({ ...fare, isEdited: false }))
        );
        
        await handleSyncWithDatabase();
      } else if (successCount > 0) {
        toast.success(`Saved changes for ${successCount} vehicles`, {
          description: `Failed to save changes for ${failCount} vehicles`
        });
        
        await loadFares();
      } else {
        toast.error(`Failed to save changes for all ${results.length} vehicles`);
      }
    } catch (error) {
      console.error('Error saving fares:', error);
      toast.error('Error occurred while saving fares');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Local Package Fares Management</span>
          <div className="text-sm font-normal text-muted-foreground">
            Last updated: {formatTime(lastFetchTime)}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="py-8 flex justify-center items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading fares...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">4hrs/40km (₹)</TableHead>
                  <TableHead className="text-right">8hrs/80km (₹)</TableHead>
                  <TableHead className="text-right">10hrs/100km (₹)</TableHead>
                  <TableHead className="text-right">Extra km (₹)</TableHead>
                  <TableHead className="text-right">Extra hour (₹)</TableHead>
                  <TableHead className="text-center">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fares.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No fare data available. Sync with database to load data.
                    </TableCell>
                  </TableRow>
                ) : (
                  fares.map((fare) => (
                    <TableRow key={fare.vehicleId} className={fare.isEdited ? "bg-muted/30" : ""}>
                      <TableCell className="font-medium">
                        {fare.vehicleName || fare.vehicleId}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={fare.price4hrs40km}
                          onChange={(e) => handleValueChange(fare.vehicleId, 'price4hrs40km', parseFloat(e.target.value) || 0)}
                          className={`w-24 text-right ${fare.isEdited ? 'border-primary' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={fare.price8hrs80km}
                          onChange={(e) => handleValueChange(fare.vehicleId, 'price8hrs80km', parseFloat(e.target.value) || 0)}
                          className={`w-24 text-right ${fare.isEdited ? 'border-primary' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={fare.price10hrs100km}
                          onChange={(e) => handleValueChange(fare.vehicleId, 'price10hrs100km', parseFloat(e.target.value) || 0)}
                          className={`w-24 text-right ${fare.isEdited ? 'border-primary' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={fare.priceExtraKm}
                          onChange={(e) => handleValueChange(fare.vehicleId, 'priceExtraKm', parseFloat(e.target.value) || 0)}
                          className={`w-24 text-right ${fare.isEdited ? 'border-primary' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={fare.priceExtraHour}
                          onChange={(e) => handleValueChange(fare.vehicleId, 'priceExtraHour', parseFloat(e.target.value) || 0)}
                          className={`w-24 text-right ${fare.isEdited ? 'border-primary' : ''}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          fare.source === 'database' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {fare.source || 'unknown'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          onClick={loadFares}
          disabled={loading || saving || syncing}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleSyncWithDatabase}
            disabled={loading || saving || syncing}
          >
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <></>}
            Sync with Database
          </Button>
          
          <Button
            variant="default"
            onClick={handleSaveChanges}
            disabled={loading || saving || syncing || !fares.some(fare => fare.isEdited)}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default LocalPackageFareManager;
