
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import axios from 'axios';
import { getBypassHeaders } from '@/lib';

export function FareUpdateError({ onRetry }: { onRetry?: () => void }) {
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        '/api/admin/database-diagnostic.php',
        { headers: getBypassHeaders() }
      );
      
      setDiagnosticData(response.data);
    } catch (err) {
      console.error('Error running diagnostics:', err);
      setError('Failed to run diagnostics. Please check the server logs.');
    } finally {
      setLoading(false);
    }
  };

  const initializeDatabase = async () => {
    setInitializing(true);
    setError(null);
    
    try {
      const response = await axios.get(
        '/api/admin/database-diagnostic.php?initialize=true',
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
      setError('Failed to initialize database. Please check the server logs.');
      toast.error('Failed to initialize database');
    } finally {
      setInitializing(false);
    }
  };

  // Run diagnostics on mount
  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Database Diagnostic Tool</CardTitle>
        <CardDescription>
          Use this tool to diagnose and fix issues with the vehicle and fare data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
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

        {!diagnosticData && !error && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={runDiagnostics} disabled={loading}>
          {loading ? 'Running...' : 'Run Diagnostics'}
        </Button>
        <Button 
          onClick={initializeDatabase} 
          disabled={initializing || loading}
          className="bg-yellow-500 hover:bg-yellow-600"
        >
          {initializing ? 'Initializing...' : 'Initialize Database'}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default FareUpdateError;
