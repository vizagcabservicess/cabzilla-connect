
import React from 'react';
import { Button } from "@/components/ui/button";
import { BookingStatus } from '@/types/api';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

interface BookingStatusFlowProps {
  currentStatus: BookingStatus;
  onStatusChange: (newStatus: BookingStatus) => Promise<void>;
  isSubmitting: boolean; // Added isSubmitting prop
}

export function BookingStatusFlow({ 
  currentStatus, 
  onStatusChange,
  isSubmitting
}: BookingStatusFlowProps) {
  // Define the status flow/order
  const statusFlow: BookingStatus[] = [
    'pending',
    'confirmed',
    'assigned',
    'completed'
  ];
  
  const getStatusIndex = (status: BookingStatus) => {
    return statusFlow.indexOf(status);
  };
  
  const currentIndex = getStatusIndex(currentStatus);
  
  // Determine if a status is completed, active, or upcoming
  const isCompleted = (status: BookingStatus) => {
    return getStatusIndex(status) < currentIndex;
  };
  
  const isActive = (status: BookingStatus) => {
    return status === currentStatus;
  };
  
  const isUpcoming = (status: BookingStatus) => {
    return getStatusIndex(status) > currentIndex;
  };
  
  // Get the next status in the flow
  const getNextStatus = (): BookingStatus | null => {
    const nextIndex = currentIndex + 1;
    return nextIndex < statusFlow.length ? statusFlow[nextIndex] : null;
  };
  
  // Handle advancing to the next status
  const handleAdvanceStatus = async () => {
    const nextStatus = getNextStatus();
    if (nextStatus) {
      await onStatusChange(nextStatus);
    }
  };
  
  const formatStatusLabel = (status: BookingStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };
  
  const nextStatus = getNextStatus();

  return (
    <div className="py-3">
      <div className="flex items-center justify-between w-full">
        {statusFlow.map((status, index) => (
          <React.Fragment key={status}>
            <div className="flex flex-col items-center">
              <div className={`rounded-full w-10 h-10 flex items-center justify-center border ${
                isActive(status) 
                  ? 'bg-blue-100 border-blue-500 text-blue-500' 
                  : isCompleted(status)
                    ? 'bg-green-100 border-green-500 text-green-500'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {isCompleted(status) ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </div>
              <span className={`text-xs mt-1 font-medium ${
                isActive(status) 
                  ? 'text-blue-500' 
                  : isCompleted(status)
                    ? 'text-green-500'
                    : 'text-gray-400'
              }`}>
                {formatStatusLabel(status)}
              </span>
            </div>
            
            {index < statusFlow.length - 1 && (
              <div className={`flex-grow h-0.5 mx-2 ${
                isCompleted(statusFlow[index + 1]) || isActive(statusFlow[index + 1])
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      
      {nextStatus && currentStatus !== 'cancelled' && (
        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            onClick={handleAdvanceStatus}
            disabled={isSubmitting}
            className="flex items-center gap-1"
          >
            Mark as {formatStatusLabel(nextStatus)}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
