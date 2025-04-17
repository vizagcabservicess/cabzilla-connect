
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Database, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FareUpdateErrorProps {
  error: Error;
  onRetry: () => void;
  cabId?: string | null;
  title?: string;
  description?: string;
  isAdmin?: boolean;
  fixDatabaseHandler?: () => void;
  directDatabaseAccess?: () => void;
}

export const FareUpdateError: React.FC<FareUpdateErrorProps> = ({
  error,
  onRetry,
  cabId,
  title = "Error",
  description = "There was a problem loading the fare information",
  isAdmin = false,
  fixDatabaseHandler,
  directDatabaseAccess
}) => {
  return (
    <div className="bg-white rounded-lg p-5 shadow-sm mb-4">
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {title}
        </AlertDescription>
      </Alert>
      
      <div className="text-sm text-gray-600 mb-4">
        <p>{description}</p>
        {cabId && <p className="mt-2 text-xs text-gray-500">Vehicle ID: {cabId}</p>}
        {error.message && <p className="mt-2 text-xs text-gray-500">Error: {error.message}</p>}
      </div>
      
      <div className="flex flex-col space-y-2">
        <Button 
          onClick={onRetry} 
          className="w-full"
        >
          Try Again
        </Button>
        
        {isAdmin && fixDatabaseHandler && (
          <Button 
            onClick={fixDatabaseHandler}
            variant="outline"
            className="w-full mt-2 bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
          >
            <Database className="mr-2 h-4 w-4" />
            Fix Database Issues
          </Button>
        )}
        
        {isAdmin && directDatabaseAccess && (
          <Button 
            onClick={directDatabaseAccess}
            variant="outline"
            className="w-full mt-2 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <Wrench className="mr-2 h-4 w-4" />
            Direct Database Update
          </Button>
        )}
      </div>
    </div>
  );
};
