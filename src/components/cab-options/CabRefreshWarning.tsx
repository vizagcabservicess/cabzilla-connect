
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Globe, Server, Network, ExternalLink, FileCog, Hammer, RefreshCcw, ServerCrash, DatabaseBackup } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  syncVehicleTables, 
  clearFareCache, 
  getBypassHeaders,
  getForcedRequestConfig,
  fareService
} from '@/lib/index';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CabRefreshWarningProps {
  message?: string;
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export function CabRefreshWarning({ message, onRefresh, isAdmin = false }: CabRefreshWarningProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [syncingTables, setSyncingTables] = useState(false);
  const [testingDirectDb, setTestingDirectDb] = useState(false);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Show toast that we're clearing cache
    toast.info('Clearing all caches and refreshing...', {
      id: 'clearing-cache',
      duration: 2000
    });
    
    // Clear all caches first
    clearFareCache();
    
    // Log the forced request config for debugging
    console.log('Using forced request config:', getForcedRequestConfig());
    
    // Wait a moment for caches to clear
    setTimeout(() => {
      // Then call the onRefresh handler if provided
      if (onRefresh) {
        onRefresh();
      } else {
        // If no handler provided, reload the page
        window.location.reload();
      }
      
      setIsRefreshing(false);
    }, 800);
  };
  
  const runDiagnostics = () => {
    setDiagnosticsRunning(true);
    toast.info('Running connection diagnostics...');
    
    // Try ping to API
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    
    // Test with basic fetch to avoid CORS issues
    fetch(`${baseUrl}/api/?_t=${timestamp}`, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    })
    .then(() => {
      console.log('API base URL is reachable');
      toast.success('API server is reachable');
    })
    .catch(err => {
      console.error('API server unreachable:', err);
      toast.error('API server is unreachable');
    })
    .finally(() => {
      setDiagnosticsRunning(false);
    });
    
    // Try unified direct endpoint
    const directEndpoint = `${baseUrl}/api/admin/direct-fare-update.php?test=1&_t=${timestamp}`;
    fetch(directEndpoint, {
      method: 'GET',
      headers: {
        ...fareService.getBypassHeaders(),
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        console.log('Direct API endpoint is accessible');
        toast.success('Direct fare API is accessible');
      } else {
        console.error('Direct API endpoint returned status:', response.status);
        toast.error(`Direct fare API returned ${response.status}`);
      }
    })
    .catch(err => {
      console.error('Could not reach direct API endpoint:', err);
      toast.error('Could not reach direct fare API');
    });
  };
  
  const openDirectApi = (endpoint: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    const url = `${baseUrl}/api/admin/${endpoint}?_t=${timestamp}`;
    
    window.open(url, '_blank');
    toast.info(`Opened ${endpoint} endpoint`);
  };
  
  const runEmergencyFix = () => {
    // This is a last-resort function to try to reestablish database connection
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    
    toast.info('Attempting emergency reconnection to API endpoint...');
    
    // Clear all caches first
    clearFareCache();
    
    // Try the unified direct-fare-update endpoint
    const url = `${baseUrl}/api/admin/direct-fare-update.php?emergency=true&initialize=true&_t=${Date.now()}`;
    
    fetch(url, {
      method: 'GET',
      headers: fareService.getBypassHeaders()
    })
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        toast.warning(`Emergency init received status: ${response.status}`);
        throw new Error(`Status ${response.status}`);
      }
    })
    .then(data => {
      console.log('Emergency reconnection response:', data);
      toast.success('Emergency reconnection successful');
    })
    .catch(err => {
      console.error('Emergency reconnection failed:', err);
      toast.error('Emergency reconnection failed');
    });
  };
  
  const runServerchecks = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    toast.info('Testing direct server connection...');
    
    // Test our unified direct endpoint
    fetch(`${baseUrl}/api/admin/direct-fare-update.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...fareService.getBypassHeaders()
      },
      body: JSON.stringify({ test: 'connection', _t: Date.now() })
    })
    .then(async response => {
      if (response.ok) {
        const text = await response.text();
        toast.success(`Server responded: ${text.substring(0, 50)}...`);
      } else {
        toast.error(`Server error: ${response.status} ${response.statusText}`);
      }
    })
    .catch(err => {
      toast.error(`Connection failed: ${err.message}`);
    });
  };
  
  const runTableSync = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    setSyncingTables(true);
    toast.info('Syncing database tables...');
    
    fetch(`${baseUrl}/api/admin/sync-local-fares.php?_t=${Date.now()}`, {
      method: 'GET',
      headers: fareService.getBypassHeaders()
    })
    .then(async response => {
      if (response.ok) {
        const data = await response.json();
        console.log('Sync response:', data);
        toast.success('Tables synchronized successfully');
      } else {
        const text = await response.text();
        console.error('Sync failed:', text);
        toast.error(`Sync failed: ${response.status}`);
      }
    })
    .catch(err => {
      console.error('Sync error:', err);
      toast.error(`Sync error: ${err.message}`);
    })
    .finally(() => {
      setSyncingTables(false);
    });
  };
  
  // New function to test direct database connection
  const testDirectDatabaseConnection = () => {
    setTestingDirectDb(true);
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    toast.info('Testing direct database connection...');
    
    // Create a test connection URL with debug parameters
    const testUrl = `${baseUrl}/api/admin/direct-fare-update.php?test_db=true&debug=true&_t=${Date.now()}`;
    
    fetch(testUrl, {
      method: 'GET',
      headers: {
        ...fareService.getBypassHeaders(),
        'X-Debug-Mode': 'true',
        'X-Test-DB-Connection': 'true'
      }
    })
    .then(async response => {
      const text = await response.text();
      console.log('Database connection test response:', text);
      
      if (response.ok) {
        toast.success('Database connection successful!');
      } else {
        toast.error(`Database connection failed: ${response.status}`);
      }
    })
    .catch(err => {
      console.error('Database connection test error:', err);
      toast.error(`Database test error: ${err.message}`);
    })
    .finally(() => {
      setTestingDirectDb(false);
    });
  };
  
  return (
    <Alert variant="destructive" className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-4">
      <div className="flex flex-col w-full">
        <div className="flex items-start mb-2">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-yellow-600" />
          <div>
            {message || "Unable to load updated vehicle data. Using cached data. Some features may not work properly."}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-1">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-yellow-400 bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Clear Cache & Refresh'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="border-blue-400 bg-blue-100 hover:bg-blue-200 text-blue-800"
            onClick={runDiagnostics}
            disabled={diagnosticsRunning}
          >
            <Network className={`h-3.5 w-3.5 mr-1 ${diagnosticsRunning ? 'animate-pulse' : ''}`} />
            {diagnosticsRunning ? 'Running...' : 'Diagnose Connection'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="border-green-400 bg-green-100 hover:bg-green-200 text-green-800"
            onClick={runTableSync}
            disabled={syncingTables}
          >
            <RefreshCcw className={`h-3.5 w-3.5 mr-1 ${syncingTables ? 'animate-spin' : ''}`} />
            {syncingTables ? 'Syncing...' : 'Sync Tables'}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="border-purple-400 bg-purple-100 hover:bg-purple-200 text-purple-800"
            onClick={testDirectDatabaseConnection}
            disabled={testingDirectDb}
          >
            <DatabaseBackup className={`h-3.5 w-3.5 mr-1 ${testingDirectDb ? 'animate-spin' : ''}`} />
            {testingDirectDb ? 'Testing...' : 'Test DB Connection'}
          </Button>
          
          {isAdmin && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-emerald-400 bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                  >
                    <Server className="h-3.5 w-3.5 mr-1" />
                    Direct API Access
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="grid gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-green-700"
                      onClick={() => openDirectApi('direct-fare-update.php')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Unified Direct API
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-700"
                      onClick={() => openDirectApi('direct-outstation-fares.php?tripType=outstation')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Outstation Fares API
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-700"
                      onClick={() => openDirectApi('direct-airport-fares.php?tripType=airport')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Airport Fares API
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-700"
                      onClick={() => openDirectApi('direct-local-fares.php?tripType=local')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Local Fares API
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-orange-700"
                      onClick={runEmergencyFix}
                    >
                      <FileCog className="h-3.5 w-3.5 mr-1" />
                      Run Emergency Fix
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-purple-700"
                      onClick={runServerchecks}
                    >
                      <Hammer className="h-3.5 w-3.5 mr-1" />
                      Test Direct Connection
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-indigo-700"
                      onClick={runTableSync}
                    >
                      <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                      Sync Database Tables
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-red-700"
                      onClick={testDirectDatabaseConnection}
                    >
                      <ServerCrash className="h-3.5 w-3.5 mr-1" />
                      Test Database Connection
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>
    </Alert>
  );
}
