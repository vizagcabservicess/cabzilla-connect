
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalFareForm } from './LocalFareForm';
import { AirportFareForm } from './AirportFareForm';
import { LocalFare, AirportFare } from '@/types/cab';
import { getLocalFaresForVehicle, getAirportFaresForVehicle } from '@/services/fareService';
import { syncLocalFares, syncAirportFares } from '@/services/fareUpdateService';
import { DatabaseConnectionError } from './DatabaseConnectionError';
import { toast } from 'sonner';

interface FareManagementProps {
  vehicleId: string;
  fareType: 'local' | 'airport';
}

export const FareManagement: React.FC<FareManagementProps> = ({ vehicleId, fareType }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);
  const [localFare, setLocalFare] = useState<LocalFare | null>(null);
  const [airportFare, setAirportFare] = useState<AirportFare | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDirectFetching, setIsDirectFetching] = useState(false);
  
  const loadFares = useCallback(async () => {
    if (!vehicleId) return;
    
    setLoading(true);
    setError(null);
    setDatabaseError(null);
    
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
      
      if (err.message && (
          err.message.includes('database') || 
          err.message.includes('SQL') || 
          err.message.includes('connection')
        )) {
        setDatabaseError(err);
      } else {
        setError(`Failed to load ${fareType} fares: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [vehicleId, fareType]);
  
  useEffect(() => {
    loadFares();
  }, [loadFares]);
  
  const handleFareUpdateErrorCallback = (err: any) => {
    console.error(`Error in ${fareType} fare update:`, err);
    setError(`Failed to update ${fareType} fares: ${err.message}`);
    toast.error(`Error updating ${fareType} fares: ${err.message}`);
  };

  const handleSyncTable = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setError(null);
    
    try {
      toast.info(`Syncing ${fareType} fares table...`);
      
      if (fareType === 'local') {
        const result = await syncLocalFares(true);
        if (result) {
          toast.success('Local fares table synced successfully');
          await loadFares();
        } else {
          toast.error('Failed to sync local fares table');
        }
      } else if (fareType === 'airport') {
        const result = await syncAirportFares(true);
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
      setError(`Failed to sync ${fareType} fares table: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleDirectFetch = async () => {
    if (isDirectFetching) return;
    
    setIsDirectFetching(true);
    setError(null);
    
    try {
      toast.info(`Fetching ${fareType} fares directly...`);
      
      const endpoint = fareType === 'local' 
        ? `/api/direct-local-fares.php?vehicleId=${encodeURIComponent(vehicleId)}` 
        : `/api/direct-airport-fares.php?vehicleId=${encodeURIComponent(vehicleId)}`;
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug': 'true',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log(`Direct ${fareType} fare response:`, responseText);
      
      try {
        const data = JSON.parse(responseText);
        
        if (data.status === 'success') {
          if (fareType === 'local') {
            setLocalFare(data.fares || null);
          } else {
            setAirportFare(data.fares || null);
          }
          toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares loaded successfully`);
        } else {
          throw new Error(data.message || `Failed to load ${fareType} fares`);
        }
      } catch (e) {
        console.error('Error parsing JSON:', e);
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
      }
      
    } catch (err: any) {
      console.error(`Error fetching ${fareType} fares directly:`, err);
      toast.error(err.message);
      setError(err.message);
    } finally {
      setIsDirectFetching(false);
    }
  };
  
  const handleFareUpdateSuccess = () => {
    toast.success(`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} fares updated successfully`);
    loadFares();
  };
  
  const testDatabaseConnection = async () => {
    try {
      toast.info("Testing database connection...");
      setError(null);
      
      const response = await fetch('/api/admin/direct-api-test.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API test failed with status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log("API test raw response:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Database connection test results:", data);
      } catch (jsonError) {
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}`);
      }
      
      if (data.database && data.database.connected) {
        toast.success("Database connection successful!");
        // Force reload fares after successful connection test
        loadFares();
        setDatabaseError(null);
      } else {
        const errorMsg = data.database?.error || "Database connection failed";
        toast.error(`Database connection test failed: ${errorMsg}`);
      }
    } catch (err: any) {
      console.error("Database connection test error:", err);
      toast.error(`Database connection test error: ${err.message}`);
    }
  };
  
  if (databaseError) {
    return (
      <DatabaseConnectionError 
        error={databaseError}
        onRetry={() => {
          testDatabaseConnection();
          loadFares();
        }}
        title={`${fareType.charAt(0).toUpperCase() + fareType.slice(1)} Fares Database Error`}
        description={`There was an error connecting to the database to load ${fareType} fares. Click "Test Connection" to diagnose the issue.`}
      />
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>
            {fareType === 'local' ? 'Local Package Fares' : 'Airport Transfer Fares'}
          </CardTitle>
          <CardDescription>
            Manage pricing for {fareType === 'local' ? 'local packages' : 'airport transfers'} for this vehicle
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={testDatabaseConnection}
            className="flex items-center gap-2"
          >
            Test Connection
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDirectFetch}
            disabled={isDirectFetching}
            className="flex items-center gap-2"
          >
            <Loader2 className={`h-4 w-4 ${isDirectFetching ? 'animate-spin' : ''}`} />
            {isDirectFetching ? 'Fetching...' : 'Direct Fetch'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSyncTable} 
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Table'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {loading && <p>Loading {fareType} fares...</p>}
        
        {!loading && fareType === 'local' && (
          <LocalFareForm 
            vehicleId={vehicleId} 
            initialData={localFare} 
            onSuccess={handleFareUpdateSuccess} 
            onError={handleFareUpdateErrorCallback}
          />
        )}
        
        {!loading && fareType === 'airport' && (
          <AirportFareForm 
            vehicleId={vehicleId} 
            initialData={airportFare} 
            onSuccess={handleFareUpdateSuccess} 
            onError={handleFareUpdateErrorCallback}
          />
        )}
      </CardContent>
    </Card>
  );
};
