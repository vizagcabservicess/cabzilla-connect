
import React from 'react';
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
  Network
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

  // Open multiple direct API endpoints in new tabs to bypass potential issues
  const openDirectEndpoints = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    const timestamp = Date.now();
    
    const endpoints = [
      // Try the new direct outstation fares endpoint first
      `${baseUrl}/api/admin/direct-outstation-fares.php?_t=${timestamp}`,
      `${baseUrl}/api/admin/direct-vehicle-pricing.php?_t=${timestamp}`,
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
            <li>Use the retry button to clear all caches and try again</li>
            <li>Check if the server is online or experiencing issues</li>
            <li>Try reloading the page</li>
            <li>Log out and log back in to refresh authentication</li>
            <li>Try the Direct API Access button to bypass the application</li>
            <li>Contact your administrator if the issue persists</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mt-2">
          <div className="flex items-start">
            <Terminal className="h-4 w-4 mt-1 text-blue-500 mr-2" />
            <div className="text-xs">
              <p className="font-medium text-blue-800">Error Details:</p>
              <pre className="mt-1 text-xs text-blue-700 bg-blue-100 p-1 rounded overflow-auto max-h-20">
                {JSON.stringify({
                  endpoint: error?.['config']?.url || 'Unknown',
                  status: error?.['response']?.status || 'Unknown',
                  message: errorMessage
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>
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
          onClick={runDiagnostics} 
          variant="outline" 
          className="gap-2 border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800"
        >
          <Network className="h-4 w-4" />
          Run Diagnostics
        </Button>
        
        {showDirectLink && (
          <Button 
            onClick={openDirectEndpoints} 
            variant="outline" 
            className="gap-2 border-green-300 bg-green-50 hover:bg-green-100 text-green-800"
          >
            <Server className="h-4 w-4" />
            Direct API Access
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
