import React from 'react';
import { MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface TripSummaryProps {
  from: string;
  to: string;
  departureDate: Date;
  departureTime: string;
  arrivalDate: Date;
  arrivalTime: string;
  operator: string;
  vehicleType: string;
  duration: string;
  onViewDetails?: () => void;
}

export const EnhancedTripSummary: React.FC<TripSummaryProps> = ({
  from,
  to,
  departureDate,
  departureTime,
  arrivalDate,
  arrivalTime,
  operator,
  vehicleType,
  duration,
  onViewDetails
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Operator */}
      <div className="text-center mb-4">
        <span className="text-lg font-semibold text-gray-800">{operator}</span>
      </div>
      
      {/* Journey Details */}
      <div className="flex items-center justify-between">
        <div className="text-center flex-1">
          <div className="text-lg font-semibold text-gray-800">{departureTime}</div>
          <div className="text-sm text-gray-600">{format(departureDate, 'dd MMM')}</div>
          <div className="text-sm font-medium text-gray-700">{from}</div>
          <div className="text-xs text-gray-500">VSP</div>
        </div>
        
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="flex items-center">
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full mx-2"></div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
          </div>
          <div className="text-xs text-gray-500 ml-4">{duration}</div>
        </div>
        
        <div className="text-center flex-1">
          <div className="text-lg font-semibold text-gray-800">{arrivalTime}</div>
          <div className="text-sm text-gray-600">{format(arrivalDate, 'dd MMM')}</div>
          <div className="text-sm font-medium text-gray-700">{to}</div>
          <div className="text-xs text-gray-500">PANDIT NEHRU BUS STATION, VIJAYAWADA</div>
        </div>
      </div>
      
      {/* Vehicle Type */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">1 · {vehicleType}</div>
      </div>
      
      {/* View Details Button */}
      {onViewDetails && (
        <div className="mt-4 text-center">
          <button 
            onClick={onViewDetails}
            className="text-blue-600 text-sm font-medium hover:underline"
          >
            View details
          </button>
        </div>
      )}
    </div>
  );
};
