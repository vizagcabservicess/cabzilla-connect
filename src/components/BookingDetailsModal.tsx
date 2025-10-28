import React from 'react';
import { X, MapPin, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripDetails: {
    operator: string;
    vehicleType: string;
    from: string;
    to: string;
    departureTime: string;
    departureDate: Date;
    arrivalTime: string;
    arrivalDate: Date;
    duration: string;
    seatNumber?: string;
  };
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  isOpen,
  onClose,
  tripDetails
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center p-4 z-50">
      <div className="bg-white rounded-t-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Booking details</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          {/* Operator and Vehicle Type */}
          <div className="mb-4">
            <div className="text-lg font-semibold text-gray-800 mb-1">{tripDetails.operator}</div>
            <div className="text-sm text-gray-600">1 · {tripDetails.vehicleType}</div>
          </div>
          
          {/* Journey Timeline */}
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
                <div className="w-0.5 h-16 bg-gray-300 mt-2"></div>
                <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
              </div>
              
              {/* Journey Details */}
              <div className="flex-1 space-y-8">
                {/* Departure */}
                <div>
                  <div className="text-lg font-semibold text-gray-800">{tripDetails.departureTime}</div>
                  <div className="text-sm text-gray-600">{format(tripDetails.departureDate, 'dd MMM')}</div>
                  <div className="text-sm font-medium text-gray-700">{tripDetails.from}</div>
                  <div className="text-xs text-gray-500">VSP</div>
                </div>
                
                {/* Arrival */}
                <div>
                  <div className="text-lg font-semibold text-gray-800">{tripDetails.arrivalTime}</div>
                  <div className="text-sm text-gray-600">{format(tripDetails.arrivalDate, 'dd MMM')}</div>
                  <div className="text-sm font-medium text-gray-700">{tripDetails.to}</div>
                  <div className="text-xs text-gray-500">PANDIT NEHRU BUS STATION, VIJAYAWADA</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Seat Details */}
          {tripDetails.seatNumber && (
            <div className="pt-4 border-t border-gray-200 mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Seat details</div>
              <div className="text-sm text-gray-600 mb-2">1</div>
              <div className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                {tripDetails.seatNumber}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
