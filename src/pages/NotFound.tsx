
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft, RefreshCw, FileSearch, ExternalLink, WifiOff } from "lucide-react";
import { ApiErrorFallback } from "@/components/ApiErrorFallback";
import { toast } from "sonner";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isApiPath, setIsApiPath] = useState(false);
  const [isBookingPath, setIsBookingPath] = useState(false);
  const [testedEndpoints, setTestedEndpoints] = useState<{[key: string]: boolean}>({});
  
  useEffect(() => {
    // Show a toast notification for 404 error
    toast.error("Page Not Found", {
      description: `The requested path ${location.pathname} does not exist`,
      duration: 5000,
    });
    
    // Log detailed error information for debugging
    console.error(
      "404 Error: User attempted to access non-existent route:",
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
        key: location.key,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
    );
    
    // Check if this is likely an API path that's failing
    const apiPathRegex = /\/(api|receipt)\//i;
    const bookingPathRegex = /\/(booking|book|edit|cancel)\//i;
    
    setIsApiPath(apiPathRegex.test(location.pathname));
    setIsBookingPath(bookingPathRegex.test(location.pathname));
    
    // Automatically test API endpoints if this is an API path
    if (apiPathRegex.test(location.pathname) || bookingPathRegex.test(location.pathname)) {
      testApiEndpoints();
    }
  }, [location]);

  const testApiEndpoints = async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com/api';
    const results: {[key: string]: boolean} = {};
    
    // Test essential API endpoints
    const endpoints = [
      '/login',
      '/signup',
      '/user/dashboard',
      '/booking/123/edit',
      '/receipt/123',
      '/booking/cancel/123'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${apiBaseUrl}${endpoint}`, {
          method: 'OPTIONS',
          headers: {
            'Accept': 'application/json',
          }
        });
        results[endpoint] = response.ok;
      } catch (error) {
        results[endpoint] = false;
      }
    }
    
    setTestedEndpoints(results);
    
    // Count failures
    const failCount = Object.values(results).filter(result => !result).length;
    if (failCount > 3) {
      toast.error("API Connection Issues", {
        description: `${failCount} of ${endpoints.length} API endpoints are inaccessible`,
        duration: 7000,
      });
    }
  };

  const extractBookingId = () => {
    // Try to extract a booking ID from the URL if it contains one
    const matches = location.pathname.match(/\/([0-9]+)(\/|$)/);
    return matches ? matches[1] : null;
  };

  const bookingId = extractBookingId();

  const clearBrowserCache = () => {
    // Clear local storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) {
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    // Reload page
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-red-100">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <CardTitle className="flex items-center text-red-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {isApiPath ? "API Error" : (isBookingPath ? "Booking Not Found" : "Page Not Found")}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6">
          {isApiPath || isBookingPath ? (
            <ApiErrorFallback 
              error={`404 Not Found: The ${isApiPath ? "API endpoint" : "booking"} "${location.pathname}" could not be found. ${
                bookingId ? `Booking ID ${bookingId} may be invalid or have been deleted.` : 
                "This might indicate a server configuration issue or an invalid URL."
              }`}
              title={isApiPath ? "API Endpoint Not Found" : "Booking Not Found"}
              onRetry={() => window.location.reload()}
            />
          ) : (
            <>
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>404 Error</AlertTitle>
                <AlertDescription>
                  The page you're looking for doesn't exist or was moved.
                </AlertDescription>
              </Alert>
              
              <div className="text-sm text-gray-600 mt-4">
                <p><strong>Path:</strong> {location.pathname}</p>
                <p className="mt-2">
                  If you believe this is an error, please try refreshing the page or
                  navigate back to the home page.
                </p>
              </div>
            </>
          )}
          
          {Object.keys(testedEndpoints).length > 0 && (
            <div className="mt-6 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium mb-2 flex items-center">
                <WifiOff className="h-3.5 w-3.5 mr-1.5" />
                API Connectivity Test Results
              </h4>
              <ul className="text-xs space-y-1">
                {Object.entries(testedEndpoints).map(([endpoint, success]) => (
                  <li key={endpoint} className="flex justify-between">
                    <span>{endpoint}</span>
                    <span className={success ? "text-green-600" : "text-red-600"}>
                      {success ? "✓ OK" : "✗ Failed"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-wrap gap-3 border-t border-gray-100 pt-4">
          <Button 
            onClick={() => navigate('/')} 
            variant="default"
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            Go to Home
          </Button>
          
          {isBookingPath && (
            <Button 
              onClick={() => navigate('/dashboard')} 
              variant="default"
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Bookings
            </Button>
          )}
          
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={clearBrowserCache} 
            variant="secondary"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Cache & Reload
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NotFound;
