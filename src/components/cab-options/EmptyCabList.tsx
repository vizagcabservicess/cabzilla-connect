
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Database, Car } from 'lucide-react';

interface EmptyCabListProps {
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function EmptyCabList({ onRefresh, isRefreshing }: EmptyCabListProps) {
  return (
    <div className="p-8 text-center border rounded-lg bg-gray-50">
      <div className="flex justify-center mb-4">
        <div className="relative">
          <Car className="h-12 w-12 text-blue-500" />
          <AlertCircle className="h-6 w-6 text-yellow-500 absolute -top-1 -right-1" />
        </div>
      </div>
      <h3 className="font-semibold text-lg mb-2">No Vehicles Available</h3>
      <p className="text-gray-500 mb-4">
        We couldn't find any vehicles matching your criteria. This may be due to a connection issue or because no vehicles have been configured yet.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3 mt-2">
        <Button 
          variant="outline"
          onClick={() => window.location.reload()}
          className="flex items-center justify-center"
        >
          <Database className="h-4 w-4 mr-2" />
          Reload Page
        </Button>
        <Button 
          variant="default"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Vehicles'}
        </Button>
      </div>
      <div className="mt-4 text-xs text-gray-400">
        If the problem persists, please check your database connection or contact support.
      </div>
    </div>
  );
}
