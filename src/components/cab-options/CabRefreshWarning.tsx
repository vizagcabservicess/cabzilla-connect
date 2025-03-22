
import React from 'react';
import { AlertCircle, RefreshCw, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fareService } from '@/services/fareService';
import { toast } from 'sonner';

interface CabRefreshWarningProps {
  message?: string;
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export function CabRefreshWarning({ message, onRefresh, isAdmin = false }: CabRefreshWarningProps) {
  const handleRefresh = () => {
    // Show toast that we're clearing cache
    toast.info('Clearing all caches and refreshing...', {
      id: 'clearing-cache',
      duration: 2000
    });
    
    // Clear all caches first
    fareService.clearCache();
    
    // Log the forced request config for debugging
    console.log('Using forced request config:', fareService.getForcedRequestConfig());
    
    // Wait a moment for caches to clear
    setTimeout(() => {
      // Then call the onRefresh handler if provided
      if (onRefresh) {
        onRefresh();
      } else {
        // If no handler provided, reload the page
        window.location.reload();
      }
    }, 800);
  };
  
  return (
    <div className="bg-yellow-50 p-3 rounded-md text-yellow-800 text-sm mb-4 flex flex-col">
      <div className="flex items-start mb-2">
        <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-yellow-600" />
        <div>
          {message || "Unable to load updated vehicle data. Using cached data. Some features may not work properly."}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-1">
        <Button 
          variant="outline" 
          size="sm" 
          className="self-start border-yellow-400 bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Clear Cache & Refresh
        </Button>
        
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm" 
            className="self-start border-blue-400 bg-blue-100 hover:bg-blue-200 text-blue-800"
            onClick={() => {
              window.open('https://saddlebrown-oryx-227656.hostingersite.com/api/admin/outstation-fares-update.php', '_blank');
              toast.info('Opened direct API endpoint');
            }}
          >
            <Globe className="h-3.5 w-3.5 mr-1" />
            Test API Directly
          </Button>
        )}
      </div>
    </div>
  );
}
