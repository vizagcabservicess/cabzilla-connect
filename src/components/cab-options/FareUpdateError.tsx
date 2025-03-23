
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, 
  RefreshCw, 
  Database, 
  ShieldAlert, 
  Terminal, 
  Globe, 
  ExternalLink,
  Server,
  FileCode,
  Wifi,
  ArrowUp,
  Network,
  Hammer,
  Wrench,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

interface FareUpdateErrorProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showDirectLink?: boolean;
}

export function FareUpdateError({
  error,
  onRetry,
  title = "Fare Update Failed",
  description,
  showDirectLink = true
}: FareUpdateErrorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const errorMessage = typeof error === "string" ? error : error.message;
  
  // Error classification
  const isServerError = 
    /500|503|Internal Server Error|unavailable/i.test(errorMessage);
  
  const isForbiddenError = 
    /403|401|forbidden|unauthorized|permission|access denied/i.test(errorMessage);
  
  const isNetworkError = 
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|404|timeout/i.test(errorMessage);
  
  const handleRetry = () => {
    console.log("Retrying fare update after error...");
    
    // Show toast
    toast.info('Clearing all caches and refreshing...', {
      id: 'clearing-cache',
      duration: 2000
    });
    
    // Clear all caches and create a forced request config
    const forceConfig = fareService.getForcedRequestConfig();
    console.log('Using forced request config for retry:', forceConfig);
    
    // Wait a moment before retrying
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        // If no handler provided, reload the page
        window.location.reload();
      }
    }, 800);
  };

  // Comprehensive fix attempt
  const runComprehensiveFix = async () => {
    setIsFixing(true);
    toast.info('Applying comprehensive API fixes...', {
      id: 'comprehensive-fix',
      duration: 3000
    });
    
    try {
      console.log('Running comprehensive API fixes...');
      
      // 1. Clear all caches
      fareService.clearCache();
      
      // 2. Force API version update
      const timestamp = Date.now();
      localStorage.setItem('apiVersionForced', timestamp.toString());
      sessionStorage.setItem('apiVersionForced', timestamp.toString());
      
      // 3. Set direct API access flag
      localStorage.setItem('useDirectApi', 'true');
      sessionStorage.setItem('useDirectApi', 'true');
      
      // 4. Clear all authentication tokens
      const authKeys = ['token', 'authToken', 'refreshToken', 'user', 'userData'];
      authKeys.forEach(key => {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {}
      });
      
      // 5. Ping the direct fare update endpoint
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
      
      try {
        const response = await fetch(`${baseUrl}/api/direct-fare-update?_t=${timestamp}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...fareService.getBypassHeaders()
          },
          body: JSON.stringify({ 
            test: true, 
            timestamp,
            action: 'comprehensive-fix'
          })
        });
        
        if (response.ok) {
          console.log('Direct fare endpoint is reachable');
        }
      } catch (err) {
        console.warn('Could not reach direct fare endpoint');
      }
      
      // Success notification
      toast.success('Comprehensive fixes applied', {
        id: 'comprehensive-fix-success'
      });
    } catch (err) {
      console.error('Error applying comprehensive fixes:', err);
      toast.error('Error applying fixes', {
        id: 'comprehensive-fix-error'
      });
    } finally {
      setIsFixing(false);
    }
  };

  // Direct connection test
  const testDirectConnection = () => {
    toast.info('Testing direct server connection...');
    
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    
    // Test the ultra-simple endpoint directly
    fetch(`${baseUrl}/api/direct-fare-update?test=true&_t=${timestamp}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...fareService.getBypassHeaders()
      },
      body: JSON.stringify({ test: 'connection', timestamp })
    })
    .then(async response => {
      if (response.ok) {
        toast.success(`Server test succeeded!`);
      } else {
        toast.error(`Server error: ${response.status}`);
      }
    })
    .catch(err => {
      toast.error(`Connection test failed: ${err.message}`);
    });
  };

  // Open multiple direct API endpoints in new tabs to bypass potential issues
  const openDirectEndpoints = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    
    const endpoints = [
      // Try the direct endpoints first (most reliable)
      `${baseUrl}/api/direct-fare-update?_t=${timestamp}`,
      `${baseUrl}/api/direct-outstation-fares?_t=${timestamp}`,
      `${baseUrl}/api/direct-local-fares?_t=${timestamp}`,
      `${baseUrl}/api/direct-airport-fares?_t=${timestamp}`,
      
      // Specialized endpoints
      `${baseUrl}/api/admin/outstation-fares-update.php?_t=${timestamp}`,
      `${baseUrl}/api/admin/local-fares-update.php?_t=${timestamp}`,
      `${baseUrl}/api/admin/airport-fares-update.php?_t=${timestamp}`
    ];
    
    // Open all endpoint URLs in new tabs
    endpoints.forEach(endpoint => {
      const url = new URL(endpoint);
      url.searchParams.append('test', 'true');
      url.searchParams.append('_', timestamp.toString());
      
      window.open(url.toString(), '_blank');
    });
    
    toast.info('Opened direct API endpoints in new tabs');
  };

  // Diagnose connection issues
  const runDiagnostics = () => {
    toast.info('Running connection diagnostics...');
    
    // Try ping to base URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    
    console.log('Running connection diagnostics');
    
    // Test with basic fetch to avoid CORS
    fetch(`${baseUrl}/api/?_t=${timestamp}`, { 
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    })
    .then(() => {
      console.log('Server reached with no-cors ping');
      toast.success('Server is reachable');
    })
    .catch(err => {
      console.error('Server ping failed:', err);
      toast.error('Server is unreachable');
    });
    
    // Clear all caches
    fareService.clearCache();
  };

  // Pick the most appropriate icon
  const ErrorIcon = isForbiddenError
    ? ShieldAlert 
    : (isServerError 
      ? Database 
      : (isNetworkError ? Wifi : AlertCircle));

  return (
    <Card className="w-full border-red-200 bg-red-50 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-red-700 text-base">
          <ErrorIcon className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <Alert variant="destructive" className="mb-1">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isForbiddenError 
              ? "Access Denied" 
              : (isServerError 
                ? "Server Error" 
                : (isNetworkError 
                  ? "Network Error" 
                  : "Update Failed"))}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {description || (isForbiddenError 
              ? "You don't have permission to update fares. This might be an authentication issue."
              : (isServerError 
                ? "The server encountered an error while processing your request. This may be temporary."
                : (isNetworkError
                  ? "Unable to connect to the fare update server. Please check your connection."
                  : errorMessage)))}
          </AlertDescription>
        </Alert>

        <div className="text-sm space-y-2">
          <p className="font-medium text-gray-700">Try the following:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            <li>Use the comprehensive fix button to solve common API connection issues</li>
            <li>Try direct API access to bypass connection issues</li>
            <li>Clear browser cache and authentication tokens</li>
            <li>Try logging out and back in</li>
            <li>Contact support if all solutions fail</li>
          </ul>
        </div>
        
        {showAdvanced && (
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mt-2">
            <div className="flex items-start">
              <Terminal className="h-4 w-4 mt-1 text-blue-500 mr-2" />
              <div className="text-xs">
                <p className="font-medium text-blue-800">Error Details:</p>
                <pre className="mt-1 text-xs text-blue-700 bg-blue-100 p-1 rounded overflow-auto max-h-20">
                  {JSON.stringify({
                    endpoint: error?.['config']?.url || 'Unknown',
                    status: error?.['response']?.status || 'Unknown',
                    message: errorMessage,
                    apiVersion: import.meta.env.VITE_API_VERSION || 'Unknown'
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex flex-wrap gap-3">
        <Button 
          onClick={handleRetry} 
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Clear Cache & Retry
        </Button>
        
        <Button
          onClick={runComprehensiveFix}
          variant="outline"
          className="gap-2 border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800"
          disabled={isFixing}
        >
          {isFixing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Applying Fixes...
            </>
          ) : (
            <>
              <Wrench className="h-4 w-4" />
              Comprehensive Fix
            </>
          )}
        </Button>
        
        {showDirectLink && (
          <>
            <Button 
              onClick={testDirectConnection} 
              variant="outline" 
              className="gap-2 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800"
            >
              <Network className="h-4 w-4" />
              Test Connection
            </Button>
            
            <Button 
              onClick={openDirectEndpoints} 
              variant="outline" 
              className="gap-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-800"
            >
              <Server className="h-4 w-4" />
              Direct API Access
            </Button>
          </>
        )}
        
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="ghost"
          size="sm"
          className="w-full text-xs text-gray-500 mt-1"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide Technical Details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show Technical Details
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
