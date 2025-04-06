
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalFareForm } from './LocalFareForm';
import { AirportFareForm } from './AirportFareForm';
import { LocalFare, AirportFare } from '@/types/cab';
import { getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import { syncLocalFares, syncAirportFares } from '@/services/fareUpdateService';
import { toast } from 'sonner';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localFare, setLocalFare] = useState<LocalFare | null>(null);
  const [airportFare, setAirportFare] = useState<AirportFare | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const loadFares = useCallback(async () => {
    if (!vehicleId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (fareType === 'local') {
        const fare = await getLocalFaresForVehicle(vehicleId);
        console.log('Loaded local fare:', fare);
        setLocalFare(fare);
      } else if (fareType === 'airport') {
        const fare = await getAirportFaresForVehicle(vehicleId);
        console.log('Loaded airport fare:', fare);
        setAirportFare(fare);
      }
    } catch (err: any) {
      console.error(`Error loading ${fareType} fares:`, err);
      setError(`Failed to load ${fareType} fares: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [vehicleId, fareType]);
  
  useEffect(() => {
    loadFares();
  }, [loadFares]);
  
  const handleSyncTable = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      toast.info(`Syncing ${fareType} fares table...`);
      
      if (fareType === 'local') {
        const result = await syncLocalFares();
        if (result) {
          toast.success('Local fares table synced successfully');
          await loadFares();
        } else {
          toast.error('Failed to sync local fares table');
        }
      } else if (fareType === 'airport') {
        const result = await syncAirportFares();
        if (result) {
          toast.success('Airport fares table synced successfully');
          await loadFares();
        } else {
          toast.error('Failed to sync airport fares table');
        }
      }
    } catch (err: any) {
      console.error(`Error syncing ${fareType} fares table:`, err);
      toast.error(`Failed to sync ${fareType} fares table: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleFareUpdateSuccess = () => {
    toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares updated successfully`);
    loadFares();
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          {fareType === 'local' ? 'Local Package Fares' : 'Airport Transfer Fares'}
        </CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSyncTable} 
          disabled={isSyncing}
          className="flex items-center"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Table'}
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {fareType === 'local' ? (
          <LocalFareForm 
            vehicleId={vehicleId} 
            initialData={localFare} 
            onSuccess={handleFareUpdateSuccess} 
          />
        ) : (
          <AirportFareForm 
            vehicleId={vehicleId} 
            initialData={airportFare} 
            onSuccess={handleFareUpdateSuccess} 
          />
        )}
      </CardContent>
    </Card>
  );
};
