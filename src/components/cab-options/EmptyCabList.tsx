
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface EmptyCabListProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function EmptyCabList({ onRefresh, isRefreshing }: EmptyCabListProps) {
  return (
    <div className="p-8 text-center border rounded-lg bg-gray-50">
      <div className="flex justify-center mb-4">
        <AlertCircle className="h-10 w-10 text-yellow-500" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No Vehicles Available</h3>
      <p className="text-gray-500 mb-4">
        We couldn't find any vehicles matching your criteria. This may be due to a connection issue or because no vehicles have been configured yet.
      </p>
      <Button 
        variant="default"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="mt-2"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh Vehicles'}
      </Button>
    </div>
  );
}
