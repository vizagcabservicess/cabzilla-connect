
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, WifiOff, Server, FileQuestion, Mail, ArrowRightCircle, ShieldAlert } from "lucide-react";

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
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|timeout/i.test(errorMessage);
  
  const isServerError = 
    /server|500|503|unavailable|internal server error/i.test(errorMessage);
  
  const is404Error = /404|not found/i.test(errorMessage);
  
  const isEmailError = 
    /email|mail|notification|failed to send/i.test(errorMessage);
    
  const isDatabaseError = 
    /database|db|query|sql|constraint|foreign key|insert|update|delete/i.test(errorMessage);

  const handleRetry = () => {
    console.log("Retrying after error...");
    
    // Clear any cached data that might be causing issues
    const cacheKeys = [
      'selectedCab', 'hourlyPackage', 'tourPackage', 
      'bookingDetails', 'cabFares', 'dropLocation',
      'pickupLocation', 'pickupDate', 'returnDate'
    ];
    
    cacheKeys.forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(`cached_${key}`);
    });
    
    // Also clear specific cache items
    localStorage.removeItem('cached_bookings');
    localStorage.removeItem('cached_metrics');
    
    if (onRetry) {
      onRetry();
    } else if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  // Pick the most appropriate icon
  const ErrorIcon = isNetworkError 
    ? WifiOff 
    : (isServerError 
        ? Server 
        : (is404Error 
            ? FileQuestion 
            : (isEmailError 
                ? Mail 
                : (isDatabaseError 
                    ? ShieldAlert
                    : AlertTriangle))));

  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center text-red-700">
          <ErrorIcon className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {isNetworkError 
              ? "Server Connection Failed" 
              : (isServerError 
                ? "Server Error" 
                : (is404Error 
                  ? "Resource Not Found" 
                  : (isEmailError
                    ? "Email Notification Issue"
                    : (isDatabaseError
                      ? "Database Error"
                      : "Error"))))}
          </AlertTitle>
          <AlertDescription>
            {isDatabaseError 
              ? "There was an issue with our database. Your booking information may not have been saved properly."
              : isNetworkError 
                ? "Unable to connect to the server. Please check your internet connection or try again later."
                : errorMessage}
          </AlertDescription>
        </Alert>
        
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
        
        {is404Error && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">This could be because:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The API endpoint or resource no longer exists</li>
              <li>The server's routing configuration has changed</li>
              <li>The URL is incorrectly formatted</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">Error details: {errorMessage}</p>
          </div>
        )}
        
        {isEmailError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">Email notification issues:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The booking was created but email notification failed</li>
              <li>Your booking is still valid and can be viewed in your dashboard</li>
              <li>The server's email configuration may need adjustment</li>
            </ul>
            <p className="mt-3 text-xs text-gray-500">Error details: {errorMessage}</p>
          </div>
        )}
        
        {isDatabaseError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">Database issues:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>There may be an issue with our database connection</li>
              <li>Your booking information might not have been saved correctly</li>
              <li>This is usually a temporary issue that our team is already working on</li>
              <li>Please try again in a few minutes or contact customer support</li>
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
          Retry Connection
        </Button>
        
        <Button 
          onClick={() => window.location.href = '/'} 
          variant="ghost" 
          className="gap-2"
        >
          Return to Home
        </Button>
        
        {!isNetworkError && (
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            variant="default" 
            className="gap-2 ml-auto"
          >
            <ArrowRightCircle className="h-4 w-4" />
            Go to Dashboard
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
