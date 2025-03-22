
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fareService } from '@/services/fareService';

interface CabRefreshWarningProps {
  message?: string;
  onRefresh?: () => void;
}

export function CabRefreshWarning({ message, onRefresh }: CabRefreshWarningProps) {
  const handleRefresh = () => {
    // Clear all caches first
    fareService.clearCache();
    
    // Then call the onRefresh handler if provided
    if (onRefresh) {
      setTimeout(onRefresh, 500);
    }
  };
  
  return (
    <div className="bg-yellow-50 p-3 rounded-md text-yellow-800 text-sm mb-4 flex flex-col">
      <div className="flex items-start mb-2">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-yellow-600" />
        <div>
          {message || "Unable to load updated vehicle data. Using cached data. Some features may not work properly."}
        </div>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="self-start ml-7 border-yellow-400 bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
        onClick={handleRefresh}
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
        Clear Cache & Refresh
      </Button>
    </div>
  );
}
