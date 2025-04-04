
import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Globe, Server, Network, ExternalLink, FileCog, Hammer, RefreshCcw, ServerCrash, DatabaseBackup } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { enableFallbackMode, forceEnableFallbackMode } from '@/utils/apiHelper';

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
      
      // Auto-enable fallback mode if direct API is unreachable
      toast.warning("Enabling fallback mode due to API connectivity issues");
      enableFallbackMode();
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
    toast.info("Activating fallback mode");
    forceEnableFallbackMode();
    
    toast.success("Fallback mode activated. System will use local storage.", {
      duration: 5000
    });
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex flex-col gap-2">
        <div className="font-medium">
          {message || "There was an issue retrieving the latest cab information."}
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>

          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={runDiagnostics}
                disabled={diagnosticsRunning}
                className="flex items-center gap-1"
              >
                <Network className={`h-3 w-3 ${diagnosticsRunning ? "animate-pulse" : ""}`} />
                {diagnosticsRunning ? "Checking..." : "Check Connection"}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    Admin Tools
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="grid gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={runEmergencyFix}
                    >
                      <DatabaseBackup className="h-4 w-4 mr-2" />
                      Enable Fallback Mode
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full justify-start text-red-600"
                      onClick={() => openDirectApi('fix-database.php')}
                    >
                      <FileCog className="h-4 w-4 mr-2" />
                      View Database Fix Script
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full justify-start" 
                      onClick={() => openDirectApi('db_setup.php')}
                    >
                      <Hammer className="h-4 w-4 mr-2" />
                      View DB Setup Script
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/admin/system-status'}
                    >
                      <ServerCrash className="h-4 w-4 mr-2" />
                      System Status Page
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
