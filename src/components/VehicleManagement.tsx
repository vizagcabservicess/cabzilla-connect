
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FareManagement } from './FareManagement';
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, RefreshCw, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  directVehicleOperation, 
  fixDatabaseTables, 
  isPreviewMode, 
  getMockVehicleData, 
  isFallbackNeeded, 
  enableFallbackMode, 
  disableFallbackMode,
  checkDatabaseConnection
} from '@/utils/apiHelper';
import { toast } from 'sonner';
import { clearVehicleDataCache } from '@/services/vehicleDataService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface VehicleManagementProps {
  vehicleId: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("local");
  const [refreshCount, setRefreshCount] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isDbCheckModalOpen, setIsDbCheckModalOpen] = useState(false);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<{working: boolean, message: string} | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  
  const maxAttempts = 3;
  
  useEffect(() => {
    // Check if we're in preview mode on component mount
    const preview = isPreviewMode();
    setIsPreview(preview);
    
    // Check if we're in fallback mode
    setIsFallbackMode(isFallbackNeeded());
    
    // If fallback mode is enabled and has expired, disable it
    const expiryTime = localStorage.getItem('fallback_mode_expiry');
    if (expiryTime) {
      const expiry = new Date(expiryTime);
      if (expiry < new Date()) {
        disableFallbackMode();
        setIsFallbackMode(false);
      }
    }
  }, []);
  
  // Function to force a reload of vehicles from database
  const resyncVehicles = useCallback(async () => {
    if (isResyncing) return;
    
    try {
      setIsResyncing(true);
      toast.info('Syncing vehicle data...');
      
      // Clear the cache first
      clearVehicleDataCache();
      
      if (isPreviewMode() || isFallbackNeeded()) {
        // In preview mode, simulate success for better UX
        await new Promise(resolve => setTimeout(resolve, 800));
        toast.success('Successfully synced vehicles (preview/fallback mode)');
        setRefreshCount(prev => prev + 1);
        setError(null);
      } else {
        // In production, make the actual API call
        try {
          // Call the reload-vehicles.php endpoint to force a reload from database
          const response = await directVehicleOperation(
            `api/admin/reload-vehicles.php?_t=${Date.now()}&source=database`, 
            'GET',
            {
              headers: {
                'X-Admin-Mode': 'true',
                'X-Force-Refresh': 'true',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            }
          );
          
          console.log('Vehicle resync result:', response);
          
          if (response && response.status === 'success') {
            toast.success(`Successfully resynced ${response.count || 0} vehicles${response.source === 'database' ? ' from database' : ''}`);
            setRefreshCount(0); // Reset counter to trigger a fresh check
            setError(null); // Clear any errors
          } else {
            toast.warning('Partial sync successful - some data may be from cache');
          }
        } catch (err) {
          console.error('Error resyncing vehicles:', err);
          
          // Even if the API call fails, we can still retrieve from static JSON in preview or fallback mode
          if (isPreviewMode() || isFallbackNeeded()) {
            setRefreshCount(prev => prev + 1);
            setError(null);
            toast.info('Using static vehicle data (fallback mode)');
          } else {
            toast.error('Failed to sync with database - using cached data');
          }
        }
      }
    } finally {
      setIsResyncing(false);
    }
  }, [isResyncing]);
  
  const handleFixDatabase = async () => {
    setIsFixing(true);
    setError(null);
    
    try {
      toast.info('Attempting to fix database...');
      console.log('Fixing database...');
      
      // Clear the vehicle data cache before fixing the database
      clearVehicleDataCache();
      
      // In preview mode or fallback mode, we'll simulate success
      if (isPreviewMode() || isFallbackNeeded()) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.success('Database fixed successfully (preview/fallback mode)');
        setError(null);
        setRefreshCount(prev => prev + 1);
        return;
      }
      
      const fixed = await fixDatabaseTables();
      
      if (fixed) {
        toast.success('Database fixed successfully');
        setError(null);
        // Reset refresh count to trigger a new check
        setRefreshCount(0);
      } else {
        toast.error('Failed to fix database');
        
        // Try alternate method
        try {
          console.log('Trying alternate fix method...');
          const result = await directVehicleOperation('api/admin/fix-database.php', 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          if (result && result.status === 'success') {
            toast.success('Database fixed successfully with alternate method');
            setError(null);
            setRefreshCount(0);
          } else {
            // Try one last method - reload from database
            await resyncVehicles();
          }
        } catch (altError) {
          console.error('Error with alternate fix:', altError);
          // Try resyncing as a last resort
          await resyncVehicles();
        }
      }
    } catch (err) {
      console.error('Error fixing database:', err);
      
      // In preview mode or fallback mode, we'll return success anyway
      if (isPreviewMode() || isFallbackNeeded()) {
        toast.info('Using static data (preview/fallback mode)');
        setError(null);
        setRefreshCount(prev => prev + 1);
      } else {
        toast.error('Failed to fix database tables - using cached data');
        
        // Suggest enabling fallback mode
        toast.info('Consider enabling fallback mode if database issues persist');
      }
    } finally {
      setIsFixing(false);
    }
  };

  const toggleFallbackMode = (enabled: boolean) => {
    if (enabled) {
      enableFallbackMode(60); // Enable for 60 minutes
      toast.success('Fallback mode enabled for 60 minutes');
    } else {
      disableFallbackMode();
      toast.info('Fallback mode disabled');
    }
    setIsFallbackMode(enabled);
    
    // Refresh data with new mode
    setTimeout(() => {
      setRefreshCount(prev => prev + 1);
    }, 500);
  };
  
  const checkDbConnection = async () => {
    setIsCheckingDb(true);
    
    try {
      const status = await checkDatabaseConnection();
      setDbConnectionStatus(status);
      
      if (status.working) {
        toast.success('Database connection is working');
      } else {
        toast.error(`Database connection issue: ${status.message}`);
      }
    } catch (err) {
      console.error('Error checking database connection:', err);
      setDbConnectionStatus({
        working: false,
        message: err instanceof Error ? err.message : 'Unknown error'
      });
      toast.error('Failed to check database connection');
    } finally {
      setIsCheckingDb(false);
    }
  };
  
  // Check if vehicle exists
  useEffect(() => {
    const checkVehicle = async () => {
      // Only try to check a few times to avoid infinite loops
      if (refreshCount >= maxAttempts) {
        console.log(`Max refresh attempts (${maxAttempts}) reached, skipping vehicle check`);
        return;
      }

      try {
        // If in preview mode or fallback mode, use mock data
        if (isPreviewMode() || isFallbackNeeded()) {
          try {
            const mockData = await getMockVehicleData(vehicleId);
            if (mockData && mockData.vehicles && mockData.vehicles.length > 0) {
              setError(null);
              return;
            }
          } catch (mockErr) {
            console.error('Error loading mock data:', mockErr);
            // Continue with API attempt
          }
        }
        
        // Add timestamp to URL to prevent caching
        const endpoint = `api/admin/vehicles-data.php?id=${encodeURIComponent(vehicleId)}&_t=${Date.now()}&source=database`;
        console.log(`Checking vehicle with endpoint: ${endpoint}`);
        
        try {
          const result = await directVehicleOperation(endpoint, 'GET', {
            headers: {
              'X-Admin-Mode': 'true',
              'X-Debug': 'true',
              'X-Force-Refresh': 'true',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          console.log('Vehicle check result:', result);
          
          if (result && result.status === 'success' && result.vehicles && result.vehicles.length > 0) {
            setError(null);
          } else {
            throw new Error('No valid vehicle data returned');
          }
        } catch (apiError) {
          console.error('API Error checking vehicle:', apiError);
          
          if (isPreviewMode() || isFallbackNeeded()) {
            // In preview or fallback mode, we can proceed with mock data
            setError(null);
          } else {
            setError(`Could not verify vehicle with ID: ${vehicleId} in the database. Some features might not work correctly.`);
            
            // Try resyncing
            await resyncVehicles();
          }
        }
      } catch (err) {
        console.error('Error checking vehicle:', err);
        
        if (isPreviewMode() || isFallbackNeeded()) {
          // In preview or fallback mode, don't show error
          setError(null);
        } else {
          setError(`Could not verify vehicle with ID: ${vehicleId} in the database. Some features might not work correctly.`);
        }
      } finally {
        // Increment refresh count regardless of outcome
        setRefreshCount(prev => prev + 1);
      }
    };
    
    if (vehicleId) {
      checkVehicle();
    }
  }, [vehicleId, refreshCount, resyncVehicles]);
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      {(isPreview || isFallbackMode) && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>
            {isPreview ? 'Preview Mode' : 'Fallback Mode'}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {isPreview 
                ? 'Running in preview mode with static data. Database operations are simulated.' 
                : 'Running in fallback mode due to database connectivity issues. Using static data.'}
            </span>
            {!isPreview && (
              <Button variant="outline" size="sm" onClick={() => setIsDbCheckModalOpen(true)}>
                Configure
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warning</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFixDatabase}
                disabled={isFixing}
                className="flex items-center gap-1"
              >
                {isFixing ? 'Fixing...' : 'Fix Database'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resyncVehicles}
                disabled={isResyncing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isResyncing ? 'animate-spin' : ''}`} />
                {isResyncing ? 'Syncing...' : 'Sync Database'}
              </Button>
              {!isPreview && !isFallbackMode && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => toggleFallbackMode(true)}
                  className="flex items-center gap-1"
                >
                  <BellOff className="h-3 w-3" />
                  Enable Fallback
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {!vehicleId && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Info className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium">No Vehicle Selected</h3>
                <p className="text-muted-foreground mt-1">
                  Please select a vehicle to manage its fare settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {vehicleId && (
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">Local Fares</TabsTrigger>
            <TabsTrigger value="airport">Airport Fares</TabsTrigger>
          </TabsList>
          <TabsContent value="local">
            <FareManagement vehicleId={vehicleId} fareType="local" key={`local-${refreshCount}`} />
          </TabsContent>
          <TabsContent value="airport">
            <FareManagement vehicleId={vehicleId} fareType="airport" key={`airport-${refreshCount}`} />
          </TabsContent>
        </Tabs>
      )}
      
      <Dialog open={isDbCheckModalOpen} onOpenChange={setIsDbCheckModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Database Connection Settings</DialogTitle>
            <DialogDescription>
              Configure how the application handles database connectivity issues.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="fallback-mode" className="font-medium">Fallback Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enables static data when database connection fails
                </p>
              </div>
              <Switch
                id="fallback-mode"
                checked={isFallbackMode}
                onCheckedChange={toggleFallbackMode}
              />
            </div>
            
            <div className="border-t pt-4 mt-2">
              <Button
                onClick={checkDbConnection}
                disabled={isCheckingDb}
                variant="outline"
                className="w-full"
              >
                {isCheckingDb ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking Connection...
                  </>
                ) : (
                  <>Test Database Connection</>
                )}
              </Button>
              
              {dbConnectionStatus && (
                <div className={`mt-4 p-3 rounded-md ${dbConnectionStatus.working ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-sm ${dbConnectionStatus.working ? 'text-green-700' : 'text-red-700'}`}>
                    {dbConnectionStatus.message}
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsDbCheckModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
