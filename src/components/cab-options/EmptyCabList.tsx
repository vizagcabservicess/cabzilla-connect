
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface EmptyCabListProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function EmptyCabList({ onRefresh, isRefreshing }: EmptyCabListProps) {
  return (
    <div className="p-8 text-center border rounded-lg bg-gray-50">
      <p className="text-gray-500">No vehicles available. Please try refreshing.</p>
      <Button 
        variant="default"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="mt-4"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh Vehicles
      </Button>
    </div>
  );
}
