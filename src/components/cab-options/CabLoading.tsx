
import React from 'react';

export function CabLoading() {
  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-gray-800">Loading cab options...</h3>
      </div>
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
      </div>
    </div>
  );
}
