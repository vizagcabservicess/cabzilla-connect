import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { bookingAPI } from '@/services/api';
import { BookingStatus } from '@/types/api';
import { AlertCircle, Clock, CheckCheck, X, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingStatusManagerProps {
  bookingId: number | string;
  currentStatus: BookingStatus;
  onStatusChange?: (newStatus: BookingStatus) => void;
  className?: string;
  variant?: 'default' | 'compact';
  showLabel?: boolean;
}

export function BookingStatusManager({
  bookingId,
  currentStatus,
  onStatusChange,
  className = '',
  variant = 'default',
  showLabel = true
}: BookingStatusManagerProps) {
  const [status, setStatus] = useState<BookingStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Update local state when the prop changes
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);
  
  const getNextStatus = (current: BookingStatus): BookingStatus | null => {
    switch (current) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'assigned';
      case 'assigned':
        return 'in-progress';
      case 'in-progress':
        return 'completed';
      case 'payment_received':
        return 'completed';
      case 'payment_pending':
        return 'payment_received';
      case 'completed':
        return null;
      case 'continued':
        return 'completed';
      case 'cancelled':
        return null;
      default:
        return null;
    }
  };
  
  const getPrevStatus = (current: BookingStatus): BookingStatus | null => {
    switch (current) {
      case 'pending':
        return null;
      case 'confirmed':
        return 'pending';
      case 'assigned':
        return 'confirmed';
      case 'in-progress':
        return 'assigned';
      case 'payment_received':
        return 'payment_pending';
      case 'payment_pending':
        return 'in-progress';
      case 'completed':
        return 'in-progress';
      case 'continued':
        return 'in-progress';
      case 'cancelled':
        return null;
      default:
        return null;
    }
  };
  
  const updateStatus = async (newStatus: BookingStatus) => {
    setIsUpdating(true);
    setError(null);
    
    try {
      await bookingAPI.updateBookingStatus(bookingId, newStatus);
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    } catch (error: any) {
      console.error("Error updating booking status:", error);
      setError(error.message || "Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleNextStatus = () => {
    const next = getNextStatus(status);
    if (next) {
      updateStatus(next);
    }
  };
  
  const handlePrevStatus = () => {
    const prev = getPrevStatus(status);
    if (prev) {
      updateStatus(prev);
    }
  };
  
  const renderStatusBadge = () => {
    let badgeText = status.replace(/_/g, ' ');
    badgeText = badgeText.charAt(0).toUpperCase() + badgeText.slice(1);
    
    let badgeColor = "bg-gray-100 text-gray-800";
    
    switch (status) {
      case 'pending':
        badgeColor = "bg-yellow-100 text-yellow-800";
        break;
      case 'confirmed':
        badgeColor = "bg-blue-100 text-blue-800";
        break;
      case 'assigned':
        badgeColor = "bg-purple-100 text-purple-800";
        break;
      case 'in-progress':
        badgeColor = "bg-orange-100 text-orange-800";
        break;
      case 'completed':
        badgeColor = "bg-green-100 text-green-800";
        break;
      case 'payment_received':
        badgeColor = "bg-green-100 text-green-800";
        break;
      case 'payment_pending':
        badgeColor = "bg-red-100 text-red-800";
        break;
      case 'continued':
        badgeColor = "bg-blue-100 text-blue-800";
        break;
      case 'cancelled':
        badgeColor = "bg-red-100 text-red-800";
        break;
    }
    
    return (
      <Badge className={cn(badgeColor, "font-medium", className)}>
        {showLabel && <span className="mr-1">{badgeText}</span>}
        {status === 'pending' && <Clock className="h-4 w-4" />}
        {status === 'confirmed' && <CheckCheck className="h-4 w-4" />}
        {status === 'assigned' && <CheckCheck className="h-4 w-4" />}
        {status === 'in-progress' && <Clock className="h-4 w-4" />}
        {status === 'completed' && <CheckCheck className="h-4 w-4" />}
        {status === 'payment_received' && <CheckCheck className="h-4 w-4" />}
        {status === 'payment_pending' && <Clock className="h-4 w-4" />}
        {status === 'continued' && <Clock className="h-4 w-4" />}
        {status === 'cancelled' && <X className="h-4 w-4" />}
      </Badge>
    );
  };
  
  return (
    <div className="flex items-center space-x-2">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {variant === 'default' && (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrevStatus} 
            disabled={!getPrevStatus(status) || isUpdating}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          {renderStatusBadge()}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleNextStatus} 
            disabled={!getNextStatus(status) || isUpdating}
          >
            Next
            <RefreshCcw className="ml-2 h-4 w-4" />
          </Button>
        </>
      )}
      
      {variant === 'compact' && renderStatusBadge()}
    </div>
  );
}
