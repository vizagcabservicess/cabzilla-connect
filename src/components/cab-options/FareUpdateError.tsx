
import { AlertTriangle, RefreshCw, Database, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { fixDatabaseTables } from "@/utils/apiHelper";
import { toast } from "sonner";

interface FareUpdateErrorProps {
  message?: string;
  error?: Error;
  onRetry: () => void;
  isAdmin?: boolean;
  title?: string;
  description?: string;
}

export function FareUpdateError({
  message,
  error,
  onRetry,
  isAdmin = false,
  title = "Update Error",
  description = "There was a problem updating data. This is often due to a connection issue."
}: FareUpdateErrorProps) {
  // Use error.message if message is not provided
  const errorMessage = message || (error?.message || "Unknown error occurred");

  const handleFixDatabase = async () => {
    try {
      toast.loading("Fixing database tables...");
      const success = await fixDatabaseTables();
      
      if (success) {
        toast.success("Database tables fixed successfully");
        onRetry(); // Retry the operation after fixing the database
      } else {
        toast.error("Failed to fix database tables");
      }
    } catch (error) {
      toast.error("Error fixing database tables");
      console.error("Error fixing database:", error);
    }
  };

  const handleDirectAccess = () => {
    // For admin users, provide direct access to the database management page
    if (isAdmin) {
      window.open("/admin/database", "_blank");
    } else {
      toast.error("Administrator access required");
    }
  };
  
  // Detect if we have a 404 error
  const is404Error = errorMessage.includes('404') || errorMessage.includes('not found');
  const isSqlError = errorMessage.includes('SQL') || errorMessage.includes('MySQL');
  const isServerError = errorMessage.includes('500') || errorMessage.includes('Internal Server Error');
  const isConnectionError = errorMessage.includes('connection') || errorMessage.includes('timeout');

  return (
    <Card className="p-4 mb-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
      <Alert variant="destructive" className="border-0 bg-transparent">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="font-bold">{title}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="text-sm mb-3">{description}</p>
          
          {isServerError && (
            <div className="mb-3 text-xs bg-red-100 dark:bg-red-900 p-3 rounded border border-red-300 dark:border-red-800">
              <p className="font-semibold mb-1">Internal Server Error (500)</p>
              <p>The server encountered an issue processing your request. This might be due to:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Database connection issues</li>
                <li>Server maintenance</li>
                <li>Resource limitations</li>
              </ul>
            </div>
          )}
          
          {is404Error && (
            <div className="mb-3 text-xs bg-red-100 dark:bg-red-900 p-3 rounded border border-red-300 dark:border-red-800">
              <p className="font-semibold mb-1">Resource Not Found (404)</p>
              <p>The requested API endpoint could not be found. This might be due to:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Server configuration issues</li>
                <li>Missing files</li>
                <li>URL path errors</li>
              </ul>
            </div>
          )}
          
          <div className="p-2 mt-1 mb-3 bg-red-100 dark:bg-red-900 rounded text-xs font-mono overflow-x-auto">
            {errorMessage}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="default" 
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" /> 
              Retry
            </Button>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleFixDatabase}
              className="flex items-center gap-2"
            >
              <Database className="h-3 w-3" /> 
              Fix Database
            </Button>
            
            {isAdmin && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleDirectAccess}
                className="flex items-center gap-2"
              >
                <Terminal className="h-3 w-3" /> 
                Direct Database Access
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </Card>
  );
}
