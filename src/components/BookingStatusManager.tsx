
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BookingStatus } from "@/types/api";
import { Check, CheckCheck, Loader2, Trash2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface BookingStatusManagerProps {
  currentStatus: BookingStatus;
  onStatusChange: (newStatus: BookingStatus) => void;
  isAdmin?: boolean;
  onDelete?: () => void;
}

export function BookingStatusManager({ 
  currentStatus, 
  onStatusChange, 
  isAdmin = false,
  onDelete
}: BookingStatusManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'assigned':
        return <Check className="h-4 w-4" />;
      case 'payment_received':
        return <CheckCheck className="h-4 w-4" />;
      case 'payment_pending':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'continued':
        return <AlertCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'assigned':
        return 'text-blue-600';
      case 'payment_received':
        return 'text-green-600';
      case 'payment_pending':
        return 'text-yellow-600';
      case 'completed':
        return 'text-green-600';
      case 'continued':
        return 'text-orange-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      await onStatusChange(newStatus as BookingStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin ? (
        <div className="flex items-center gap-4">
          <Select
            disabled={isUpdating}
            value={currentStatus}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <span className={cn("flex items-center gap-2", getStatusColor(currentStatus))}>
                    {getStatusIcon(currentStatus)}
                    {currentStatus.replace('_', ' ').toUpperCase()}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assigned">
                <span className="flex items-center gap-2 text-blue-600">
                  <Check className="h-4 w-4" />
                  ASSIGNED
                </span>
              </SelectItem>
              <SelectItem value="payment_received">
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCheck className="h-4 w-4" />
                  PAYMENT RECEIVED
                </span>
              </SelectItem>
              <SelectItem value="payment_pending">
                <span className="flex items-center gap-2 text-yellow-600">
                  <Loader2 className="h-4 w-4" />
                  PAYMENT PENDING
                </span>
              </SelectItem>
              <SelectItem value="completed">
                <span className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  COMPLETED
                </span>
              </SelectItem>
              <SelectItem value="continued">
                <span className="flex items-center gap-2 text-orange-600">
                  <AlertCircle className="h-4 w-4" />
                  CONTINUED
                </span>
              </SelectItem>
              <SelectItem value="cancelled">
                <span className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  CANCELLED
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isUpdating}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Booking
            </Button>
          )}
        </div>
      ) : (
        <div className={cn("flex items-center gap-2 font-medium", getStatusColor(currentStatus))}>
          {getStatusIcon(currentStatus)}
          {currentStatus.replace('_', ' ').toUpperCase()}
        </div>
      )}
    </div>
  );
}
