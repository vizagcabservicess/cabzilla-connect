
import React from 'react';
import { Loader2 } from 'lucide-react';

export function CabLoading() {
  return (
    <div className="space-y-4 mt-6 p-4 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Loading vehicle data...</h3>
      </div>
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
      <div className="text-center text-gray-600 text-sm">
        <p>Please wait while we fetch the latest vehicle data</p>
        <p className="mt-1 text-xs text-gray-500">
          This may take a few seconds. If it continues loading, try refreshing the page.
        </p>
      </div>
    </div>
  );
}
