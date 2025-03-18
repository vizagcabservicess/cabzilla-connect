
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, WifiOff, Server, FileQuestion, ShieldAlert } from "lucide-react";

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
    
    cacheKeys.forEach(key => sessionStorage.removeItem(key));
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth_token');
    
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
            <p className="font-medium">Possible reasons:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Server configuration doesn't allow requests from this origin</li>
              <li>Missing CORS headers on the server response</li>
              <li>The API server may be temporarily down</li>
              <li>There might be a network issue blocking the connection</li>
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
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button 
          onClick={handleRetry} 
          variant="outline" 
          className="gap-2"
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
