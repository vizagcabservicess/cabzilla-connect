
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, Database, ShieldAlert, Terminal, Globe, ExternalLink } from "lucide-react";
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

  // Open the direct API endpoint in a new tab
  const openDirectEndpoint = () => {
    const endpoints = [
      'https://saddlebrown-oryx-227656.hostingersite.com/api/admin/outstation-fares-update.php',
      'https://saddlebrown-oryx-227656.hostingersite.com/api/admin/local-fares-update.php',
      'https://saddlebrown-oryx-227656.hostingersite.com/api/admin/airport-fares-update.php'
    ];
    
    // Open each endpoint in a new tab
    endpoints.forEach(endpoint => {
      window.open(endpoint, '_blank');
    });
    
    toast.info('Opened direct API endpoints in new tabs');
  };

  // Pick the most appropriate icon
  const ErrorIcon = isForbiddenError
    ? ShieldAlert 
    : (isServerError 
      ? Database 
      : AlertCircle);

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
            <li>Try accessing the endpoint directly (use the Direct API button)</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mt-2">
          <div className="flex items-start">
            <Terminal className="h-4 w-4 mt-1 text-blue-500 mr-2" />
            <div className="text-xs">
              <p className="font-medium text-blue-800">Data that wasn't updated:</p>
              <pre className="mt-1 text-xs text-blue-700 bg-blue-100 p-1 rounded overflow-auto max-h-20">
                {JSON.stringify({
                  endpoint: error?.['config']?.url || 'Unknown',
                  data: error?.['config']?.data ? JSON.parse(error['config'].data) : 'Unknown',
                  status: error?.['response']?.status || 'Unknown',
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
        
        {showDirectLink && (
          <Button 
            onClick={openDirectEndpoint} 
            variant="outline" 
            className="gap-2 border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800"
          >
            <ExternalLink className="h-4 w-4" />
            Open Direct API
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
