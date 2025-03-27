
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, 
  RefreshCw, 
  Database, 
  ShieldAlert, 
  Terminal, 
  Server,
  Wifi,
  DatabaseBackup,
  RefreshCcw 
} from "lucide-react";
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

interface FareUpdateErrorProps {
  error: Error | string;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showDirectLink?: boolean;
}

export function FareUpdateError({
  error,
  onRetry,
  title = "Fare Update Failed",
  description,
  showDirectLink = true
}: FareUpdateErrorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isInitializingDb, setIsInitializingDb] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [attempted500Fix, setAttempted500Fix] = useState(false);
  const errorMessage = typeof error === "string" ? error : error.message;
  
  // Error classification
  const isServerError = 
    /500|503|Internal Server Error|unavailable/i.test(errorMessage);
  
  const isForbiddenError = 
    /403|401|forbidden|unauthorized|permission|access denied/i.test(errorMessage);
  
  const isNetworkError = 
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|404|timeout/i.test(errorMessage);
  
  const isTableError =
    /table.*not found|doesn't exist|database_error|SQLSTATE|base table or view not found|unknown column/i.test(errorMessage);
  
  // Auto-attempt database initialization for 500 errors
  useEffect(() => {
    if (isServerError && !attempted500Fix) {
      setAttempted500Fix(true);
      
      // Add a small delay before attempting fix
      const timer = setTimeout(() => {
        initializeDatabase(); 
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isServerError]);

  const handleRetry = () => {
    console.log("Retrying fare update after error...");
    
    // Show toast
    toast.info('Clearing all caches and refreshing...', {
      id: 'clearing-cache',
      duration: 2000
    });
    
    // Clear all caches
    fareService.clearCache();
    
    // Wait a moment before retrying
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        // If no handler provided, reload the page
        window.location.reload();
      }
    }, 800);
  };

  // Comprehensive fix attempt
  const runComprehensiveFix = async () => {
    setIsFixing(true);
    toast.info('Applying comprehensive API fixes...', {
      id: 'comprehensive-fix',
      duration: 3000
    });
    
    try {
      console.log('Running comprehensive API fixes...');
      
      // 1. Clear all caches
      fareService.clearCache();
      
      // 2. Force API version update
      const timestamp = Date.now();
      localStorage.setItem('apiVersionForced', timestamp.toString());
      sessionStorage.setItem('apiVersionForced', timestamp.toString());
      
      // 3. Set direct API access flag
      localStorage.setItem('useDirectApi', 'true');
      sessionStorage.setItem('useDirectApi', 'true');
      
      // 4. Try the direct API for all trip types
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
      
      try {
        // Test direct-fare-update.php endpoint - this should now handle everything
        await fetch(`${baseUrl}/api/admin/direct-fare-update.php?test=1&_t=${timestamp}`, {
          method: 'GET',
          headers: fareService.getBypassHeaders()
        });
        
        toast.success('Connected to direct API successfully');
      } catch (err) {
        console.error('Error testing direct API:', err);
      }
      
      // 5. Initialize database
      await initializeDatabase();
      
      // 6. Sync tables
      await syncTables();
      
      // Success notification
      toast.success('Comprehensive fixes applied', {
        id: 'comprehensive-fix-success'
      });
    } catch (err) {
      console.error('Error applying comprehensive fixes:', err);
      toast.error('Error applying fixes', {
        id: 'comprehensive-fix-error'
      });
    } finally {
      setIsFixing(false);
    }
  };

  // Initialize database tables
  const initializeDatabase = async () => {
    setIsInitializingDb(true);
    toast.info('Initializing database tables...', {
      id: 'init-database',
      duration: 3000
    });
    
    try {
      // First, try using the direct fare update endpoint which has table creation
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
      const timestamp = Date.now();
      
      try {
        const directInitResponse = await fetch(`${baseUrl}/api/admin/direct-fare-update.php?initialize=true&_t=${timestamp}`, {
          method: 'GET',
          headers: {
            ...fareService.getBypassHeaders(),
            'Accept': 'application/json'
          }
        });
        
        if (directInitResponse.ok) {
          toast.success('Tables initialized successfully via direct endpoint', {
            duration: 3000
          });
          return true;
        }
      } catch (error) {
        console.error('Error using direct endpoint for initialization:', error);
      }
      
      // Fall back to standard init-database endpoint
      const result = await fareService.initializeDatabase();
      
      if (result) {
        // Clear all caches after successful initialization
        fareService.clearCache();
        
        // Display confirmation
        toast.success('Database setup complete! Please try updating fares now.', {
          duration: 5000
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error during database initialization:', error);
      toast.error('Failed to initialize database tables');
      return false;
    } finally {
      setIsInitializingDb(false);
    }
  };

  // Sync local_package_fares and vehicle_pricing tables
  const syncTables = async () => {
    setIsSyncing(true);
    toast.info('Synchronizing database tables...', {
      id: 'sync-tables',
      duration: 3000
    });
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
      const timestamp = Date.now();
      
      try {
        // Call the sync endpoint
        const syncResponse = await fetch(`${baseUrl}/api/admin/sync-local-fares.php?_t=${timestamp}`, {
          method: 'GET',
          headers: {
            ...fareService.getBypassHeaders(),
            'Accept': 'application/json'
          }
        });
        
        if (syncResponse.ok) {
          const syncData = await syncResponse.json();
          
          if (syncData.status === 'success') {
            toast.success('Tables synchronized successfully', {
              duration: 3000
            });
            console.log('Sync response:', syncData);
            return true;
          } else {
            console.error('Sync error:', syncData.message);
            toast.error(`Sync error: ${syncData.message}`, { duration: 5000 });
            return false;
          }
        } else {
          throw new Error(`HTTP error ${syncResponse.status}`);
        }
      } catch (error) {
        console.error('Error syncing tables:', error);
        toast.error('Failed to sync tables');
        return false;
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Pick the most appropriate icon
  const ErrorIcon = isTableError
    ? Database
    : (isForbiddenError
      ? ShieldAlert 
      : (isServerError 
        ? Server 
        : (isNetworkError ? Wifi : AlertCircle)));

  // Tailored error message based on type
  const getErrorDescription = () => {
    if (description) return description;
    
    if (isTableError) {
      return "The database table required for this operation doesn't exist or has a column name mismatch. Use the 'Initialize Database' or 'Sync Tables' button to fix.";
    }
    if (isForbiddenError) {
      return "You don't have permission to update fares. This might be an authentication issue.";
    }
    if (isServerError) {
      return "The server encountered an error while processing your request. Click 'Initialize Database' to fix missing tables.";
    }
    if (isNetworkError) {
      return "Unable to connect to the fare update server. Please check your connection.";
    }
    return errorMessage;
  };

  return (
    <Card className="w-full border-red-200 bg-red-50 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-red-700 text-base">
          <ErrorIcon className="h-5 w-5 mr-2" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <Alert variant="destructive" className="mb-1">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {isTableError 
              ? "Database Table Error"
              : (isForbiddenError 
                ? "Access Denied" 
                : (isServerError 
                  ? "Server Error" 
                  : (isNetworkError 
                    ? "Network Error" 
                    : "Update Failed")))}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {getErrorDescription()}
          </AlertDescription>
        </Alert>

        <div className="text-sm space-y-2">
          <p className="font-medium text-gray-700">Try the following:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            {isTableError && (
              <>
                <li className="font-medium text-red-700">
                  {/unknown column/i.test(errorMessage) 
                    ? "Column mismatch detected - use the 'Sync Tables' button below" 
                    : "Database tables may be missing - use 'Initialize Database' button below"}
                </li>
                <li>This will {/unknown column/i.test(errorMessage) ? "fix column inconsistencies" : "create all required database tables"}</li>
              </>
            )}
            <li>Use the comprehensive fix button to solve common API connection issues</li>
            <li>Clear browser cache and try again</li>
            <li>Check for network connectivity issues</li>
          </ul>
        </div>
        
        {showAdvanced && (
          <div className="bg-blue-50 p-3 rounded-md border border-blue-200 mt-2">
            <div className="flex items-start">
              <Terminal className="h-4 w-4 mt-1 text-blue-500 mr-2" />
              <div className="text-xs">
                <p className="font-medium text-blue-800">Error Details:</p>
                <pre className="mt-1 text-xs text-blue-700 bg-blue-100 p-1 rounded overflow-auto max-h-20">
                  {JSON.stringify({
                    endpoint: error?.['config']?.url || 'Unknown',
                    status: error?.['response']?.status || 'Unknown',
                    message: errorMessage,
                    apiVersion: import.meta.env.VITE_API_VERSION || 'Unknown',
                    isTableError: isTableError,
                    isServerError: isServerError,
                    isNetworkError: isNetworkError
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex flex-wrap gap-3">
        {isTableError && /unknown column/i.test(errorMessage) && (
          <Button 
            onClick={syncTables} 
            className="gap-2 bg-amber-600 hover:bg-amber-700"
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCcw className="h-4 w-4" />
                Sync Tables
              </>
            )}
          </Button>
        )}
        
        {(isTableError || isServerError) && (
          <Button 
            onClick={initializeDatabase} 
            className="gap-2 bg-amber-600 hover:bg-amber-700"
            disabled={isInitializingDb}
          >
            {isInitializingDb ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Setting Up...
              </>
            ) : (
              <>
                <DatabaseBackup className="h-4 w-4" />
                Initialize Database
              </>
            )}
          </Button>
        )}
        
        <Button 
          onClick={handleRetry} 
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Clear Cache & Retry
        </Button>
        
        <Button
          onClick={runComprehensiveFix}
          variant="outline"
          className="gap-2 border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800"
          disabled={isFixing}
        >
          {isFixing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Applying Fixes...
            </>
          ) : (
            <>
              <Server className="h-4 w-4" />
              Comprehensive Fix
            </>
          )}
        </Button>
        
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="ghost"
          size="sm"
          className="w-full text-xs text-gray-500 mt-1"
        >
          {showAdvanced ? "Hide Technical Details" : "Show Technical Details"}
        </Button>
      </CardFooter>
    </Card>
  );
}
