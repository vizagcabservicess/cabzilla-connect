
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Database, AlertTriangle } from "lucide-react";
import { toast } from 'sonner';
import { fixDatabaseTables, forceRefreshVehicles } from '@/utils/apiHelper';
import { LoadingError } from './ErrorNotifications';

interface VehicleFallbackDisplayProps {
  error?: Error | null;
  onRefresh?: () => void;
}

export function VehicleFallbackDisplay({ error, onRefresh }: VehicleFallbackDisplayProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    toast.info('Refreshing vehicle data...');
    
    try {
      await forceRefreshVehicles();
      toast.success('Vehicle data refreshed');
      
      if (onRefresh) {
        onRefresh();
      } else {
        // Reload the page if no refresh callback is provided
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      toast.error('Failed to refresh vehicle data');
      console.error('Failed to refresh vehicles:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const handleFixDatabase = async () => {
    if (isFixing) return;
    
    setIsFixing(true);
    toast.info('Fixing database...');
    
    try {
      const success = await fixDatabaseTables();
      if (success) {
        toast.success('Database fixed successfully');
        
        // Try to refresh vehicles after fixing database
        await forceRefreshVehicles();
        
        if (onRefresh) {
          onRefresh();
        } else {
          // Reload the page if no refresh callback is provided
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        toast.error('Failed to fix database');
      }
    } catch (error) {
      toast.error('Failed to fix database');
      console.error('Failed to fix database:', error);
    } finally {
      setIsFixing(false);
    }
  };
  
  return (
    <div className="w-full">
      <LoadingError 
        message="There was a problem loading the vehicle data. This is likely a temporary issue."
        errorCode={error?.message || "HTTP error 404"}
        onRetry={handleRefresh}
        onFixDatabase={handleFixDatabase}
      />
      
      <Card className="w-full bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span>Vehicle Data Unavailable</span>
          </CardTitle>
          <CardDescription>
            Default vehicle data is being used. You can try to refresh the data or fix the database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground">
              This can happen if the server is unavailable or there's a connection issue. The application will still work with default vehicle data.
            </p>
            
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="secondary" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Vehicles'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleFixDatabase}
                disabled={isFixing}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                {isFixing ? 'Fixing...' : 'Fix Database'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
