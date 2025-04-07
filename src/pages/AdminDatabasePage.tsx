import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Database, AlertCircle, Check } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fixDatabaseTables } from '@/utils/apiHelper';
import { fareService } from '@/services/fareService';

export default function AdminDatabasePage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleInitializeDatabase = async () => {
    setIsInitializing(true);
    setError(null);
    setSuccess(null);
    
    try {
      toast.info("Initializing database...");
      const result = await fareService.initializeDatabase();
      
      if (result) {
        setSuccess("Database initialized successfully!");
        toast.success("Database initialized successfully!");
      } else {
        setError("Failed to initialize database.");
        toast.error("Failed to initialize database.");
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      toast.error(`Error: ${err.message || "An unknown error occurred."}`);
    } finally {
      setIsInitializing(false);
    }
  };
  
  const handleFixDatabase = async () => {
    setIsFixing(true);
    setError(null);
    setSuccess(null);
    
    try {
      toast.info("Fixing database...");
      const result = await fixDatabaseTables();
      
      if (result) {
        setSuccess("Database fixed successfully!");
        toast.success("Database fixed successfully!");
      } else {
        setError("Failed to fix database.");
        toast.error("Failed to fix database.");
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      toast.error(`Error: ${err.message || "An unknown error occurred."}`);
    } finally {
      setIsFixing(false);
    }
  };
  
  const handleCheckDatabase = async () => {
    setIsChecking(true);
    setError(null);
    setSuccess(null);
    
    try {
      toast.info("Checking database connection...");
      
      const response = await fetch('/api/admin/check-connection.php');
      const data = await response.json();
      
      if (data.connection) {
        setSuccess("Database connection successful!");
        toast.success("Database connection successful!");
      } else {
        setError(data.message || "Database connection failed.");
        toast.error(data.message || "Database connection failed.");
      }
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.");
      toast.error(`Error: ${err.message || "An unknown error occurred."}`);
    } finally {
      setIsChecking(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Database Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> Initialize Database
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Initialize the database tables required for the application.
              This will create any missing tables and indexes.
            </p>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
                <Check className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex flex-col gap-4">
              <Button 
                onClick={handleInitializeDatabase}
                disabled={isInitializing}
                className="w-full"
              >
                {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Initialize Database
              </Button>
              
              <Button 
                onClick={handleFixDatabase} 
                variant="outline"
                disabled={isFixing}
                className="w-full"
              >
                {isFixing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fix Database Tables
              </Button>
              
              <Button 
                onClick={handleCheckDatabase}
                variant="secondary"
                disabled={isChecking}
                className="w-full"
              >
                {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check Database Connection
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Other cards can go here */}
      </div>
    </div>
  );
}
