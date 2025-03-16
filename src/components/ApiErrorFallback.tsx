
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw, WifiOff, Server, FileQuestion, Mail, ArrowLeft, Home, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const errorMessage = typeof error === "string" ? error : error.message;
  
  // Enhanced error classification for better diagnosis
  const isNetworkError = 
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|timeout/i.test(errorMessage);
  
  const isServerError = 
    /server|500|503|unavailable|internal server error/i.test(errorMessage);
  
  const is404Error = 
    /404|not found/i.test(errorMessage);
  
  const isEmailError = 
    /email|mail|notification|smtp/i.test(errorMessage);
    
  const isAuthError =
    /auth|unauthorized|unauthenticated|login|401/i.test(errorMessage);

  // Extract URL from error message if present
  const urlMatch = errorMessage.match(/(https?:\/\/[^\s]+)/);
  const failedUrl = urlMatch ? urlMatch[0] : null;

  const handleRetry = () => {
    console.log("Retrying after error...", errorMessage);
    
    // Clear any cached data that might be causing issues
    const cacheKeys = [
      'selectedCab', 'hourlyPackage', 'tourPackage', 
      'bookingDetails', 'cabFares', 'dropLocation',
      'pickupLocation', 'pickupDate', 'returnDate',
      'authToken', 'userId', 'userProfile'
    ];
    
    cacheKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      } catch (e) {
        console.error("Error clearing cache:", e);
      }
    });
    
    // Try to clear the browser's cache for API requests
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    if (onRetry) {
      onRetry();
    } else if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  // Log detailed information about the error for server-side debugging
  console.error("API Error Details:", {
    errorMessage,
    errorType: is404Error ? "404 Not Found" : 
              isNetworkError ? "Network Error" : 
              isServerError ? "Server Error" : 
              isEmailError ? "Email Error" :
              isAuthError ? "Authentication Error" : "Unknown Error",
    failedUrl,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    location: window.location.href
  });

  // Pick the most appropriate icon
  const ErrorIcon = isEmailError 
    ? Mail 
    : (isNetworkError 
      ? WifiOff 
      : (isServerError ? Server : (is404Error ? FileQuestion : AlertTriangle)));

  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center text-red-700">
          <ErrorIcon className="h-5 w-5 mr-2" />
          {isEmailError ? "Email Notification Error" : 
           is404Error ? "404 Not Found Error" : 
           isAuthError ? "Authentication Error" : title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {isEmailError 
              ? "Email Notification Failed" 
              : (isNetworkError 
                ? "Server Connection Failed" 
                : (isServerError 
                  ? "Server Error" 
                  : (is404Error 
                    ? "Resource Not Found" 
                    : (isAuthError 
                      ? "Authentication Required"
                      : "Error"))))}
          </AlertTitle>
          <AlertDescription>
            {isEmailError 
              ? "The system failed to send email notifications. Your booking was processed, but confirmation emails could not be sent."
              : (is404Error
                ? `The requested endpoint ${failedUrl ? `(${failedUrl})` : ''} could not be found. This may be a server configuration issue.`
                : (isNetworkError 
                  ? "Unable to connect to the server. Please check your internet connection or try again later."
                  : (isAuthError
                    ? "You need to be logged in to access this feature. Please log in and try again."
                    : errorMessage)))}
          </AlertDescription>
        </Alert>
        
        {is404Error && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">Debug Information:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Failed URL: {failedUrl || 'Unknown'}</li>
              <li>Current page: {window.location.pathname}</li>
              <li>Error message: {errorMessage}</li>
              <li>Timestamp: {new Date().toLocaleString()}</li>
            </ul>
            <p className="font-medium mt-4">Possible solutions:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Check that the URL is correct</li>
              <li>Try a different booking ID if you're viewing a specific booking</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try refreshing the page or navigating back to the dashboard</li>
              <li>Contact support if this issue persists</li>
            </ul>
          </div>
        )}
        
        {isEmailError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">What you can try:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Check your email address is correct in your profile</li>
              <li>Contact support to verify your booking details</li>
              <li>Try the operation again later</li>
            </ul>
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
          </div>
        )}
        
        {isAuthError && (
          <div className="text-sm text-gray-700 mt-4">
            <p className="font-medium">What you can try:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Log in again as your session may have expired</li>
              <li>Check that you have permission to access this resource</li>
              <li>Try clearing browser cookies and logging in again</li>
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button 
          onClick={handleRetry} 
          variant="default" 
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
        
        {isAuthError && (
          <Button 
            onClick={() => navigate('/login')} 
            variant="default" 
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Login
          </Button>
        )}
        
        <Button 
          onClick={() => navigate('/')} 
          variant="outline" 
          className="gap-2"
        >
          <Home className="h-4 w-4" />
          Go to Home
        </Button>
        
        <Button 
          onClick={() => navigate(-1)} 
          variant="ghost" 
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </Button>
      </CardFooter>
    </Card>
  );
}
