
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface CabOptionsHeaderProps {
  cabCount: number;
  isRefreshing: boolean;
  refreshFailed: boolean;
  onRefresh: () => void;
}

export function CabOptionsHeader({
  cabCount,
  isRefreshing,
  refreshFailed,
  onRefresh
}: CabOptionsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-lg font-semibold text-gray-800">
        {cabCount > 0 ? `Available Vehicles (${cabCount})` : 'Vehicle Options'}
      </h3>
      
      {refreshFailed && (
        <div className="flex-1 mx-4">
          <p className="text-amber-600 text-xs">Connection issues detected</p>
        </div>
      )}
      
      <Button
        onClick={onRefresh}
        disabled={isRefreshing}
        variant="outline"
        size="sm"
        className="flex items-center"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </Button>
    </div>
  );
}
