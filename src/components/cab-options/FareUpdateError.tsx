
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Database, ExternalLink, FileJson, DownloadCloud } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fixDatabaseTables, checkDatabaseConnection, DatabaseConnectionResponse, forceRefreshVehicles } from "@/utils/apiHelper";
import { toast } from "sonner";
import { clearVehicleDataCache } from "@/services/vehicleDataService";
import { syncAirportFares } from "@/services/fareUpdateService";

interface FareUpdateErrorProps {
  error: Error;
  onRetry?: () => void;
  message?: string;
  isAdmin?: boolean;
  title?: string;
  description?: string;
  fixDatabaseHandler?: () => void;
  directDatabaseAccess?: () => void;
}

export function FareUpdateError({
  error,
  onRetry,
  message,
  isAdmin = false,
  title = "Update Error",
  description = "There was an error updating the fare. This could be due to a temporary network issue or server maintenance.",
  fixDatabaseHandler,
  directDatabaseAccess
}: FareUpdateErrorProps) {
  const errorMessage = message || error?.message || "Unknown error";
  
  // Enhanced handler for database fixes with improved error handling
  const handleFixDatabase = async () => {
    try {
      toast.loading("Checking database connection...");
      
      // First check database connection
      const connectionStatus: DatabaseConnectionResponse = await checkDatabaseConnection();
      
      if (!connectionStatus || connectionStatus.connection === false) {
        toast.error(`Database connection failed: ${connectionStatus?.message || 'Check your credentials'}`);
        toast.error("Please verify your database credentials in configuration files");
        return;
      }
      
      toast.loading("Attempting to fix database tables...");
      
      // Clear any cached vehicle data
      clearVehicleDataCache();
      
      const success = await fixDatabaseTables();
      if (success) {
        toast.success("Database tables fixed successfully");
        // Trigger event to refresh data everywhere
        window.dispatchEvent(new CustomEvent('database-fixed', { 
          detail: { timestamp: Date.now() }
        }));
        
        // Force refresh vehicles
        await forceRefreshVehicles();
        
        if (onRetry) {
          setTimeout(onRetry, 800); // Give a bit more time for the event to be processed
        }
      } else {
        toast.error("Failed to fix database tables");
      }
    } catch (err: any) {
      console.error("Error fixing database tables:", err);
      
      // More descriptive error message based on error type
      if (err.message && (err.message.includes('Access denied') || err.message.includes('connect'))) {
        toast.error(`Database connection error: ${err.message || 'Check credentials'}`);
      } else if (err.message && err.message.includes('JSON')) {
        toast.error(`Invalid server response: ${err.message}`);
      } else {
        toast.error(`Failed to fix database tables: ${err.message || 'Unknown error'}`);
      }
    }
  };

  // Handle database credential issues
  const handleDatabaseCredentials = async () => {
    try {
      toast.loading("Checking database credentials...");
      
      const connectionStatus: DatabaseConnectionResponse = await checkDatabaseConnection();
      
      if (connectionStatus && connectionStatus.connection === true) {
        toast.success("Database connection successful!");
        if (connectionStatus.version) {
          toast.info(`Connected to MySQL version: ${connectionStatus.version}`);
        }
      } else {
        toast.error(`Database connection failed: ${connectionStatus?.message || 'Unknown error'}`);
        toast.error("Please verify database credentials in config files");
      }
    } catch (err: any) {
      toast.error(`Error checking credentials: ${err.message || 'Unknown error'}`);
    }
  };
  
  // Handle syncing airport fares
  const handleSyncAirportFares = async () => {
    try {
      toast.loading("Syncing airport fares...");
      
      // Clear vehicle data cache first
      clearVehicleDataCache();
      
      const success = await syncAirportFares(true);
      
      if (success) {
        toast.success("Airport fares synced successfully");
        // If we have a retry handler, call it
        if (onRetry) {
          setTimeout(onRetry, 800);
        }
      } else {
        toast.error("Failed to sync airport fares");
      }
    } catch (err: any) {
      toast.error(`Error syncing airport fares: ${err.message || 'Unknown error'}`);
    }
  };

  // Look for specific SQL errors in the message
  const hasSqlError = errorMessage.includes('MySQL') || 
    errorMessage.includes('SQL') || 
    errorMessage.includes('database') ||
    errorMessage.includes('column') ||
    errorMessage.includes('table') ||
    errorMessage.includes('Access denied');

  const hasConnectionError = errorMessage.includes('connect') || 
    errorMessage.includes('Access denied') ||
    errorMessage.includes('localhost');
    
  const hasColumnError = errorMessage.includes('Unknown column') ||
    errorMessage.includes('night_charges');
    
  const hasMissingParamError = errorMessage.includes('Missing required parameter') ||
    errorMessage.includes('vehicleId');

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{description}</p>
        <div className="bg-red-50 p-3 rounded text-red-900 text-sm overflow-x-auto">
          {errorMessage}
        </div>
        
        {hasColumnError && (
          <div className="bg-amber-50 p-3 rounded text-amber-900 text-sm">
            <strong>Column Error Detected:</strong> The database is missing columns needed for airport fares.
            Please use the "Sync Airport Fares" or "Fix Database" button below to add the required columns.
          </div>
        )}
        
        {hasMissingParamError && (
          <div className="bg-amber-50 p-3 rounded text-amber-900 text-sm">
            <strong>Missing Parameter Error:</strong> The vehicle ID wasn't properly passed to the API.
            This could be due to a data format issue. Try using the "Sync Airport Fares" button below.
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mt-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="flex items-center">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          
          {isAdmin && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleSyncAirportFares} 
              className="flex items-center"
            >
              <DownloadCloud className="mr-2 h-4 w-4" />
              Sync Airport Fares
            </Button>
          )}
          
          {isAdmin && (fixDatabaseHandler || (hasSqlError && handleFixDatabase)) && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fixDatabaseHandler || handleFixDatabase} 
              className="flex items-center"
            >
              <Database className="mr-2 h-4 w-4" />
              Fix Database {hasConnectionError ? "(Connection Error)" : ""}
            </Button>
          )}
          
          {isAdmin && hasConnectionError && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDatabaseCredentials} 
              className="flex items-center"
            >
              <Database className="mr-2 h-4 w-4" />
              Check Credentials
            </Button>
          )}
          
          {isAdmin && directDatabaseAccess && (
            <Button size="sm" variant="outline" onClick={directDatabaseAccess} className="flex items-center">
              <ExternalLink className="mr-2 h-4 w-4" />
              Direct Database Access
            </Button>
          )}

          {isAdmin && errorMessage.includes('JSON') && (
            <Button size="sm" variant="outline" onClick={() => toast.info("Response format issue detected")} className="flex items-center">
              <FileJson className="mr-2 h-4 w-4" />
              Check Response Format
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
