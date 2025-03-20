
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function RefreshWarning() {
  return (
    <div className="bg-yellow-50 p-3 rounded-md flex items-start space-x-2 mb-4">
      <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-yellow-800 text-sm font-medium">
          Unable to load updated vehicle data
        </p>
        <p className="text-yellow-700 text-xs mt-1">
          We're having trouble connecting to our vehicle database. Using cached data for now. 
          Please try again later or contact support if this problem persists.
        </p>
      </div>
    </div>
  );
}
