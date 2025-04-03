
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Database, ExternalLink, FileJson } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fixDatabaseTables } from "@/utils/apiHelper";
import { toast } from "sonner";
import { clearVehicleDataCache } from "@/services/vehicleDataService";
import { getApiUrl } from '@/config/api';

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
  
  const handleFixDatabase = async () => {
    try {
      toast.loading("Attempting to fix database tables...");
      
      clearVehicleDataCache();
      
      const syncResponse = await fetch(`${getApiUrl('/api/admin/sync-local-fares')}?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'X-Admin-Mode': 'true',
          'X-Force-Refresh': 'true',
          'X-Bypass-Cache': 'true',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      });
      
      console.log('Sync response:', syncResponse.ok);
      
      const success = await fixDatabaseTables();
      if (success) {
        toast.success("Database tables fixed successfully");
        window.dispatchEvent(new CustomEvent('database-fixed', { 
          detail: { timestamp: Date.now() }
        }));
        
        if (onRetry) {
          setTimeout(onRetry, 800);
        }
      } else {
        toast.error("Failed to fix database tables");
      }
    } catch (err: any) {
      console.error("Error fixing database tables:", err);
      
      if (err.message && (err.message.includes('Access denied') || err.message.includes('connect'))) {
        toast.error(`Database connection error: ${err.message || 'Check credentials'}`);
      } else if (err.message && err.message.includes('JSON')) {
        toast.error(`Invalid server response: ${err.message}`);
      } else {
        toast.error(`Failed to fix database tables: ${err.message || 'Unknown error'}`);
      }
    }
  };

  // Additional error detection for column naming issues
  const hasColumnNameIssue = 
    errorMessage.includes('Unknown column') || 
    errorMessage.includes('price_4hr_40km') || 
    errorMessage.includes('price_4hrs_40km') ||
    errorMessage.includes('price_8hr_80km') ||
    errorMessage.includes('price_8hrs_80km') ||
    errorMessage.includes('price_10hr_100km') ||
    errorMessage.includes('price_10hrs_100km');

  const hasSqlError = errorMessage.includes('MySQL') || 
    errorMessage.includes('SQL') || 
    errorMessage.includes('database') ||
    errorMessage.includes('column') ||
    errorMessage.includes('table') ||
    errorMessage.includes('Access denied');

  const hasConnectionError = errorMessage.includes('connect') || 
    errorMessage.includes('Access denied') ||
    errorMessage.includes('localhost');
    
  const hasColumnNameError = errorMessage.includes('price_4hr_40km') || 
    errorMessage.includes('Unknown column') ||
    errorMessage.includes('price_4hrs_40km');

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{description}</p>
        <div className="bg-red-50 p-3 rounded text-red-900 text-sm overflow-x-auto">
          {errorMessage}
        </div>
        {(hasColumnNameError || hasColumnNameIssue) && (
          <div className="bg-amber-50 p-3 rounded text-amber-900 text-sm">
            <p className="font-semibold">Column Name Issue Detected</p>
            <p>A database column naming mismatch was detected between the code and database. Try using the "Fix Database" button to correct it.</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="flex items-center">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
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
              {hasColumnNameError || hasColumnNameIssue ? " (Column Names)" : ""}
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
