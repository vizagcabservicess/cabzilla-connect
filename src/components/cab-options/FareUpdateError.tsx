
import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

interface FareUpdateErrorProps {
  message?: string;
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export function FareUpdateError({ message, onRefresh, isAdmin = false }: FareUpdateErrorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    toast.info('Refreshing fare data...');
    
    // Clear caches
    fareService.clearCache();
    
    // Wait a moment then call refresh handler
    setTimeout(() => {
      if (onRefresh) {
        onRefresh();
      } else {
        window.location.reload();
      }
      setIsRefreshing(false);
    }, 1000);
  };
  
  const handleInitializeDatabase = async () => {
    setIsInitializing(true);
    toast.info('Initializing database...');
    
    try {
      // Using the correct number of arguments - only pass forceRecreate
      const result = await fareService.initializeDatabase(true);
      console.log('Database initialization result:', result);
      
      if (result?.status === 'success') {
        toast.success('Database initialized successfully');
        // Trigger a refresh after successful initialization
        setTimeout(handleRefresh, 1000);
      } else {
        toast.error('Database initialization failed');
        console.error('Initialization failed:', result);
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      toast.error('Failed to initialize database');
    } finally {
      setIsInitializing(false);
    }
  };
  
  // For direct link to DB endpoint for admin debugging
  const openDbEndpoint = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://saddlebrown-oryx-227656.hostingersite.com';
    window.open(`${baseUrl}/api/admin/direct-local-fares.php?initialize=true&_t=${Date.now()}`, '_blank');
  };
  
  return (
    <Alert variant="destructive" className="mb-4">
      <div className="flex flex-col w-full">
        <div className="flex items-start mb-2">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <div>
            {message || "Failed to update fare data. The server returned an error."}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-1">
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          
          {isAdmin && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleInitializeDatabase}
                disabled={isInitializing}
              >
                <Database className={`h-3.5 w-3.5 mr-1 ${isInitializing ? 'animate-pulse' : ''}`} />
                {isInitializing ? 'Initializing...' : 'Initialize Database'}
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openDbEndpoint}
              >
                Direct Database Access
              </Button>
            </>
          )}
        </div>
      </div>
    </Alert>
  );
}
