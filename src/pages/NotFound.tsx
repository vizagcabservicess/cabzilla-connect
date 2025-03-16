
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, ArrowLeft, RefreshCw, FileSearch } from "lucide-react";
import { ApiErrorFallback } from "@/components/ApiErrorFallback";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isApiPath, setIsApiPath] = useState(false);
  
  useEffect(() => {
    // Log detailed error information for debugging
    console.error(
      "404 Error: User attempted to access non-existent route:",
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
        state: location.state,
        key: location.key
      }
    );
    
    // Check if this is likely an API path that's failing
    const apiPathRegex = /\/(api|booking|receipt|edit|cancel)\//i;
    setIsApiPath(apiPathRegex.test(location.pathname));
    
  }, [location]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-red-100">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <CardTitle className="flex items-center text-red-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Page Not Found
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-6">
          {isApiPath ? (
            <ApiErrorFallback 
              error={`404 Not Found: The API endpoint "${location.pathname}" could not be found. This might indicate a server configuration issue.`}
              title="API Endpoint Not Found"
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
          
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="ghost"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Page
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default NotFound;
