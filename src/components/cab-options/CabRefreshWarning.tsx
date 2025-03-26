
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Globe, Server, Network, ExternalLink, FileCog, Hammer, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fareService } from '@/services/fareService';
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
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Show toast that we're clearing cache
    toast.info('Clearing all caches and refreshing...', {
      id: 'clearing-cache',
      duration: 2000
    });
    
    // Clear all caches first
    fareService.clearCache();
    
    // Force API version update
    const timestamp = Date.now();
    localStorage.setItem('apiVersionForced', timestamp.toString());
    sessionStorage.setItem('apiVersionForced', timestamp.toString());
    
    // Set direct API access flag
    localStorage.setItem('useDirectApi', 'true');
    sessionStorage.setItem('useDirectApi', 'true');
    localStorage.setItem('useEmergencyEndpoints', 'true');
    sessionStorage.setItem('useEmergencyEndpoints', 'true');
    
    // Log the forced request config for debugging
    console.log('Using forced request config:', fareService.getForcedRequestConfig());
    
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
    
    // Try EMERGENCY endpoints
    const emergencyEndpoint = `${baseUrl}/api/emergency/outstation-fares?test=1&_t=${timestamp}`;
    fetch(emergencyEndpoint, {
      method: 'GET',
      headers: {
        ...fareService.getBypassHeaders(),
        'Accept': 'application/json'
      }
    })
    .then(response => {
      if (response.ok) {
        console.log('Emergency API endpoint is accessible');
        toast.success('Emergency fare API is accessible');
      } else {
        console.error('Emergency API endpoint returned status:', response.status);
        toast.error(`Emergency fare API returned ${response.status}`);
      }
    })
    .catch(err => {
      console.error('Could not reach emergency API endpoint:', err);
      toast.error('Could not reach emergency fare API');
    });
    
    // Also try direct endpoints
    const directEndpoint = `${baseUrl}/api/admin/direct-outstation-fares.php?test=1&_t=${timestamp}`;
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
  
  const openEmergencyEndpoint = (endpoint: string) => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    const url = `${baseUrl}/api/emergency/${endpoint}?_t=${timestamp}`;
    
    window.open(url, '_blank');
    toast.info(`Opened emergency ${endpoint} endpoint`);
  };
  
  const runEmergencyFix = () => {
    // This is a last-resort function to try to reestablish database connection
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const emergencyEndpoints = [
      'emergency/init-database',
      'emergency/outstation-fares',
      'emergency/airport-fares'
    ];
    
    toast.info('Attempting emergency reconnection to all API endpoints...');
    
    // Clear all caches first
    fareService.clearCache();
    
    // Try a HEAD request to each endpoint
    emergencyEndpoints.forEach(endpoint => {
      const url = `${baseUrl}/api/${endpoint}?emergency=true&_t=${Date.now()}`;
      
      fetch(url, {
        method: 'HEAD',
        headers: fareService.getBypassHeaders(),
        mode: 'no-cors'
      }).catch(err => {
        console.log(`Emergency ping to ${endpoint} completed`);
      });
    });
    
    toast.success('Emergency reconnection attempt completed');
  };
  
  const runServerchecks = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    toast.info('Testing direct server connection...');
    
    // Test the most reliable direct endpoint
    fetch(`${baseUrl}/api/emergency/outstation-fares`, {
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
            className="border-red-400 bg-red-100 hover:bg-red-200 text-red-800"
            onClick={runEmergencyFix}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Run Emergency Fix
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
                    <p className="text-sm font-semibold mb-1">Emergency Endpoints:</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-700"
                      onClick={() => openEmergencyEndpoint('outstation-fares')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Emergency Outstation Fares
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-700"
                      onClick={() => openEmergencyEndpoint('airport-fares')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Emergency Airport Fares
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-700"
                      onClick={() => openEmergencyEndpoint('init-database')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Emergency Init Database
                    </Button>
                    
                    <p className="text-sm font-semibold mt-2 mb-1">Regular Endpoints:</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-green-700"
                      onClick={() => openDirectApi('direct-outstation-fares.php')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Ultra-Simple Direct API
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-700"
                      onClick={() => openDirectApi('direct-vehicle-pricing.php')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Direct Vehicle Pricing
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
