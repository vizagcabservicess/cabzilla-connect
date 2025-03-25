
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  RefreshCw, 
  WifiOff, 
  Server, 
  FileQuestion, 
  ShieldAlert, 
  Terminal,
  Wrench,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { fareService } from "@/services/fareService";

export interface ApiErrorFallbackProps {
  error: Error | string;
  resetErrorBoundary?: () => void;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function ApiErrorFallback({
  error,
  resetErrorBoundary,
  onRetry,
  title = "Connection Error",
  description
}: ApiErrorFallbackProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isExecutingFix, setIsExecutingFix] = useState(false);
  const [fixAttempted, setFixAttempted] = useState(false);
  const errorMessage = typeof error === "string" ? error : error.message;
  
  // Better error classification
  const isNetworkError = 
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|404|400|500|503|timeout/i.test(errorMessage);
  
  const isServerError = 
    /server|500|503|unavailable|internal server error/i.test(errorMessage);
  
  const is404Error = /404|not found/i.test(errorMessage);
  
  const isCorsError = 
    /cors|blocked by|access-control-allow-origin|preflight|options request/i.test(errorMessage);
    
  const isDatabaseError = 
    /database|db|sql|query|table|column|record|not found/i.test(errorMessage);

  const handleRetry = () => {
    console.log("Retrying after error...");
    
    // Show toast to indicate retry
    toast.info("Clearing caches and retrying...", {
      id: "retry-toast",
      duration: 2000
    });
    
    // Clear all caches
    fareService.clearCache();
    
    // Clear any cached data that might be causing issues
    const cacheKeys = [
      'selectedCab', 'hourlyPackage', 'tourPackage', 
      'bookingDetails', 'cabFares', 'dropLocation',
      'pickupLocation', 'pickupDate', 'returnDate',
      'calculatedFares', 'fareData', 'vehicleData',
      'tripDetails', 'distance', 'duration',
      'apiCache', 'apiResponse', 'authToken',
      'token', 'user', 'userData'
    ];
    
    cacheKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key} from storage:`, e);
      }
    });
    
    // Save timestamp to force refresh API version
    try {
      localStorage.setItem('forceApiRefresh', Date.now().toString());
      sessionStorage.setItem('forceApiRefresh', Date.now().toString());
    } catch (e) {
      console.warn('Failed to set forceApiRefresh:', e);
    }
    
    // Wait a moment before retrying to allow any pending operations to clear
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else if (resetErrorBoundary) {
        resetErrorBoundary();
      } else {
        window.location.reload();
      }
    }, 500);
  };

  // Apply advanced automatic fixes
  const applyAutomaticFixes = async () => {
    setIsExecutingFix(true);
    
    // Show progress toast
    toast.info("Applying automatic fixes...", {
      id: "auto-fix-toast",
      duration: 3000
    });
    
    try {
      console.log("Running advanced automatic fixes...");
      
      // 1. Clear all caches first
      fareService.clearCache();
      
      // 2. Fetch API version from environment
      const apiVersion = import.meta.env.VITE_API_VERSION || '1.0.50';
      localStorage.setItem('apiVersion', apiVersion);
      localStorage.setItem('apiVersionLastUpdated', Date.now().toString());
      
      // 3. Clear authentication tokens (JWT)
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      
      // 4. Set "useDirectApi" flag to prefer direct API endpoints
      localStorage.setItem('useDirectApi', 'true');
      sessionStorage.setItem('useDirectApi', 'true');
      
      // Show success toast on completion
      toast.success("Automatic fixes applied successfully", {
        id: "auto-fix-complete",
        duration: 3000
      });
      
      // Indicate fix was attempted
      setFixAttempted(true);
    } catch (error) {
      console.error("Error applying automatic fixes:", error);
      toast.error("Error applying automatic fixes", {
        id: "auto-fix-error",
        duration: 3000
      });
    } finally {
      setIsExecutingFix(false);
    }
  };

  // Pick the most appropriate icon
  const ErrorIcon = isCorsError 
    ? ShieldAlert 
    : (isNetworkError 
      ? WifiOff 
      : (isServerError 
        ? Server 
        : (is404Error 
          ? FileQuestion 
          : (isDatabaseError 
            ? Database 
            : AlertTriangle))));

  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center text-red-700">
          <ErrorIcon className="h-5 w-5 mr-2" />
          {isCorsError 
            ? "Server Access Blocked" 
            : (isDatabaseError 
              ? "Database Connection Error" 
              : title)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {isCorsError 
              ? "CORS Policy Error" 
              : (isNetworkError 
                ? "Server Connection Failed" 
                : (isServerError 
                  ? "Server Error" 
                  : (is404Error 
                    ? "Resource Not Found"
                    : (isDatabaseError
                      ? "Database Error"
                      : "Error"))))}
          </AlertTitle>
          <AlertDescription>
            {description || (isCorsError 
              ? "The browser blocked access to the server due to security policy (CORS). This usually requires changes on the server side."
              : (isNetworkError 
                ? "Unable to connect to the server. Please check your internet connection or try again later."
                : (isDatabaseError
                  ? "There was a problem with the database connection or query. The application will use fallback data."
                  : errorMessage)))}
          </AlertDescription>
        </Alert>
        
        {isCorsError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">What you can try:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Clear your browser cache and cookies</li>
              <li>Log out and log back in to refresh your authentication tokens</li>
              <li>Try from a different browser or internet connection</li>
              <li>Use the "Apply Automatic Fixes" button below</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
        )}
        
        {isNetworkError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">Possible reasons:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your internet connection may be unstable</li>
              <li>The server might be temporarily down</li>
              <li>The API endpoint may have changed</li>
              <li>There might be a firewall or network restriction</li>
            </ul>
          </div>
        )}
        
        {isServerError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">What you can try:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Wait a few minutes and try again</li>
              <li>Clear your browser cache and cookies</li>
              <li>Use the "Apply Automatic Fixes" button below</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>
        )}
        
        {isDatabaseError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">What you can try:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The application will use fallback sample data</li>
              <li>You can still continue using most features</li>
              <li>Try the "Apply Automatic Fixes" button below</li>
              <li>Contact support if you need to access actual database records</li>
            </ul>
          </div>
        )}

        <div className="mt-4 bg-blue-50 p-3 rounded-md border border-blue-200">
          <div className="flex items-start">
            <Terminal className="h-4 w-4 mt-1 text-blue-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-800">Automatic Recovery</p>
              <p className="text-xs text-blue-600 mt-1">
                The retry button below will:
              </p>
              <ul className="list-disc pl-5 mt-1 text-xs text-blue-600 space-y-0.5">
                <li>Clear your authentication tokens</li>
                <li>Clear cached data that might be causing issues</li>
                <li>Force a refresh of API version</li>
                <li>Reload the connection with a fresh state</li>
              </ul>
            </div>
          </div>
        </div>
        
        {showAdvanced && (
          <div className="mt-4 bg-gray-50 p-3 rounded-md border border-gray-200">
            <div className="flex items-start">
              <HelpCircle className="h-4 w-4 mt-1 text-gray-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-800">Error Details</p>
                <pre className="text-xs text-gray-600 bg-gray-100 p-2 mt-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(
                    {
                      message: errorMessage,
                      type: error instanceof Error ? error.constructor.name : typeof error,
                      timestamp: new Date().toISOString(),
                      apiVersion: import.meta.env.VITE_API_VERSION || 'unknown'
                    }, 
                    null, 
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 w-full">
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            className="gap-2 bg-white hover:bg-blue-50 border-blue-200"
          >
            <RefreshCw className="h-4 w-4" />
            {fixAttempted ? "Retry After Fix" : "Clear Cache & Retry"}
          </Button>
          
          <Button 
            onClick={applyAutomaticFixes} 
            variant="outline" 
            className="gap-2 bg-white hover:bg-amber-50 border-amber-200 text-amber-800"
            disabled={isExecutingFix}
          >
            {isExecutingFix ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Applying Fixes...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4" />
                Apply Automatic Fixes
              </>
            )}
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/'} 
            variant="ghost" 
            className="gap-2"
          >
            Return to Home
          </Button>
        </div>
        
        <Button 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          variant="ghost" 
          className="gap-2 w-full text-xs text-gray-500 hover:text-gray-700 mt-2"
          size="sm"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Hide Technical Details
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show Technical Details
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
