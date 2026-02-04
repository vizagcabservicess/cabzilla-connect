import React from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

interface TourEditModuleProps {
  pickupLocation: string;
  destinationLocation: string;
  pickupDate: Date;
  onEdit: () => void;
}

export const TourEditModule: React.FC<TourEditModuleProps> = ({
  pickupLocation,
  destinationLocation,
  pickupDate,
  onEdit
}) => {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
      aria-label={`Back to edit trip: ${pickupLocation} to ${destinationLocation}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeft className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{pickupLocation}</span>
            <span className="text-gray-400">→</span>
            <span className="font-medium text-gray-900">{destinationLocation}</span>
          </div>
        </div>
        <Edit2 className="h-4 w-4 text-gray-600 hover:text-blue-600 flex-shrink-0" />
      </div>
      <div className="text-sm text-gray-600 mt-2">
        {format(pickupDate, 'EEE, MMM d, yyyy, hh:mm a')}
      </div>
    </button>
  );
};