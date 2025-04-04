
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusBanner } from './StatusBanner';
import { 
  forceEnableFallbackMode, 
  disableFallbackMode, 
  checkDatabaseConnection,
  fixDatabaseTables,
  getSystemStatus,
  getMockVehicleData
} from "@/utils/apiHelper";
import { Shield, Database, FileJson, Server, RefreshCw, AlertCircle } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function StatusPage() {
  const [isCheckingDb, setIsCheckingDb] = React.useState(false);
  const [dbStatus, setDbStatus] = React.useState<{ working: boolean, message: string } | null>(null);
  const [isFixingDb, setIsFixingDb] = React.useState(false);
  const [vehicleCount, setVehicleCount] = React.useState(0);
  const [isCountingVehicles, setIsCountingVehicles] = React.useState(false);
  const [systemStatus, setSystemStatus] = React.useState(getSystemStatus());
  
  // Check vehicle count on mount
  React.useEffect(() => {
    countVehicles();
  }, []);
  
  const handleCheckDb = async () => {
    setIsCheckingDb(true);
    try {
      const result = await checkDatabaseConnection();
      setDbStatus(result);
      
      if (result.working) {
        toast.success("Database connection successful!");
      } else {
        toast.error(`Database connection failed: ${result.message}`);
      }
    } catch (error) {
      console.error("Error checking database:", error);
      setDbStatus({
        working: false,
        message: error instanceof Error ? error.message : "Unknown error"
      });
      toast.error("Failed to check database connection");
    } finally {
      setIsCheckingDb(false);
    }
  };
  
  const handleFixDb = async () => {
    setIsFixingDb(true);
    try {
      toast.loading("Attempting to fix database...");
      const result = await fixDatabaseTables();
      
      if (result) {
        toast.success("Database tables fixed successfully");
        // Check the connection again
        await handleCheckDb();
      } else {
        toast.error("Failed to fix database tables");
      }
    } catch (error) {
      console.error("Error fixing database:", error);
      toast.error("Failed to fix database tables");
    } finally {
      setIsFixingDb(false);
    }
  };
  
  const countVehicles = async () => {
    setIsCountingVehicles(true);
    try {
      const data = await getMockVehicleData();
      if (data && data.vehicles) {
        setVehicleCount(data.vehicles.length);
      }
    } catch (error) {
      console.error("Error counting vehicles:", error);
    } finally {
      setIsCountingVehicles(false);
    }
  };
  
  const refreshStatus = () => {
    setSystemStatus(getSystemStatus());
    countVehicles();
    handleCheckDb();
    toast.info("System status refreshed");
  };
  
  return (
    <div className="space-y-6">
      <StatusBanner onRefresh={refreshStatus} />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Mode
            </CardTitle>
            <CardDescription>Current system operation mode</CardDescription>
          </CardHeader>
          <CardContent>
            {systemStatus.fallbackMode ? (
              <Alert variant="warning" className="mb-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Fallback Mode Active</AlertTitle>
                <AlertDescription>
                  System is using local storage for data persistence.
                  {systemStatus.fallbackExpiry && (
                    <p className="mt-1">
                      Auto-retry at: {systemStatus.fallbackExpiry}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default" className="mb-2">
                <Server className="h-4 w-4" />
                <AlertTitle>API Mode Active</AlertTitle>
                <AlertDescription>
                  System is using API endpoints for data persistence.
                  {systemStatus.apiErrorCount > 0 && (
                    <p className="mt-1 text-red-600">
                      Warning: {systemStatus.apiErrorCount} recent API errors detected
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant={systemStatus.fallbackMode ? "outline" : "destructive"}
              onClick={() => {
                if (systemStatus.fallbackMode) {
                  disableFallbackMode();
                } else {
                  forceEnableFallbackMode();
                }
                setSystemStatus(getSystemStatus());
              }}
            >
              {systemStatus.fallbackMode ? "Try API Mode" : "Enable Fallback"}
            </Button>
            
            <Button variant="ghost" onClick={() => setSystemStatus(getSystemStatus())}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Status
            </CardTitle>
            <CardDescription>Check database connectivity</CardDescription>
          </CardHeader>
          <CardContent>
            {dbStatus === null ? (
              <div className="text-center py-4 text-gray-500">
                Click "Check Connection" to test database connectivity
              </div>
            ) : (
              <Alert variant={dbStatus.working ? "default" : "destructive"} className="mb-2">
                <AlertTitle>{dbStatus.working ? "Connected" : "Connection Failed"}</AlertTitle>
                <AlertDescription>{dbStatus.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleCheckDb}
              disabled={isCheckingDb}
            >
              {isCheckingDb ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>Check Connection</>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleFixDb}
              disabled={isFixingDb}
            >
              {isFixingDb ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>Fix Database</>
              )}
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Vehicle Data
            </CardTitle>
            <CardDescription>Available vehicle information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Vehicles:</span>
                <span className="font-medium">{vehicleCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Data Source:</span>
                <span className="font-medium">
                  {systemStatus.fallbackMode ? "Local Storage" : "Database API"}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="text-sm text-gray-500">
                {systemStatus.fallbackMode ? (
                  <p>Using browser's localStorage for data persistence. Changes will be available until browser data is cleared.</p>
                ) : (
                  <p>Using API endpoints for data persistence. Changes should be saved to database if connectivity is working.</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={countVehicles}
              disabled={isCountingVehicles}
            >
              {isCountingVehicles ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Counting...
                </>
              ) : (
                <>Refresh Vehicle Count</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
