
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Database, FileWarning, HardDrive, RefreshCw, Check } from 'lucide-react';
import { fareService } from '@/services/fareService';
import { FareUpdateError } from '@/components/cab-options/FareUpdateError';

export default function AdminDatabasePage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const [forceRecreate, setForceRecreate] = useState(false);

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
      
      // Fixed: Call initializeDatabase without the forceRecreate parameter
      // The initializeDatabase function implementation will handle the forceRecreate flag internally
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Database Management</h1>
      
      <Tabs defaultValue="initialize">
        <TabsList className="mb-4">
          <TabsTrigger value="initialize">Initialize Database</TabsTrigger>
          <TabsTrigger value="backup">Backup & Restore</TabsTrigger>
        </TabsList>
        
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
          
          {result && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Initialization Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">Status: {result.status}</h3>
                  <p className="mb-2">{result.message}</p>
                  
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
                title="Database Initialization Failed"
                onRetry={initializeDatabase}
              />
            </div>
          )}
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
    </div>
  );
}
