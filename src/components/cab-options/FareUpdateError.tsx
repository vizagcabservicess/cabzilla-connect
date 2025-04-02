
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
  const isConnectionError = errorMessage.includes('connection') || errorMessage.includes('timeout');

  return (
    <Card className="p-4 mb-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
      <Alert variant="destructive" className="bg-transparent border-none p-0">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-red-600 dark:text-red-400">{title}</AlertTitle>
        <AlertDescription className="text-gray-700 dark:text-gray-300">
          {description}
        </AlertDescription>
        
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p className="font-mono bg-red-100 dark:bg-red-900 p-2 rounded my-2 overflow-auto max-h-24">
            {errorMessage}
          </p>
          
          {is404Error && (
            <p className="mt-2">
              <strong>API Endpoint Not Found:</strong> The system couldn't find the correct API endpoint. 
              This could be due to a server configuration issue.
            </p>
          )}
          
          {isSqlError && (
            <p className="mt-2">
              <strong>Database Error:</strong> There appears to be an issue with the database. 
              Try fixing the database tables or contact your administrator.
            </p>
          )}
          
          {isConnectionError && (
            <p className="mt-2">
              <strong>Connection Error:</strong> Could not connect to the server. 
              Please check your network connection and try again.
            </p>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={onRetry}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
          
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleFixDatabase}
                className="flex items-center gap-1"
              >
                <Database className="w-4 h-4" /> Initialize Database
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDirectAccess}
                className="flex items-center gap-1"
              >
                <Terminal className="w-4 h-4" /> Direct Database Access
              </Button>
            </>
          )}
        </div>
      </Alert>
    </Card>
  );
}
