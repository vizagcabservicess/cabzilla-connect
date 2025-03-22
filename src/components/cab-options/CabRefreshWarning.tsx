
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Globe, Server, Network, ExternalLink, FileCog } from 'lucide-react';
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
    
    // Try direct endpoints
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
  
  const runEmergencyFix = () => {
    // This is a last-resort function to try to reestablish database connection
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const endpoints = [
      'direct-outstation-fares.php',
      'direct-vehicle-pricing.php',
      'outstation-fares-update.php',
      'vehicle-pricing.php',
      'fares-update.php'
    ];
    
    toast.info('Attempting emergency reconnection to all API endpoints...');
    
    // Clear all caches first
    fareService.clearCache();
    
    // Try a HEAD request to each endpoint
    endpoints.forEach(endpoint => {
      const url = `${baseUrl}/api/admin/${endpoint}?emergency=true&_t=${Date.now()}`;
      
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
  
  return (
    <Alert variant="warning" className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-4">
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
                      className="text-blue-700"
                      onClick={() => openDirectApi('direct-outstation-fares.php')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Direct Outstation Fares
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
                      className="text-blue-700"
                      onClick={() => openDirectApi('outstation-fares-update.php')}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Outstation Fares Update
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
