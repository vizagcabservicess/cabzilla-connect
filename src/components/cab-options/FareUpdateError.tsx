
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FareUpdateErrorProps {
  error: Error;
  onRetry: () => void;
  cabId?: string | null;
}

export const FareUpdateError: React.FC<FareUpdateErrorProps> = ({
  error,
  onRetry,
  cabId
}) => {
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm mb-4">
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          There was a problem loading the fare information
        </AlertDescription>
      </Alert>
      
      <div className="text-sm text-gray-600 mb-4">
        <p>We couldn't retrieve the current pricing for this cab type. This might be due to a temporary network issue.</p>
        {cabId && <p className="mt-2 text-xs text-gray-500">Vehicle ID: {cabId}</p>}
        {error.message && <p className="mt-2 text-xs text-gray-500">Error: {error.message}</p>}
      </div>
      
      <Button 
        onClick={onRetry} 
        className="w-full"
      >
        Try Again
      </Button>
    </div>
  );
};
