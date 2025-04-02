
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Database, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{description}</p>
        <div className="bg-red-50 p-3 rounded text-red-900 text-sm overflow-x-auto">
          {errorMessage}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="flex items-center">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          
          {isAdmin && fixDatabaseHandler && (
            <Button size="sm" variant="outline" onClick={fixDatabaseHandler} className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              Fix Database
            </Button>
          )}
          
          {isAdmin && directDatabaseAccess && (
            <Button size="sm" variant="outline" onClick={directDatabaseAccess} className="flex items-center">
              <ExternalLink className="mr-2 h-4 w-4" />
              Direct Database Access
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
