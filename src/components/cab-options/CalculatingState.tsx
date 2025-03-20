
import React from 'react';

export function CalculatingState() {
  return (
    <div className="bg-blue-50 p-3 rounded-md flex items-center justify-center mb-3">
      <div className="animate-spin mr-2 h-4 w-4 border-b-2 border-blue-600"></div>
      <span className="text-blue-600 text-sm">Calculating fares...</span>
    </div>
  );
}
