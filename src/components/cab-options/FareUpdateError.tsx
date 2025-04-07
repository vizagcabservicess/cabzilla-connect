
import React from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Database, RefreshCw } from "lucide-react";

export interface FareUpdateErrorProps {
  error: Error;
  onRetry: () => void;
  isAdmin?: boolean;
  title?: string;
  description?: string;
  fixDatabaseHandler?: () => Promise<void>;
  directDatabaseAccess?: () => Promise<void>;
}

export const FareUpdateError: React.FC<FareUpdateErrorProps> = ({
  error,
  onRetry,
  isAdmin = false,
  title = "Error Updating Fares",
  description = "There was a problem updating the fare data.",
  fixDatabaseHandler,
  directDatabaseAccess
}) => {
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4 mr-2" />
      <AlertTitle className="mb-2">{title}</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{description}</p>
        <p className="text-xs font-mono bg-gray-100 p-2 rounded">
          {error.message}
        </p>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRetry}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          
          {isAdmin && fixDatabaseHandler && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={fixDatabaseHandler}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Fix Database
            </Button>
          )}
          
          {isAdmin && directDatabaseAccess && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={directDatabaseAccess}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Direct DB Access
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
