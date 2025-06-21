
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Car } from 'lucide-react';

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

interface BookingStatusManagerProps {
  bookingId: string;
  initialStatus: BookingStatus;
  onStatusChange?: (status: BookingStatus) => void;
}

export const BookingStatusManager: React.FC<BookingStatusManagerProps> = ({
  bookingId,
  initialStatus,
  onStatusChange
}) => {
  const [status, setStatus] = useState<BookingStatus>(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const statusConfig = {
    pending: { color: 'yellow', icon: Clock, label: 'Pending Confirmation' },
    confirmed: { color: 'blue', icon: CheckCircle, label: 'Confirmed' },
    in_progress: { color: 'green', icon: Car, label: 'In Progress' },
    completed: { color: 'green', icon: CheckCircle, label: 'Completed' },
    cancelled: { color: 'red', icon: XCircle, label: 'Cancelled' }
  };

  const updateStatus = async (newStatus: BookingStatus) => {
    setIsUpdating(true);
    try {
      // API call to update status
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setStatus(newStatus);
        onStatusChange?.(newStatus);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getNextStatus = (currentStatus: BookingStatus): BookingStatus | null => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      default:
        return null;
    }
  };

  const canCancel = status === 'pending' || status === 'confirmed';
  const nextStatus = getNextStatus(status);

  const StatusIcon = statusConfig[status].icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Booking Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
            {statusConfig[status].label}
          </Badge>
          <span className="text-sm text-gray-500">#{bookingId}</span>
        </div>

        <div className="flex gap-2">
          {nextStatus && (
            <Button
              onClick={() => updateStatus(nextStatus)}
              disabled={isUpdating}
              size="sm"
            >
              {isUpdating ? 'Updating...' : `Mark as ${statusConfig[nextStatus].label}`}
            </Button>
          )}

          {canCancel && (
            <Button
              onClick={() => updateStatus('cancelled')}
              disabled={isUpdating}
              variant="destructive"
              size="sm"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
