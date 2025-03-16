
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";

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
  const isNetworkError = errorMessage.includes("Network") || 
                          errorMessage.includes("connection") ||
                          errorMessage.includes("ERR_NETWORK") ||
                          errorMessage.includes("ECONNABORTED");

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (resetErrorBoundary) {
      resetErrorBoundary();
    } else {
      window.location.reload();
    }
  };

  return (
    <Card className="w-full border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center text-red-700">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{isNetworkError ? "Server Connection Failed" : "Error"}</AlertTitle>
          <AlertDescription>
            {isNetworkError 
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
              <li>There might be a firewall or network restriction</li>
            </ul>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleRetry} 
          variant="outline" 
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      </CardFooter>
    </Card>
  );
}
