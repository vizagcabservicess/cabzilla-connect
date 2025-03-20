
import React from 'react';
import { AlertCircle } from 'lucide-react';

export function CabRefreshWarning({ message }: { message?: string }) {
  return (
    <div className="bg-yellow-50 p-3 rounded-md text-yellow-800 text-sm mb-4 flex items-start">
      <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 text-yellow-600" />
      <div>
        {message || "Unable to load updated vehicle data. Using cached data. Some features may not work properly."}
      </div>
    </div>
  );
}
