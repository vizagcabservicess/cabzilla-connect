
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, WifiOff, Server, FileQuestion, ShieldAlert, Terminal } from "lucide-react";

interface ApiErrorFallbackProps {
  error: Error | string;
  resetErrorBoundary?: () => void;
  onRetry?: () => void;
  title?: string;
}

export function ApiErrorFallback({
  error,
  resetErrorBoundary,
  onRetry,
  title = "Connection Error"
}: ApiErrorFallbackProps) {
  const errorMessage = typeof error === "string" ? error : error.message;
  
  // Better error classification
  const isNetworkError = 
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|404|400|500|503|timeout/i.test(errorMessage);
  
  const isServerError = 
    /server|500|503|unavailable|internal server error/i.test(errorMessage);
  
  const is404Error = /404|not found/i.test(errorMessage);
  
  const isCorsError = 
    /cors|blocked by|access-control-allow-origin|preflight|options request/i.test(errorMessage);

  const handleRetry = () => {
    console.log("Retrying after error...");
    
    // Clear any cached data that might be causing issues
    const cacheKeys = [
      'selectedCab', 'hourlyPackage', 'tourPackage', 
      'bookingDetails', 'cabFares', 'dropLocation',
      'pickupLocation', 'pickupDate', 'returnDate'
    ];
    
    cacheKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove ${key} from sessionStorage:`, e);
      }
    });
    
    // Always clear authentication tokens on retry for CORS/network errors
    if (isNetworkError || isCorsError) {
      try {
        localStorage.removeItem('authToken');
        localStorage.removeItem('auth_token');
        console.log('Authentication tokens cleared for clean retry');
      } catch (e) {
        console.warn('Failed to clear authentication tokens:', e);
      }
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

  // Pick the most appropriate icon
  const ErrorIcon = isCorsError 
    ? ShieldAlert 
    : (isNetworkError 
      ? WifiOff 
      : (isServerError ? Server : (is404Error ? FileQuestion : AlertTriangle)));

  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center text-red-700">
          <ErrorIcon className="h-5 w-5 mr-2" />
          {isCorsError ? "Server Access Blocked" : title}
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
                    : "Error")))}
          </AlertTitle>
          <AlertDescription>
            {isCorsError 
              ? "The browser blocked access to the server due to security policy (CORS). This usually requires changes on the server side."
              : (isNetworkError 
                ? "Unable to connect to the server. Please check your internet connection or try again later."
                : errorMessage)}
          </AlertDescription>
        </Alert>
        
        {isCorsError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">What you can try:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Clear your browser cache and cookies</li>
              <li>Log out and log back in to refresh your authentication tokens</li>
              <li>Try from a different browser or internet connection</li>
              <li>Contact support if the problem persists</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">Error details: {errorMessage}</p>
          </div>
        )}
        
        {isNetworkError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">Possible reasons:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your internet connection may be unstable</li>
              <li>The server might be temporarily down</li>
              <li>The API endpoint may have changed or is incorrect</li>
              <li>There might be a firewall or network restriction</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">Error details: {errorMessage}</p>
          </div>
        )}
        
        {isServerError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">What you can try:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Wait a few minutes and try again</li>
              <li>Clear your browser cache and cookies</li>
              <li>Contact support if the problem persists</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">Error details: {errorMessage}</p>
          </div>
        )}

        {/* Add a section for checking API status */}
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
                <li>Reload the connection with a fresh state</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button 
          onClick={handleRetry} 
          variant="outline" 
          className="gap-2 bg-white hover:bg-blue-50 border-blue-200"
        >
          <RefreshCw className="h-4 w-4" />
          {isCorsError ? "Clear Tokens & Retry" : "Retry Connection"}
        </Button>
        
        <Button 
          onClick={() => window.location.href = '/'} 
          variant="ghost" 
          className="gap-2"
        >
          Return to Home
        </Button>
      </CardFooter>
    </Card>
  );
}
