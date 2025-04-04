
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Database, RefreshCw } from "lucide-react";
import { checkDatabaseConnection, fixDatabaseTables } from "@/utils/apiHelper";
import { toast } from "sonner";

interface DatabaseConnectionErrorProps {
  error: Error;
  onRetry?: () => void;
  title?: string;
  description?: string;
}

export function DatabaseConnectionError({
  error,
  onRetry,
  title = "Database Connection Error",
  description = "There was an error connecting to the database. Please check your database configuration."
}: DatabaseConnectionErrorProps) {
  const [isChecking, setIsChecking] = React.useState(false);
  const [isFixing, setIsFixing] = React.useState(false);
  const [connectionDetails, setConnectionDetails] = React.useState<any>(null);

  const errorMessage = error?.message || "Unknown database error";
  
  // Check if error mentions access denied
  const isAccessDenied = 
    errorMessage.toLowerCase().includes('access denied') || 
    errorMessage.toLowerCase().includes('authentication');
  
  // Check for unknown database errors
  const isUnknownDatabase = 
    errorMessage.toLowerCase().includes('unknown database') || 
    errorMessage.toLowerCase().includes('database not found');
  
  // Check for server connection issues
  const isConnectionRefused = 
    errorMessage.toLowerCase().includes('connection refused') || 
    errorMessage.toLowerCase().includes('could not connect');

  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      toast.loading("Checking database connection...");
      const isConnected = await checkDatabaseConnection();
      
      if (isConnected) {
        toast.success("Database connection successful!");
        setConnectionDetails({ connected: true });
        if (onRetry) {
          setTimeout(onRetry, 1000);
        }
      } else {
        toast.error("Failed to connect to database");
        setConnectionDetails({ connected: false });
      }
    } catch (err: any) {
      toast.error(`Error checking connection: ${err.message}`);
      setConnectionDetails({ connected: false, error: err.message });
    } finally {
      setIsChecking(false);
    }
  };

  const handleFixDatabase = async () => {
    setIsFixing(true);
    try {
      toast.loading("Attempting to fix database tables...");
      const success = await fixDatabaseTables();
      
      if (success) {
        toast.success("Database tables fixed successfully");
        if (onRetry) {
          setTimeout(onRetry, 1000);
        }
      } else {
        toast.error("Failed to fix database tables");
      }
    } catch (err: any) {
      toast.error(`Error fixing database: ${err.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{description}</p>
        
        <div className="bg-red-50 p-3 rounded text-red-900 text-sm overflow-x-auto">
          {errorMessage}
        </div>
        
        {isAccessDenied && (
          <div className="bg-amber-50 p-3 rounded text-amber-900 text-sm">
            <strong>Access Denied Error:</strong> The database credentials appear to be incorrect. 
            Please check the username and password in your configuration.
          </div>
        )}
        
        {isUnknownDatabase && (
          <div className="bg-amber-50 p-3 rounded text-amber-900 text-sm">
            <strong>Unknown Database Error:</strong> The specified database does not exist. 
            Please check the database name in your configuration.
          </div>
        )}
        
        {isConnectionRefused && (
          <div className="bg-amber-50 p-3 rounded text-amber-900 text-sm">
            <strong>Connection Refused:</strong> Cannot establish a connection to the database server. 
            Please check that the database server is running and accessible.
          </div>
        )}
        
        {connectionDetails && (
          <div className={`p-3 rounded text-sm ${connectionDetails.connected ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}`}>
            <strong>Connection Check Result:</strong> {connectionDetails.connected ? 'Connected successfully' : 'Connection failed'}
            {connectionDetails.error && <div className="mt-1">{connectionDetails.error}</div>}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCheckConnection}
            disabled={isChecking}
            className="flex items-center"
          >
            <Database className="mr-2 h-4 w-4" />
            {isChecking ? 'Checking...' : 'Check Connection'}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleFixDatabase}
            disabled={isFixing}
            className="flex items-center"
          >
            <Database className="mr-2 h-4 w-4" />
            {isFixing ? 'Fixing...' : 'Fix Database Tables'}
          </Button>
          
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              className="flex items-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Operation
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
