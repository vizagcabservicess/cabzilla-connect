
import React from 'react';
import { BookingStatus } from '@/types/api';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertCircle,
  CheckCircle, 
  Clock, 
  FileCheck, 
  Truck, 
  Ban 
} from 'lucide-react';

interface BookingStatusFlowProps {
  currentStatus: BookingStatus;
  onStatusChange: (newStatus: BookingStatus) => Promise<void>;
  isAdmin: boolean;
  isUpdating?: boolean;
}

export function BookingStatusFlow({ 
  currentStatus, 
  onStatusChange, 
  isAdmin,
  isUpdating = false 
}: BookingStatusFlowProps) {
  // Define the status flow
  const statusFlow: BookingStatus[] = [
    'pending',
    'confirmed',
    'assigned',
    'completed',
    'cancelled'
  ];

  const statusIcons = {
    pending: Clock,
    confirmed: FileCheck,
    assigned: Truck,
    payment_received: CheckCircle,
    payment_pending: AlertCircle,
    completed: CheckCircle,
    cancelled: Ban,
    continued: Truck,
  };

  const getStatusIndex = (status: BookingStatus): number => {
    return statusFlow.indexOf(status);
  };

  const getCurrentIndex = (): number => {
    return getStatusIndex(currentStatus);
  };

  const getStatusColor = (status: BookingStatus, isActive: boolean): string => {
    if (!isActive) return 'bg-gray-100 text-gray-500';
    
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'payment_received': return 'bg-green-100 text-green-800';
      case 'payment_pending': return 'bg-orange-100 text-orange-800';
      case 'continued': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isStatusActive = (status: BookingStatus): boolean => {
    if (status === currentStatus) return true;
    
    // States before current state are also active
    const currentIdx = getCurrentIndex();
    const statusIdx = getStatusIndex(status);
    
    // Special case for cancelled - only active if it's the current status
    if (status === 'cancelled') return status === currentStatus;
    
    return statusIdx <= currentIdx && currentIdx > -1 && statusIdx > -1;
  };

  // Can only move to the next status or cancel
  const canTransitionTo = (status: BookingStatus): boolean => {
    if (!isAdmin) return false;
    if (isUpdating) return false;
    if (currentStatus === 'cancelled' || currentStatus === 'completed') return false;
    
    const currentIdx = getCurrentIndex();
    const statusIdx = getStatusIndex(status);
    
    // Can always cancel unless already completed
    if (status === 'cancelled') return true;
    
    // Can't go backward in flow
    if (statusIdx < currentIdx) return false;
    
    // Can only advance one step at a time
    return statusIdx === currentIdx + 1;
  };

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-between">
        {/* Progress line that connects the steps */}
        <div className="absolute left-0 top-1/2 w-full h-0.5 -translate-y-1/2 bg-gray-200"></div>
        
        {/* Status steps */}
        <div className="flex justify-between w-full relative z-10">
          {statusFlow.map((status, index) => {
            const StatusIcon = statusIcons[status] || Clock;
            
            // Skip "cancelled" in the flow visualization unless it's the current status
            if (status === 'cancelled' && currentStatus !== 'cancelled') return null;
            
            const active = isStatusActive(status);
            const isClickable = canTransitionTo(status);
            
            return (
              <div key={status} className="flex flex-col items-center space-y-2">
                {isClickable ? (
                  <Button 
                    variant="outline" 
                    size="icon"
                    className={`rounded-full w-10 h-10 ${active ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                    onClick={() => onStatusChange(status)}
                    disabled={isUpdating}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </Button>
                ) : (
                  <div className={`flex items-center justify-center rounded-full w-10 h-10 ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-gray-100'
                  }`}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                )}
                <Badge className={getStatusColor(status, active)}>
                  {status.replace('_', ' ')}
                </Badge>
              </div>
            );
          })}
          
          {/* Show cancelled as a separate button if not cancelled */}
          {currentStatus !== 'cancelled' && isAdmin && (
            <div className="absolute right-0 top-full mt-2">
              <Button
                variant="outline"
                className="text-red-500 border-red-300 hover:bg-red-50"
                onClick={() => onStatusChange('cancelled')}
                disabled={isUpdating || currentStatus === 'completed'}
              >
                <Ban className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
