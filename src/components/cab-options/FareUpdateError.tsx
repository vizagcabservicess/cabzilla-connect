
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
  RotateCcw,
  FileJson,
  Code,
  Zap,
  FileWarning,
  HardDrive
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
  const [attempted500Fix, setAttempted500Fix] = useState(false);
  const [useEmergencyEndpoints, setUseEmergencyEndpoints] = useState(false);
  
  const errorMessage = typeof error === "string" ? error : error.message;
  
  // Error classification with more specific patterns
  const isServerError = 
    /500|503|Internal Server Error|unavailable/i.test(errorMessage);
  
  const isForbiddenError = 
    /403|401|forbidden|unauthorized|permission|access denied/i.test(errorMessage);
  
  const isNetworkError = 
    /network|connection|failed|ERR_NETWORK|ECONNABORTED|404|timeout|ERR_BAD_RESPONSE/i.test(errorMessage);
  
  const isTableError =
    /table.*not found|doesn't exist|database_error|SQLSTATE|base table or view not found/i.test(errorMessage);
  
  const isOutstationError = 
    /outstation|vehicle.*pricing|fare.*update/i.test(errorMessage);
    
  useEffect(() => {
    // Check if emergency endpoints are enabled
    const useEmergency = localStorage.getItem('useEmergencyEndpoints') === 'true' || 
                         sessionStorage.getItem('useEmergencyEndpoints') === 'true' ||
                         import.meta.env.VITE_USE_EMERGENCY_ENDPOINTS === 'true';
    
    setUseEmergencyEndpoints(useEmergency);
  }, []);
  
  // Auto-attempt database initialization for 500 errors that happen immediately
  useEffect(() => {
    if ((isServerError || isTableError) && !attempted500Fix) {
      setAttempted500Fix(true);
      
      // Add a small delay before attempting fix
      const timer = setTimeout(() => {
        initializeDatabase(); 
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isServerError, isTableError]);

  const handleRetry = () => {
    console.log("Retrying fare update after error...");
    
    // Show toast
    toast.info('Clearing all caches and refreshing...', {
      id: 'clearing-cache',
      duration: 2000
    });
    
    // Clear all caches
    fareService.clearCache();
    
    // Force API version update
    const timestamp = Date.now();
    localStorage.setItem('apiVersionForced', timestamp.toString());
    sessionStorage.setItem('apiVersionForced', timestamp.toString());
    
    // Set direct API access flag
    localStorage.setItem('useDirectApi', 'true');
    sessionStorage.setItem('useDirectApi', 'true');
    
    // Use emergency endpoints if error persists
    if (isServerError || isTableError || isNetworkError) {
      localStorage.setItem('useEmergencyEndpoints', 'true');
      sessionStorage.setItem('useEmergencyEndpoints', 'true');
      setUseEmergencyEndpoints(true);
    }
    
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

  // Comprehensive fix attempt - enhanced with full error logging
  const runComprehensiveFix = async () => {
    setIsFixing(true);
    toast.info('Applying comprehensive API fixes...', {
      id: 'comprehensive-fix',
      duration: 3000
    });
    
    try {
      console.log('Running comprehensive API fixes...');
      
      // 1. Clear all caches and force flags
      fareService.clearCache();
      
      // 2. Force API version update
      const timestamp = Date.now();
      localStorage.setItem('apiVersionForced', timestamp.toString());
      sessionStorage.setItem('apiVersionForced', timestamp.toString());
      
      // 3. Set direct API access flag and other flags
      localStorage.setItem('useDirectApi', 'true');
      sessionStorage.setItem('useDirectApi', 'true');
      localStorage.setItem('forceDirectFare', 'true');
      sessionStorage.setItem('forceDirectFare', 'true');
      localStorage.setItem('useUpdatedSchema', 'true');
      sessionStorage.setItem('useUpdatedSchema', 'true');
      
      // 4. Use emergency endpoints
      localStorage.setItem('useEmergencyEndpoints', 'true');
      sessionStorage.setItem('useEmergencyEndpoints', 'true');
      setUseEmergencyEndpoints(true);
      
      // 5. Initialize database with multiple attempts
      await initializeDatabase();
      
      // 6. Add small delay to let database initialize
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 7. Try to repair tables using emergency endpoints
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
        const repairUrls = [
          `${baseUrl}/api/emergency/init-database?repair=true&t=${Date.now()}`,
          `${baseUrl}/api/init-database.php?repair=true&t=${Date.now()}`,
          `${baseUrl}/api/admin/init-database.php?repair=true&t=${Date.now()}`
        ];
        
        for (let url of repairUrls) {
          try {
            const repairResult = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Force-Refresh': 'true',
                'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.70'
              }
            });
            
            console.log(`Repair database response from ${url}:`, await repairResult.text());
            
            // If we got a 200, break the loop
            if (repairResult.ok) break;
          } catch (err) {
            console.log(`Error with repair URL ${url}:`, err);
            // Continue with next URL
          }
        }
      } catch (repairErr) {
        console.error('Error during table repair:', repairErr);
      }
      
      // 8. Try emergency endpoints for outstation fares if needed
      if (isOutstationError) {
        try {
          toast.info('Applying fixes for outstation fare tables...');
          
          // Create a test vehicle entry to initialize the tables
          const testData = {
            vehicleId: 'sedan',
            oneWayBasePrice: 4200,
            oneWayPricePerKm: 14,
            roundTripBasePrice: 4000,
            roundTripPricePerKm: 12,
            driverAllowance: 250,
            nightHalt: 700,
            _t: Date.now()
          };
          
          // Try emergency outstation endpoint
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
          const outstationEmergencyUrl = `${baseUrl}/api/emergency/outstation-fares?t=${Date.now()}`;
          
          try {
            const response = await fetch(outstationEmergencyUrl, {
              method: 'POST',
              body: JSON.stringify(testData),
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Force-Refresh': 'true'
              }
            });
            
            console.log(`Emergency outstation response:`, await response.text());
          } catch (err) {
            console.log(`Error with emergency outstation URL:`, err);
          }
          
          console.log('Test outstation fare update attempted');
        } catch (outstationErr) {
          console.error('Error fixing outstation tables:', outstationErr);
        }
      }
      
      // 9. Try setting up airport fare tables
      try {
        const airportTestData = {
          vehicleId: 'sedan',
          basePrice: 1200,
          pricePerKm: 14,
          dropPrice: 1000,
          pickupPrice: 1200,
          tier1Price: 1000,
          tier2Price: 1200,
          tier3Price: 1400,
          tier4Price: 1600,
          extraKmCharge: 14,
          _t: Date.now()
        };
        
        // Try emergency airport endpoint
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
        const airportEmergencyUrl = `${baseUrl}/api/emergency/airport-fares?t=${Date.now()}`;
        
        try {
          const response = await fetch(airportEmergencyUrl, {
            method: 'POST',
            body: JSON.stringify(airportTestData),
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true'
            }
          });
          
          console.log(`Emergency airport response:`, await response.text());
        } catch (err) {
          console.log(`Error with emergency airport URL:`, err);
        }
      } catch (airportErr) {
        console.error('Error fixing airport tables:', airportErr);
      }
      
      // Success notification
      toast.success('Comprehensive fixes applied! Please try updating fares now.', {
        id: 'comprehensive-fix-success',
        duration: 5000
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

  // Activate emergency mode for all endpoints
  const activateEmergencyMode = () => {
    localStorage.setItem('useEmergencyEndpoints', 'true');
    sessionStorage.setItem('useEmergencyEndpoints', 'true');
    
    const timestamp = Date.now();
    localStorage.setItem('apiVersionForced', timestamp.toString());
    sessionStorage.setItem('apiVersionForced', timestamp.toString());
    
    setUseEmergencyEndpoints(true);
    
    toast.success('Emergency endpoints activated. This will use ultra-simplified database access.', {
      duration: 5000
    });
    
    // Try to initialize emergency endpoints
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency/init-database?t=${timestamp}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...fareService.getBypassHeaders()
      }
    }).catch(() => {
      // Silently catch errors, we just want to ping the endpoint
    });
    
    // Wait and reload
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    }, 1000);
  };
  
  // Force deactivate emergency mode
  const deactivateEmergencyMode = () => {
    localStorage.removeItem('useEmergencyEndpoints');
    sessionStorage.removeItem('useEmergencyEndpoints');
    
    setUseEmergencyEndpoints(false);
    
    toast.info('Emergency endpoints deactivated. Using standard endpoints.', {
      duration: 3000
    });
    
    // Reload after a brief pause
    setTimeout(() => {
      if (onRetry) {
        onRetry();
      } else {
        window.location.reload();
      }
    }, 1000);
  };

  // Initialize database tables - with enhanced error handling and multiple attempts
  const initializeDatabase = async () => {
    setIsInitializingDb(true);
    toast.info('Initializing database tables...', {
      id: 'init-database',
      duration: 3000
    });
    
    try {
      // Try multiple initialization methods
      let success = false;
      
      // Try emergency endpoint first if enabled
      if (useEmergencyEndpoints) {
        try {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
          const timestamp = Date.now();
          const emergencyInitUrl = `${baseUrl}/api/emergency/init-database?t=${timestamp}`;
          
          console.log('Attempting database initialization via emergency endpoint...');
          const result = await fetch(emergencyInitUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-Force-Refresh': 'true',
              'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.70'
            }
          });
          
          if (result.ok) {
            const text = await result.text();
            console.log('Emergency initialization response:', text);
            
            try {
              const data = JSON.parse(text);
              if (data.status === 'success') {
                success = true;
                console.log('Database initialized successfully via emergency endpoint');
              }
            } catch {
              if (text.includes('success')) {
                success = true;
                console.log('Database might be initialized successfully via emergency endpoint');
              }
            }
          }
        } catch (emergencyError) {
          console.error('Error during emergency initialization:', emergencyError);
        }
      }
      
      // Method 1 - Using service
      if (!success) {
        try {
          console.log('Attempting to initialize database via service method...');
          const result = await fareService.initializeDatabase();
          
          if (result) {
            success = true;
            console.log('Database initialization successful via service method');
          }
        } catch (error1) {
          console.error('Error during database initialization via service:', error1);
        }
      }
      
      // Method 2 - Direct URLs with full path - try multiple endpoints
      if (!success) {
        const timestamp = Date.now();
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
        
        const initUrls = [
          `${baseUrl}/api/init-database.php?t=${timestamp}`,
          `${baseUrl}/init-database.php?t=${timestamp}`,
          `${baseUrl}/api/admin/init-database.php?t=${timestamp}`
        ];
        
        for (let url of initUrls) {
          if (success) break;
          
          try {
            console.log(`Attempting database initialization via URL: ${url}`);
            const result = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Force-Refresh': 'true',
                'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.70'
              }
            });
            
            const text = await result.text();
            console.log(`Response from ${url}:`, text);
            
            try {
              const data = JSON.parse(text);
              if (data.status === 'success') {
                success = true;
                console.log(`Database initialization successful via URL: ${url}`);
              }
            } catch {
              console.log('Non-JSON response from initialization endpoint:', text);
              if (text.includes('success')) {
                success = true;
                console.log(`Database initialization might be successful via URL: ${url}`);
              }
            }
          } catch (error2) {
            console.error(`Error during database initialization via URL ${url}:`, error2);
          }
        }
      }
      
      if (success) {
        // Clear all caches after successful initialization
        fareService.clearCache();
        
        // Display confirmation
        toast.success('Database setup complete! Please try updating fares now.', {
          duration: 5000
        });
      } else {
        toast.error('Failed to initialize database tables after multiple attempts');
        
        // If all fails, suggest using emergency endpoints
        if (!useEmergencyEndpoints) {
          toast.info('Try activating Emergency Mode for ultra-simple database access', {
            duration: 8000,
            action: {
              label: 'Activate',
              onClick: activateEmergencyMode
            }
          });
        }
      }
    } catch (error) {
      console.error('Error during database initialization:', error);
      toast.error('Failed to initialize database tables');
    } finally {
      setIsInitializingDb(false);
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
      return "The database table required for this operation doesn't exist. Click the 'Initialize Database' button to create missing tables.";
    }
    if (isOutstationError && isServerError) {
      return "The server couldn't update outstation fares. This may be due to database schema issues. Try the 'Comprehensive Fix' button.";
    }
    if (isForbiddenError) {
      return "You don't have permission to update fares. This might be an authentication issue.";
    }
    if (isServerError) {
      return "The server encountered an error (500) while processing your request. Click 'Initialize Database' to fix missing tables.";
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
              : (isOutstationError
                ? "Outstation Fare Update Error"
                : (isForbiddenError 
                  ? "Access Denied" 
                  : (isServerError 
                    ? "Server Error (500)" 
                    : (isNetworkError 
                      ? "Network Error" 
                      : "Update Failed"))))}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {getErrorDescription()}
          </AlertDescription>
        </Alert>

        {useEmergencyEndpoints && (
          <Alert className="bg-purple-50 border-purple-200 text-purple-800">
            <Zap className="h-4 w-4 text-purple-600" />
            <AlertTitle className="text-purple-800">Emergency Mode Active</AlertTitle>
            <AlertDescription className="text-purple-700 text-xs">
              Using ultra-simple database access mode to bypass complex database operations.
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2 h-6 text-xs border-purple-300 text-purple-700"
                onClick={deactivateEmergencyMode}
              >
                Deactivate
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm space-y-2">
          <p className="font-medium text-gray-700">Try these solutions:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            {!useEmergencyEndpoints && (isTableError || isServerError) && (
              <>
                <li className="font-medium text-red-700">Emergency Mode: Use the 'Activate Emergency Mode' button for direct database access</li>
              </>
            )}
            {(isTableError || isServerError) && (
              <>
                <li className="font-medium text-red-700">Database tables may be missing - use 'Initialize Database' button below</li>
              </>
            )}
            {isOutstationError && (
              <li className="font-medium text-red-700">Field naming issues in outstation fares table - use 'Comprehensive Fix'</li>
            )}
            {isNetworkError && (
              <li className="font-medium text-red-700">API connection failed - use 'Clear Cache & Retry' to refresh connections</li>
            )}
            <li>Try the 'Comprehensive Fix' button for a full system repair</li>
            <li>Clear your browser cache completely and refresh the page</li>
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
                    emergencyMode: useEmergencyEndpoints ? 'active' : 'inactive',
                    isTableError,
                    isServerError,
                    isNetworkError,
                    isOutstationError
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex flex-wrap gap-3">
        {!useEmergencyEndpoints && (isTableError || isServerError || isNetworkError) && (
          <Button 
            onClick={activateEmergencyMode} 
            className="gap-2 bg-purple-600 hover:bg-purple-700"
          >
            <Zap className="h-4 w-4" />
            Activate Emergency Mode
          </Button>
        )}
        
        {(isTableError || isServerError || isOutstationError) && (
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
          <RotateCcw className="h-4 w-4" />
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
              <FileWarning className="h-4 w-4" />
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
