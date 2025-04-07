
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface FareUpdateErrorProps {
  error: Error;
  onRetry: () => void;
  isAdmin?: boolean;
}

export function FareUpdateError({ error, onRetry, isAdmin = false }: FareUpdateErrorProps) {
  // Check if error is likely related to database connection
  const isDatabaseError = error.message.toLowerCase().includes('database') || 
                         error.message.toLowerCase().includes('sql') ||
                         error.message.toLowerCase().includes('connection');
  
  // Check if error is likely related to JSON parsing
  const isJsonError = error.message.toLowerCase().includes('json') ||
                     error.message.toLowerCase().includes('parse') ||
                     error.message.toLowerCase().includes('unexpected end');
  
  // Check if error is a network error
  const isNetworkError = error.message.toLowerCase().includes('network') ||
                        error.message.toLowerCase().includes('failed to fetch') ||
                        error.message.toLowerCase().includes('status code');
  
  // Generate appropriate error message based on error type
  let errorTitle = 'Error Updating Fares';
  let errorMessage = error.message;
  
  if (isDatabaseError) {
    errorTitle = 'Database Connection Error';
    errorMessage = isAdmin 
      ? `There was a problem connecting to the database: ${error.message}`
      : 'There was a problem connecting to the database. Please try again later or contact support.';
  } else if (isJsonError) {
    errorTitle = 'Server Response Error';
    errorMessage = isAdmin
      ? `Error processing server response: ${error.message}`
      : 'There was a problem processing the response from the server. Please try again later.';
  } else if (isNetworkError) {
    errorTitle = 'Network Error';
    errorMessage = isAdmin
      ? `Network request failed: ${error.message}`
      : 'Network request failed. Please check your internet connection and try again.';
  }
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{errorTitle}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <div>{errorMessage}</div>
        {isAdmin && (
          <div className="text-xs text-gray-200 mt-1 break-all">
            <strong>Technical details:</strong> {error.message}
            {error.stack && (
              <details className="mt-1">
                <summary>Error stack</summary>
                <pre className="text-xs mt-1 whitespace-pre-wrap">{error.stack}</pre>
              </details>
            )}
          </div>
        )}
        <div className="flex justify-end mt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
