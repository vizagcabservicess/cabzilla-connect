
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface EmptyStateProps {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function EmptyState({ isRefreshing, onRefresh }: EmptyStateProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center space-y-4">
      <div className="flex justify-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
      </div>
      
      <h3 className="text-lg font-semibold">No vehicles available</h3>
      
      <p className="text-gray-600 text-sm max-w-md mx-auto">
        We couldn't find any vehicle options. This might be due to a temporary issue with our system.
      </p>
      
      <Button 
        onClick={onRefresh} 
        disabled={isRefreshing} 
        variant="outline" 
        className="mt-4"
      >
        {isRefreshing ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Refreshing...
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Vehicle Options
          </>
        )}
      </Button>
    </div>
  );
}
