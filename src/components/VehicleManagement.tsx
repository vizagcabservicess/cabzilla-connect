
import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FareManagement } from './FareManagement';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info, RefreshCw, BellOff, Database, Loader2 } from "lucide-react";
import { 
  directVehicleOperation, 
  fixDatabaseTables, 
  isPreviewMode, 
  getMockVehicleData, 
  isFallbackNeeded, 
  enableFallbackMode, 
  disableFallbackMode,
  checkDatabaseConnection,
  autoFixDatabaseIssues,
  forceEnableFallbackMode,
  DbConnectionResult
} from '@/utils/apiHelper';
import { toast } from 'sonner';
import { clearVehicleDataCache } from '@/services/vehicleDataService';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface VehicleManagementProps {
  vehicleId: string;
}

export const VehicleManagement: React.FC<VehicleManagementProps> = ({ vehicleId }) => {
  const [error, setError] = useState<string | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("local");
  const [refreshCount, setRefreshCount] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isDbCheckModalOpen, setIsDbCheckModalOpen] = useState(false);
  const [dbConnectionStatus, setDbConnectionStatus] = useState<DbConnectionResult | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [systemStatus, setSystemStatus] = useState<{
    database: 'unknown' | 'connected' | 'failed',
    api: 'unknown' | 'working' | 'failing',
    fallback: boolean
  }>({ 
    database: 'unknown',
    api: 'unknown',
    fallback: false
  });
  
  const maxAttempts = 3;
  
  useEffect(() => {
    // Check if we're in preview mode on component mount
    const preview = isPreviewMode();
    setIsPreview(preview);
    
    // Check if we're in fallback mode
    const fallback = isFallbackNeeded();
    setIsFallbackMode(fallback);
    
    // If fallback mode is enabled and has expired, disable it
    const expiryTime = localStorage.getItem('fallback_mode_expiry');
    if (expiryTime) {
      const expiry = new Date(expiryTime);
      if (expiry < new Date()) {
        disableFallbackMode();
        setIsFallbackMode(false);
      } else {
        // Update system status if fallback is active
        setSystemStatus(prev => ({
          ...prev,
          fallback: true,
          database: 'failed'
        }));
      }
    }
    
    // Check database connection on mount
    if (!preview && !fallback) {
      checkDbConnectionSilently();
    }
  }, []);
  
  // Check database connection without showing UI feedback
  const checkDbConnectionSilently = async () => {
    try {
      const status = await checkDatabaseConnection();
      
      setSystemStatus(prev => ({
        ...prev,
        database: status.working ? 'connected' : 'failed',
        api: status.working ? 'working' : 'failing'
      }));
      
      if (!status.working) {
        console.warn('Silent database check failed:', status.message);
        
        // If database check fails, auto-enable fallback mode
        if (!isFallbackMode) {
          console.log('Auto-enabling fallback mode due to database connection failure');
          enableFallbackMode();
          setIsFallbackMode(true);
          setSystemStatus(prev => ({
            ...prev,
            fallback: true
          }));
          
          // Show toast notification about fallback mode
          toast.info('Database connection failed. Fallback mode has been enabled automatically.');
        }
      }
    } catch (err) {
      console.error('Error in silent database check:', err);
    }
  };
  
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
            
            // Update system status
            setSystemStatus(prev => ({
              ...prev,
              api: 'working'
            }));
          } else {
            toast.warning('Partial sync successful - some data may be from cache');
          }
        } catch (err) {
          console.error('Error resyncing vehicles:', err);
          
          // Update system status
          setSystemStatus(prev => ({
            ...prev,
            api: 'failing'
          }));
          
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
  }, [isResyncing, isPreviewMode, isFallbackNeeded]);
  
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
        
        // Update system status
        setSystemStatus(prev => ({
          ...prev,
          database: 'connected',
          api: 'working'
        }));
      } else {
        toast.error('Failed to fix database');
        
        // Update system status
        setSystemStatus(prev => ({
          ...prev,
          database: 'failed'
        }));
        
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
            
            // Update system status
            setSystemStatus(prev => ({
              ...prev,
              database: 'connected',
              api: 'working'
            }));
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
      
      // Update system status
      setSystemStatus(prev => ({
        ...prev,
        database: 'failed',
        api: 'failing'
      }));
      
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
      
      // Update system status
      setSystemStatus(prev => ({
        ...prev,
        fallback: true
      }));
    } else {
      disableFallbackMode();
      toast.info('Fallback mode disabled');
      
      // Update system status
      setSystemStatus(prev => ({
        ...prev,
        fallback: false
      }));
      
      // Check database connection when disabling fallback
      checkDbConnectionSilently();
    }
    setIsFallbackMode(enabled);
    
    // Refresh data with new mode
    setTimeout(() => {
      setRefreshCount(prev => prev + 1);
    }, 500);
  };
  
  // Run auto-fix for database issues
  const runAutoFix = async () => {
    setIsAutoFixing(true);
    
    try {
      toast.info('Running automatic database recovery...');
      
      const result = await autoFixDatabaseIssues();
      
      if (result.success) {
        toast.success('Database issues fixed automatically');
        
        // Update system status
        setSystemStatus({
          database: 'connected',
          api: 'working',
          fallback: false
        });
        
        // Disable fallback mode if it was enabled
        if (isFallbackNeeded()) {
          disableFallbackMode();
          setIsFallbackMode(false);
        }
      } else {
        toast.warning(`Auto-fix completed with warnings: ${result.message}`);
        
        // Make sure fallback mode is enabled
        if (!isFallbackNeeded()) {
          enableFallbackMode();
          setIsFallbackMode(true);
        }
        
        // Update system status
        setSystemStatus({
          database: 'failed',
          api: 'failing',
          fallback: true
        });
      }
      
      // Refresh data
      setRefreshCount(prev => prev + 1);
      
    } catch (error) {
      console.error('Error during auto-fix:', error);
      toast.error('Auto-fix process failed');
      
      // Enable fallback mode
      enableFallbackMode();
      setIsFallbackMode(true);
      
      // Update system status
      setSystemStatus({
        database: 'failed',
        api: 'failing',
        fallback: true
      });
    } finally {
      setIsAutoFixing(false);
    }
  };
  
  const checkDbConnection = async () => {
    setIsCheckingDb(true);
    
    try {
      const status = await checkDatabaseConnection();
      setDbConnectionStatus(status);
      
      // Update system status
      setSystemStatus(prev => ({
        ...prev,
        database: status.working ? 'connected' : 'failed'
      }));
      
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
      
      // Update system status
      setSystemStatus(prev => ({
        ...prev,
        database: 'failed'
      }));
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
            
            // Update system status based on source
            if (result.source === 'database') {
              setSystemStatus(prev => ({
                ...prev,
                database: 'connected',
                api: 'working'
              }));
            }
          } else {
            throw new Error('No valid vehicle data returned');
          }
        } catch (apiError) {
          console.error('API Error checking vehicle:', apiError);
          
          // Update system status
          setSystemStatus(prev => ({
            ...prev,
            api: 'failing'
          }));
          
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
  
  // Render system status badges
  const renderSystemStatus = () => {
    return (
      <div className="flex items-center gap-2 text-xs">
        <Badge 
          variant={systemStatus.database === 'connected' ? 'outline' : 'destructive'} 
          className="flex items-center gap-1"
        >
          <Database className="h-3 w-3" />
          {systemStatus.database === 'unknown' ? 'DB: Unknown' : 
           systemStatus.database === 'connected' ? 'DB: Connected' : 'DB: Disconnected'}
        </Badge>
        
        <Badge 
          variant={systemStatus.fallback ? 'secondary' : 'outline'}
          className="flex items-center gap-1"
        >
          {systemStatus.fallback ? 'Using Fallback Mode' : 'Normal Mode'}
        </Badge>
      </div>
    );
  };
  
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
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            <div className="flex gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={runAutoFix}
                disabled={isAutoFixing}
                className="flex items-center gap-1"
              >
                {isAutoFixing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Database className="h-3 w-3 mr-1" />}
                {isAutoFixing ? 'Fixing...' : 'Auto-Fix Issues'}
              </Button>
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
        <>
          <Card className="mb-4">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium">System Status</h3>
                {renderSystemStatus()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resyncVehicles}
                  disabled={isResyncing}
                  className="flex items-center gap-1 h-8"
                >
                  <RefreshCw className={`h-3 w-3 ${isResyncing ? 'animate-spin' : ''}`} />
                  {isResyncing ? 'Syncing...' : 'Refresh'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDbCheckModalOpen(true)}
                  className="h-8"
                >
                  Settings
                </Button>
                {!isFallbackMode && systemStatus.database === 'failed' && (
                  <Button 
                    variant="secondary"
                    size="sm"
                    onClick={() => forceEnableFallbackMode()}
                    className="h-8 whitespace-nowrap"
                  >
                    Use Fallback Mode
                  </Button>
                )}
              </div>
            </CardHeader>
          </Card>
        
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
        </>
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
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
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
            
            <div className="border-t pt-4 mt-2">
              <Button
                onClick={runAutoFix}
                disabled={isAutoFixing}
                variant="default"
                className="w-full"
              >
                {isAutoFixing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Auto Fix...
                  </>
                ) : (
                  <>Auto Fix Database Issues</>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Attempts to automatically repair database tables and fix common issues.
              </p>
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
