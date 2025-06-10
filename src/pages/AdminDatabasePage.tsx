import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Database, FileWarning, HardDrive, RefreshCw, Check, Wrench } from 'lucide-react';
import { fareService } from '@/services/fareService';
import { FareUpdateError } from '@/components/cab-options/FareUpdateError';
import axios from 'axios';
import { apiBaseUrl } from '@/config/api';

export default function AdminDatabasePage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [forceRecreate, setForceRecreate] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const initializeDatabase = async () => {
    setIsInitializing(true);
    setError(null);
    setResult(null);
    
    try {
      const params = new URLSearchParams();
      if (forceRecreate) {
        params.append('force', 'true');
      }
      params.append('verbose', 'true');
      
      // Call initializeDatabase
      const result = await fareService.initializeDatabase();
      setResult(result);
      
      if (result?.status === 'success') {
        toast.success('Database initialized successfully');
      } else {
        toast.error('Database initialization had issues');
        setError(new Error('Database initialization failed: ' + (result?.message || 'Unknown error')));
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      toast.error('Failed to initialize database');
    } finally {
      setIsInitializing(false);
    }
  };

  const fixDatabaseTables = async () => {
    setIsFixing(true);
    setError(null);
    
    try {
      // Use improved fixDatabaseTables function from apiHelper
      const success = await import('@/utils/apiHelper')
        .then(({ fixDatabaseTables }) => fixDatabaseTables());
      
      if (success) {
        toast.success('Database tables fixed successfully');
        // Trigger diagnostics to see the results
        runDiagnostics();
      } else {
        toast.error('Database fix had issues');
        setError(new Error('Database fix failed'));
      }
    } catch (err) {
      console.error('Error fixing database tables:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      toast.error('Failed to fix database tables');
    } finally {
      setIsFixing(false);
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosing(true);
    setError(null);
    
    try {
      // Call our new diagnostic endpoint
      const timestamp = Date.now();
      const response = await axios.get(`${apiBaseUrl}/api/admin/diagnose-database.php?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.data) {
        setDiagnostics(response.data);
        
        if (response.data.status === 'success') {
          toast.success('Database diagnostics completed successfully');
        } else if (response.data.status === 'warning') {
          toast.warning('Database diagnostics found some issues');
        } else {
          toast.error('Database diagnostics found critical issues');
        }
      } else {
        toast.error('Failed to run database diagnostics');
        setError(new Error('Failed to run database diagnostics'));
      }
    } catch (err) {
      console.error('Error running database diagnostics:', err);
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      toast.error('Failed to run database diagnostics');
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-medium mb-6">Database Management</h1>
      
      <Tabs defaultValue="diagnostics">
        <TabsList className="mb-4">
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="fix">Fix Database Issues</TabsTrigger>
          <TabsTrigger value="initialize">Initialize Database</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
        </TabsList>
        
        <TabsContent value="diagnostics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Diagnostics
              </CardTitle>
              <CardDescription>
                Check your database connectivity and table status to identify and fix any issues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={runDiagnostics}
                disabled={isDiagnosing}
                className="bg-blue-600 hover:bg-blue-700 mb-4"
              >
                {isDiagnosing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Diagnostics...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Run Database Diagnostics
                  </>
                )}
              </Button>
              
              {diagnostics && (
                <div className="mt-4">
                  <div className={`px-4 py-3 rounded-md mb-4 ${
                    diagnostics.status === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
                    diagnostics.status === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
                    'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <p className="font-medium">{diagnostics.message}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Test Results:</h3>
                    {diagnostics.tests.map((test: any, index: number) => (
                      <div key={index} className="border rounded-md p-3">
                        <div className="flex items-center">
                          {test.status === 'success' && <Check className="h-4 w-4 text-green-600 mr-2" />}
                          {test.status === 'warning' && <FileWarning className="h-4 w-4 text-yellow-600 mr-2" />}
                          {test.status === 'error' && <FileWarning className="h-4 w-4 text-red-600 mr-2" />}
                          <span className="font-medium">{test.name}</span>
                        </div>
                        {test.message && <p className="text-sm text-gray-600 mt-1">{test.message}</p>}
                        {test.details && <p className="text-sm text-gray-500 mt-1">{test.details}</p>}
                        {test.warnings && (
                          <p className="text-sm text-yellow-600 mt-1">Warning: {test.warnings}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="font-medium text-lg">Recommendations:</h3>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        {diagnostics.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {(diagnostics.status === 'warning' || diagnostics.status === 'error') && (
                    <Button
                      onClick={fixDatabaseTables}
                      disabled={isFixing}
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700"
                    >
                      {isFixing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Fixing Issues...
                        </>
                      ) : (
                        <>
                          <Wrench className="mr-2 h-4 w-4" />
                          Fix Identified Issues
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="fix">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Fix Database Issues
              </CardTitle>
              <CardDescription>
                Fix common database schema issues and ensure all tables have the required columns. Use this if you're experiencing problems with fare updates or missing data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This will fix schema issues, add missing columns, and ensure all vehicles have proper pricing entries. It will not delete any data.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter>
              <Button
                onClick={fixDatabaseTables}
                disabled={isFixing}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {isFixing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  <>
                    <Wrench className="mr-2 h-4 w-4" />
                    Fix Database Issues
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="initialize">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Initialization
              </CardTitle>
              <CardDescription>
                Set up or reset the database tables and seed with initial data. This is useful for a fresh installation or when database tables are missing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-4">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>
                  {forceRecreate 
                    ? "This will DROP and recreate ALL database tables. Any existing data will be lost."
                    : "This will create missing tables or add missing columns to existing tables. Existing data will be preserved."}
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="forceRecreate"
                  checked={forceRecreate}
                  onChange={(e) => setForceRecreate(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="forceRecreate" className="text-red-600 font-medium">
                  Force recreation of all tables (CAUTION: Deletes all existing data)
                </label>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                onClick={initializeDatabase}
                disabled={isInitializing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isInitializing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    <HardDrive className="mr-2 h-4 w-4" />
                    Initialize Database
                  </>
                )}
              </Button>
              
              {result && result.status === 'success' && (
                <div className="flex items-center text-green-600">
                  <Check className="mr-1 h-4 w-4" />
                  Database initialized successfully
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Database Backup & Restore</CardTitle>
              <CardDescription>
                Coming soon: Tools to backup and restore your database.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>This feature is currently under development.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {result && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-lg">Operation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium mb-2">Status: {result.status}</h3>
              <p className="mb-2">{result.message}</p>
              
              {result.details && (
                <>
                  {result.details.tables_fixed && result.details.tables_fixed.length > 0 && (
                    <div className="mb-2">
                      <h4 className="font-medium text-green-700">Tables Fixed:</h4>
                      <ul className="list-disc pl-5">
                        {result.details.tables_fixed.map((table: string, index: number) => (
                          <li key={index}>{table}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.details.vehicle_pricing_entries && result.details.vehicle_pricing_entries.length > 0 && (
                    <div className="mb-2">
                      <h4 className="font-medium text-green-700">Vehicle Pricing Entries:</h4>
                      <ul className="list-disc pl-5">
                        {result.details.vehicle_pricing_entries.map((entry: string, index: number) => (
                          <li key={index}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.details.tables_failed && result.details.tables_failed.length > 0 && (
                    <div className="mb-2">
                      <h4 className="font-medium text-red-700">Tables Failed:</h4>
                      <ul className="list-disc pl-5">
                        {result.details.tables_failed.map((table: string, index: number) => (
                          <li key={index}>{table}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.details.errors && result.details.errors.length > 0 && (
                    <div className="mb-2">
                      <h4 className="font-medium text-red-700">Errors:</h4>
                      <ul className="list-disc pl-5">
                        {result.details.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              
              {result.tables_created && result.tables_created.length > 0 && (
                <div className="mb-2">
                  <h4 className="font-medium text-green-700">Tables Created:</h4>
                  <ul className="list-disc pl-5">
                    {result.tables_created.map((table: string, index: number) => (
                      <li key={index}>{table}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.tables_failed && result.tables_failed.length > 0 && (
                <div className="mb-2">
                  <h4 className="font-medium text-red-700">Tables Failed:</h4>
                  <ul className="list-disc pl-5">
                    {result.tables_failed.map((table: string, index: number) => (
                      <li key={index}>{table}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {result.messages && result.messages.length > 0 && (
                <div>
                  <h4 className="font-medium">Details:</h4>
                  <ul className="list-disc pl-5">
                    {result.messages.map((message: string, index: number) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {error && (
        <div className="mt-4">
          <FareUpdateError 
            error={error} 
            title="Operation Failed"
            onRetry={isInitializing ? initializeDatabase : fixDatabaseTables}
          />
        </div>
      )}
    </div>
  );
}
