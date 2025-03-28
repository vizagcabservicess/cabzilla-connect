
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import axios from 'axios';
import { getBypassHeaders } from '@/lib';

interface ErrorData {
  message: string;
  stack?: string;
  file?: string;
  line?: number;
}

export function FareUpdateError({ 
  onRetry,
  error,
  title = "Database Diagnostic Tool",
  description = "Use this tool to diagnose and fix issues with the vehicle and fare data"
}: { 
  onRetry?: () => void;
  error?: Error | string | null;
  title?: string;
  description?: string;
}) {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [syncingTables, setSyncingTables] = useState(false);
  const [syncingVehicles, setSyncingVehicles] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(error ? (typeof error === 'string' ? error : error.message) : null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

  const runDiagnostics = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/admin/database-diagnostic.php`,
        { headers: getBypassHeaders() }
      );
      
      setDiagnosticData(response.data);
    } catch (err) {
      console.error('Error running diagnostics:', err);
      setErrorMsg('Failed to run diagnostics. Please check the server logs.');
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setInitializing(true);
    setErrorMsg(null);
    
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/admin/database-diagnostic.php?initialize=true`,
        { headers: getBypassHeaders() }
      );
      
      setDiagnosticData(response.data);
      toast.success('Database initialized successfully');
      
      // Call onRetry callback if provided
      if (onRetry) {
        setTimeout(() => {
          onRetry();
        }, 1000);
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      setErrorMsg('Failed to initialize database. Please check the server logs.');
      toast.error('Failed to initialize database');
    } finally {
      setInitializing(false);
    }
  };

  const syncTables = async () => {
    setSyncingTables(true);
    setErrorMsg(null);
    
    try {
      const response = await axios.get(
        `${apiBaseUrl}/api/admin/sync-local-fares.php?_t=${Date.now()}`,
        { headers: getBypassHeaders() }
      );
      
      console.log('Table sync response:', response.data);
      
      if (response.data.status === 'success') {
        toast.success('Tables synchronized successfully');
        
        // Refresh diagnostics to show latest state
        await runDiagnostics();
        
        // Call onRetry callback if provided
        if (onRetry) {
          setTimeout(() => {
            onRetry();
          }, 1000);
        }
      } else {
        setErrorMsg(`Table sync failed: ${response.data.message || 'Unknown error'}`);
        toast.error('Failed to synchronize tables');
      }
    } catch (err) {
      console.error('Error syncing tables:', err);
      setErrorMsg(`Failed to sync tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to synchronize tables');
    } finally {
      setSyncingTables(false);
    }
  };
  
  const syncVehicles = async () => {
    setSyncingVehicles(true);
    setErrorMsg(null);
    
    try {
      // Attempt to sync vehicle tables to ensure consistency between vehicle_types, vehicles, and vehicle_pricing
      const response = await axios.get(
        `${apiBaseUrl}/api/admin/sync-vehicle-tables.php?_t=${Date.now()}`,
        { headers: getBypassHeaders() }
      );
      
      console.log('Vehicle tables sync response:', response.data);
      
      if (response.data.status === 'success') {
        toast.success('Vehicle tables synchronized successfully');
        
        // Refresh diagnostics to show latest state
        await runDiagnostics();
        
        // Call onRetry callback if provided
        if (onRetry) {
          setTimeout(() => {
            onRetry();
          }, 1000);
        }
      } else {
        setErrorMsg(`Vehicle tables sync failed: ${response.data.message || 'Unknown error'}`);
        toast.error('Failed to synchronize vehicle tables');
      }
    } catch (err) {
      console.error('Error syncing vehicle tables:', err);
      setErrorMsg(`Failed to sync vehicle tables: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to synchronize vehicle tables');
    } finally {
      setSyncingVehicles(false);
    }
  };
  
  const repairDatabase = async () => {
    setRepairing(true);
    setErrorMsg(null);
    
    try {
      // Attempt to repair the database structure
      const response = await axios.get(
        `${apiBaseUrl}/api/admin/database-diagnostic.php?repair=true`,
        { headers: getBypassHeaders() }
      );
      
      console.log('Database repair response:', response.data);
      
      if (response.data.status === 'success') {
        toast.success('Database repair completed successfully');
        
        // First sync tables to ensure all data is consistent
        await syncTables();
        
        // Refresh diagnostics to show latest state
        await runDiagnostics();
        
        // Call onRetry callback if provided
        if (onRetry) {
          setTimeout(() => {
            onRetry();
          }, 1000);
        }
      } else {
        setErrorMsg(`Database repair failed: ${response.data.message || 'Unknown error'}`);
        toast.error('Failed to repair database');
      }
    } catch (err) {
      console.error('Error repairing database:', err);
      setErrorMsg(`Failed to repair database: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to repair database');
    } finally {
      setRepairing(false);
    }
  };

  // Run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        {diagnosticData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${diagnosticData.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">
                Status: {diagnosticData.status === 'healthy' ? 'Healthy' : 'Issues Found'}
              </span>
            </div>

            {diagnosticData.issues && diagnosticData.issues.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Issues Found</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 mt-2">
                    {diagnosticData.issues.map((issue: string, index: number) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tables">
                <AccordionTrigger>Database Tables</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {Object.entries(diagnosticData.tables || {}).map(([tableName, tableInfo]: [string, any]) => (
                      <div key={tableName} className="p-2 border rounded">
                        <div className="font-medium">{tableName}</div>
                        <div className="text-sm text-gray-500">Rows: {tableInfo.row_count}</div>
                        <div className="text-xs text-gray-400">
                          Columns: {Array.isArray(tableInfo.columns) ? tableInfo.columns.join(', ') : 'None'}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {diagnosticData.php_info && (
                <AccordionItem value="php">
                  <AccordionTrigger>PHP Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm">
                      <div>Version: {diagnosticData.php_info.version}</div>
                      <div>Memory Limit: {diagnosticData.php_info.memory_limit}</div>
                      <div>Max Execution Time: {diagnosticData.php_info.max_execution_time}</div>
                      <div>Post Max Size: {diagnosticData.php_info.post_max_size}</div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {diagnosticData.server_info && (
                <AccordionItem value="server">
                  <AccordionTrigger>Server Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm">
                      <div>Software: {diagnosticData.server_info.server_software}</div>
                      <div>Host: {diagnosticData.server_info.http_host}</div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
        )}

        {!diagnosticData && !errorMsg && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={runDiagnostics} disabled={loading}>
          {loading ? 'Running...' : 'Run Diagnostics'}
        </Button>
        <Button 
          variant="outline" 
          onClick={syncTables} 
          disabled={syncingTables || loading || initializing || repairing || syncingVehicles}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          {syncingTables ? 'Syncing...' : 'Sync Tables'}
        </Button>
        <Button 
          variant="outline" 
          onClick={syncVehicles} 
          disabled={syncingVehicles || loading || initializing || repairing || syncingTables}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          {syncingVehicles ? 'Syncing...' : 'Sync Vehicles'}
        </Button>
        <Button 
          onClick={repairDatabase} 
          disabled={repairing || loading || initializing || syncingTables || syncingVehicles}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {repairing ? 'Repairing...' : 'Repair Database'}
        </Button>
        <Button 
          onClick={initializeDatabase} 
          disabled={initializing || loading || syncingTables || repairing || syncingVehicles}
          className="bg-yellow-500 hover:bg-yellow-600 text-white"
        >
          {initializing ? 'Initializing...' : 'Initialize Database'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default FareUpdateError;
