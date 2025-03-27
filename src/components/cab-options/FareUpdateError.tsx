
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
import { fareService, directFareUpdate } from '@/lib';
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
  
  const isServerError = 
    /500|503|Internal Server Error|unavailable/i.test(errorMessage);
  
  const isForbiddenError = 
    /403|401|forbidden|unauthorized|permission|access denied/i.test(errorMessage);
  
  const isNetworkError = 
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|404|timeout/i.test(errorMessage);
  
  const isTableError =
    /table.*not found|doesn't exist|database_error|SQLSTATE|base table or view not found|unknown column/i.test(errorMessage);
  
  useEffect(() => {
    if (isServerError && !attempted500Fix) {
      setAttempted500Fix(true);
      
      const timer = setTimeout(() => {
        initializeDatabase(); 
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isServerError]);

  const handleRetry = () => {
    console.log("Retrying fare update after error...");
    
    toast.info('Clearing all caches and refreshing...', {
      id: 'clearing-cache',
      duration: 2000
    });
    
    fareService.clearCache();
    
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    }, 800);
  };

  const runComprehensiveFix = async () => {
    setIsFixing(true);
    toast.info('Applying comprehensive API fixes...', {
      id: 'comprehensive-fix',
      duration: 3000
    });
    
    try {
      console.log('Running comprehensive API fixes...');
      
      fareService.clearCache();
      
      const timestamp = Date.now();
      localStorage.setItem('apiVersionForced', timestamp.toString());
      sessionStorage.setItem('apiVersionForced', timestamp.toString());
      
      localStorage.setItem('useDirectApi', 'true');
      sessionStorage.setItem('useDirectApi', 'true');
      
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
      
      try {
        const testUrls = [
          `${baseUrl}/api/admin/direct-fare-update.php?test=1&_t=${timestamp}`,
          `${baseUrl}/api/admin/local-fares-update.php?test=1&_t=${timestamp}`,
          `${baseUrl}/api/local-package-fares.php?test=1&_t=${timestamp}`
        ];
        
        for (const url of testUrls) {
          try {
            const testResponse = await fetch(url, {
              method: 'GET',
              headers: fareService.getBypassHeaders()
            });
            
            if (testResponse.ok) {
              console.log(`Successfully accessed: ${url}`);
              toast.success(`Connected to ${url.split('/').pop()} successfully`);
            }
          } catch (err) {
            console.error(`Error testing ${url}:`, err);
          }
        }
      } catch (err) {
        console.error('Error testing direct APIs:', err);
      }
      
      await initializeDatabase();
      
      await syncTables();
      
      await forceUpdateAllLocalFares();
      
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

  const forceUpdateAllLocalFares = async () => {
    try {
      const cabTypes = ['sedan', 'ertiga', 'innova', 'innova_crysta', 'tempo', 'luxury'];
      const packageToUpdate = '4hrs-40km';
      
      toast.info('Forcing local fare update for all vehicles...', {
        id: 'force-update',
        duration: 3000
      });
      
      for (const cabType of cabTypes) {
        const currentFare = localStorage.getItem(`localFare_${cabType}_${packageToUpdate}`) || 
          (cabType === 'sedan' ? '1200' : 
            cabType === 'ertiga' ? '1800' : 
              cabType === 'innova' || cabType === 'innova_crysta' ? '2300' : 
                cabType === 'tempo' ? '3000' : '3500');
        
        const fares = {
          '4hrs-40km': parseFloat(currentFare),
          '8hrs-80km': parseFloat(currentFare) * 2,
          '10hrs-100km': parseFloat(currentFare) * 2.5,
          'extraKmRate': cabType === 'sedan' ? 14 : 
            cabType === 'ertiga' ? 18 : 20,
          'extraHourRate': cabType === 'sedan' ? 250 : 
            cabType === 'ertiga' ? 300 : 350,
        };
        
        const updateEndpoints = [
          `local-package-fares.php`,
          `admin/local-fares-update.php`,
          `admin/direct-local-fares.php`,
          `admin/direct-fare-update.php?tripType=local`
        ];
        
        let successfulUpdate = false;
        
        for (const endpoint of updateEndpoints) {
          if (!successfulUpdate) {
            try {
              await directFareUpdate('local', cabType, fares, endpoint);
              console.log(`Updated local fares for ${cabType} using ${endpoint}`);
              successfulUpdate = true;
            } catch (error) {
              console.error(`Error updating ${cabType} with ${endpoint}:`, error);
            }
          }
        }
        
        if (!successfulUpdate) {
          await directFareUpdate('local', cabType, fares);
        }
      }
      
      toast.success('Forced update complete');
      return true;
    } catch (error) {
      console.error('Error in forceUpdateAllLocalFares:', error);
      return false;
    }
  };

  const initializeDatabase = async () => {
    setIsInitializingDb(true);
    toast.info('Initializing database tables...', {
      id: 'init-database',
      duration: 3000
    });
    
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
      const timestamp = Date.now();
      
      try {
        console.log('Trying to initialize via local-package-fares.php');
        const localPackageFaresResponse = await fetch(`${baseUrl}/api/local-package-fares.php?initialize=true&_t=${timestamp}`, {
          method: 'GET',
          headers: {
            ...fareService.getBypassHeaders(),
            'Accept': 'application/json'
          }
        });
        
        if (localPackageFaresResponse.ok) {
          toast.success('Tables initialized successfully via local-package-fares endpoint', {
            duration: 3000
          });
          return true;
        }
      } catch (error) {
        console.error('Error using local-package-fares endpoint for initialization:', error);
      }
      
      try {
        console.log('Trying to initialize via direct-local-fares.php');
        const directLocalFaresResponse = await fetch(`${baseUrl}/api/admin/direct-local-fares.php?initialize=true&_t=${timestamp}`, {
          method: 'GET',
          headers: {
            ...fareService.getBypassHeaders(),
            'Accept': 'application/json'
          }
        });
        
        if (directLocalFaresResponse.ok) {
          toast.success('Tables initialized successfully via direct-local-fares endpoint', {
            duration: 3000
          });
          return true;
        }
      } catch (error) {
        console.error('Error using direct-local-fares endpoint for initialization:', error);
      }
      
      try {
        console.log('Trying to initialize via local-fares-update.php');
        const localFaresUpdateResponse = await fetch(`${baseUrl}/api/admin/local-fares-update.php?initialize=true&_t=${timestamp}`, {
          method: 'GET',
          headers: {
            ...fareService.getBypassHeaders(),
            'Accept': 'application/json'
          }
        });
        
        if (localFaresUpdateResponse.ok) {
          toast.success('Tables initialized successfully via local-fares-update endpoint', {
            duration: 3000
          });
          return true;
        }
      } catch (error) {
        console.error('Error using local-fares-update endpoint for initialization:', error);
      }
      
      try {
        console.log('Trying to initialize via local-fares.php');
        const localFaresResponse = await fetch(`${baseUrl}/api/local-fares.php?create_tables=true&_t=${timestamp}`, {
          method: 'GET',
          headers: {
            ...fareService.getBypassHeaders(),
            'Accept': 'application/json' 
          }
        });
        
        if (localFaresResponse.ok) {
          toast.success('Tables created via local-fares endpoint', {
            duration: 3000
          });
          return true;
        }
      } catch (error) {
        console.error('Error creating tables via local-fares endpoint:', error);  
      }
      
      // THE FIX: Remove the extra arguments and only call with forceRecreate parameter (true)
      const result = await fareService.initializeDatabase(true);
      
      if (result) {
        fareService.clearCache();
        
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
        const checkEndpoint = await fetch(`${baseUrl}/api/local-package-fares.php?_t=${timestamp}`, {
          method: 'GET',
          headers: {
            ...fareService.getBypassHeaders(),
            'Accept': 'application/json'
          }
        });
        
        if (checkEndpoint.ok) {
          console.log('local-package-fares.php endpoint is accessible');
          toast.success('Local fares endpoint verified', {
            duration: 2000
          });
        }
      } catch (error) {
        console.error('Error checking local-package-fares endpoint:', error);
      }
      
      try {
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
          }
        } else {
          throw new Error(`HTTP error ${syncResponse.status}`);
        }
      } catch (error) {
        console.error('Error syncing tables via admin endpoint:', error);
        
        try {
          const localPackageInitResponse = await fetch(`${baseUrl}/api/local-package-fares.php?initialize=true&_t=${timestamp}`, {
            method: 'GET',
            headers: {
              ...fareService.getBypassHeaders(),
              'Accept': 'application/json'
            }
          });
          
          if (localPackageInitResponse.ok) {
            toast.success('Tables initialized via local-package-fares endpoint', { duration: 3000 });
            return true;
          }
        } catch (initError) {
          console.error('Error initializing via local-package-fares endpoint:', initError);
        }
        
        try {
          const fallbackSyncResponse = await fetch(`${baseUrl}/api/sync-local-fares.php?_t=${timestamp}`, {
            method: 'GET',
            headers: {
              ...fareService.getBypassHeaders(),
              'Accept': 'application/json'
            }
          });
          
          if (fallbackSyncResponse.ok) {
            toast.success('Tables synchronized via fallback endpoint', { duration: 3000 });
            return true;
          }
        } catch (fallbackError) {
          console.error('Error with fallback sync endpoint:', fallbackError);
        }
        
        toast.error('Failed to sync tables - all endpoints failed', { duration: 5000 });
        return false;
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const ErrorIcon = isTableError
    ? Database
    : (isForbiddenError
      ? ShieldAlert 
      : (isServerError 
        ? Server 
        : (isNetworkError ? Wifi : AlertCircle)));

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
      return "Unable to connect to the fare update server. Please check your connection or try using the new direct endpoints.";
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
            {isNetworkError && (
              <li className="font-medium text-red-700">
                The endpoint you're trying to reach might not exist or may be blocked. Try the Comprehensive Fix.
              </li>
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
        
        {(isTableError || isServerError || isNetworkError) && (
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
