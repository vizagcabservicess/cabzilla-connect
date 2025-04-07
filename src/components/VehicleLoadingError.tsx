
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from 'sonner';
import { fixDatabaseTables, forceRefreshVehicles } from '@/utils/apiHelper';

interface VehicleLoadingErrorProps {
  onRetry?: () => void;
  onFixDatabase?: () => void;
}

export function VehicleLoadingError({ onRetry, onFixDatabase }: VehicleLoadingErrorProps) {
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [isFixing, setIsFixing] = React.useState(false);

  const handleRetry = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    try {
      if (onRetry) {
        onRetry();
      } else {
        // Default retry behavior
        toast.info('Refreshing vehicle data...');
        await forceRefreshVehicles();
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      console.error('Error retrying vehicle load:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleFixDatabase = async () => {
    if (isFixing) return;
    
    setIsFixing(true);
    try {
      if (onFixDatabase) {
        onFixDatabase();
      } else {
        // Default fix database behavior
        toast.info('Fixing database...');
        await fixDatabaseTables();
        toast.success('Database fix complete. Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      console.error('Error fixing database:', error);
      toast.error('Failed to fix database');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
      <div className="flex items-start space-x-4">
        <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-700 dark:text-red-400 mb-2">Error Loading Vehicles</h3>
          <p className="text-sm text-red-600 dark:text-red-300 mb-4">
            There was a problem loading the vehicle list. Please try again.
          </p>
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded text-xs font-mono text-red-800 dark:text-red-200 mb-4">
            HTTP error 404
          </div>
          
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRetry}
              disabled={isRetrying}
              className="bg-white dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleFixDatabase}
              disabled={isFixing}
              className="bg-white dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300"
            >
              Fix Database
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
