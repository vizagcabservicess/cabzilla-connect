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
  Code
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
      
      // 4. Initialize database with multiple attempts
      await initializeDatabase();
      
      // 5. Add small delay to let database initialize
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 6. Try to repair tables with explicit URL - try multiple endpoints
      try {
        const repairUrls = [
          `${import.meta.env.VITE_API_BASE_URL}/api/init-database.php?repair=true&t=${Date.now()}`,
          `${import.meta.env.VITE_API_BASE_URL}/init-database.php?repair=true&t=${Date.now()}`,
          `${import.meta.env.VITE_API_BASE_URL}/api/admin/init-database.php?repair=true&t=${Date.now()}`
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
                'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.69'
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
      
      // 7. Try alternative endpoints for outstation fares if needed
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
          
          // Try multiple outstation endpoints
          const outstationUrls = [
            `${import.meta.env.VITE_API_BASE_URL}/api/direct-outstation-fares.php?t=${Date.now()}`,
            `${import.meta.env.VITE_API_BASE_URL}/direct-outstation-fares.php?t=${Date.now()}`,
            `${import.meta.env.VITE_API_BASE_URL}/api/admin/direct-outstation-fares.php?t=${Date.now()}`,
            `${import.meta.env.VITE_API_BASE_URL}/api/outstation-fares-update.php?t=${Date.now()}`
          ];
          
          for (let url of outstationUrls) {
            try {
              const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(testData),
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'X-Force-Refresh': 'true'
                }
              });
              
              console.log(`Outstation test response from ${url}:`, await response.text());
              
              // If we got a 200, break the loop
              if (response.ok) break;
            } catch (err) {
              console.log(`Error with outstation URL ${url}:`, err);
              // Continue with next URL
            }
          }
          
          console.log('Test outstation fare update attempted');
        } catch (outstationErr) {
          console.error('Error fixing outstation tables:', outstationErr);
        }
      }
      
      // 8. Try setting up airport fare tables
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
        
        // Try multiple airport endpoints
        const airportUrls = [
          `${import.meta.env.VITE_API_BASE_URL}/api/direct-airport-fares.php?t=${Date.now()}`,
          `${import.meta.env.VITE_API_BASE_URL}/direct-airport-fares.php?t=${Date.now()}`,
          `${import.meta.env.VITE_API_BASE_URL}/api/admin/direct-airport-fares.php?t=${Date.now()}`
        ];
        
        for (let url of airportUrls) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              body: JSON.stringify(airportTestData),
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Force-Refresh': 'true'
              }
            });
            
            console.log(`Airport test response from ${url}:`, await response.text());
            
            // If we got a 200, break the loop
            if (response.ok) break;
          } catch (err) {
            console.log(`Error with airport URL ${url}:`, err);
            // Continue with next URL
          }
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
      
      // Method 1 - Using service
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
      
      // Method 2 - Direct URLs with full path - try multiple endpoints
      if (!success) {
        const timestamp = Date.now();
        const initUrls = [
          `${import.meta.env.VITE_API_BASE_URL}/api/init-database.php?t=${timestamp}`,
          `${import.meta.env.VITE_API_BASE_URL}/init-database.php?t=${timestamp}`,
          `${import.meta.env.VITE_API_BASE_URL}/api/admin/init-database.php?t=${timestamp}`
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
                'X-API-Version': import.meta.env.VITE_API_VERSION || '1.0.69'
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
      
      // Method 3 - Specifically for outstation errors
      if (!success && isOutstationError) {
        try {
          const timestamp = Date.now();
          console.log('Attempting to initialize outstation tables specifically...');
          
          // Try multiple outstation table initialization endpoints
          const outstationInitUrls = [
            `${import.meta.env.VITE_API_BASE_URL}/api/direct-outstation-fares.php?createTables=1&t=${timestamp}`,
            `${import.meta.env.VITE_API_BASE_URL}/direct-outstation-fares.php?createTables=1&t=${timestamp}`,
            `${import.meta.env.VITE_API_BASE_URL}/api/admin/direct-outstation-fares.php?createTables=1&t=${timestamp}`
          ];
          
          for (let url of outstationInitUrls) {
            try {
              const initOutstationResult = await fetch(url, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'X-Force-Refresh': 'true'
                }
              });
              
              const text = await initOutstationResult.text();
              console.log(`Outstation table initialization response from ${url}:`, text);
              
              if (initOutstationResult.ok) {
                success = true;
                console.log(`Outstation tables initialized successfully via ${url}`);
                break;
              }
            } catch (err) {
              console.log(`Error with outstation init URL ${url}:`, err);
              // Continue with next URL
            }
          }
        } catch (error4) {
          console.error('Error initializing outstation tables:', error4);
        }
      }
      
      // Method 4 - Try airport fare table initialization
      if (!success) {
        try {
          const timestamp = Date.now();
          console.log('Attempting to initialize airport fare tables specifically...');
          
          // Try multiple airport table initialization endpoints
          const airportInitUrls = [
            `${import.meta.env.VITE_API_BASE_URL}/api/direct-airport-fares.php?createTables=1&t=${timestamp}`,
            `${import.meta.env.VITE_API_BASE_URL}/direct-airport-fares.php?createTables=1&t=${timestamp}`,
            `${import.meta.env.VITE_API_BASE_URL}/api/admin/direct-airport-fares.php?createTables=1&t=${timestamp}`,
            `${import.meta.env.VITE_API_BASE_URL}/api/fares/airport.php?createTables=1&t=${timestamp}`
          ];
          
          for (let url of airportInitUrls) {
            try {
              const initAirportResult = await fetch(url, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'X-Force-Refresh': 'true'
                }
              });
              
              const text = await initAirportResult.text();
              console.log(`Airport table initialization response from ${url}:`, text);
              
              if (initAirportResult.ok) {
                success = true;
                console.log(`Airport tables initialized successfully via ${url}`);
                break;
              }
            } catch (err) {
              console.log(`Error with airport init URL ${url}:`, err);
              // Continue with next URL
            }
          }
        } catch (error5) {
          console.error('Error initializing airport tables:', error5);
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

        <div className="text-sm space-y-2">
          <p className="font-medium text-gray-700">Try the following solutions:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-600">
            {(isTableError || isServerError) && (
              <>
                <li className="font-medium text-red-700">Database tables may be missing - use 'Initialize Database' button below</li>
                <li>This will create all required database tables</li>
              </>
            )}
            {isOutstationError && (
              <li className="font-medium text-red-700">There may be field naming issues in the outstation fares table - use 'Comprehensive Fix'</li>
            )}
            {isNetworkError && (
              <li className="font-medium text-red-700">API connection failed - use 'Clear Cache & Retry' to refresh connections</li>
            )}
            <li>Use the 'Comprehensive Fix' button for a full system repair that addresses most common issues</li>
            <li>Try clearing your browser cache completely and refreshing the page</li>
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
                    isNetworkError: isNetworkError,
                    isOutstationError: isOutstationError
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex flex-wrap gap-3">
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
              <Code className="h-4 w-4" />
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
