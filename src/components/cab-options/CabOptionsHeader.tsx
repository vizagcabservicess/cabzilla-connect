
import React from 'react';
import { Button } from "@/components/ui/button";
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
      <h3 className="text-lg font-semibold text-gray-800">Select a cab type</h3>
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-500">{cabCount} cab types available</div>
        <Button 
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`h-8 px-2 ${refreshFailed ? 'border-red-300' : ''}`}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
