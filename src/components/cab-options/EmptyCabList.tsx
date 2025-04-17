
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export interface EmptyCabListProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function EmptyCabList({ onRefresh, isRefreshing }: EmptyCabListProps) {
  return (
    <div className="text-center py-8">
      <div className="text-gray-500 mb-4">No vehicles available for this trip type.</div>
      <Button 
        onClick={onRefresh} 
        disabled={isRefreshing}
        variant="outline"
        size="sm"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh Vehicle List
      </Button>
    </div>
  );
}
