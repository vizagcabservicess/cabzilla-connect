
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BookingStatus } from '@/types/api';

interface BookingStatusManagerProps {
  bookingId: number;
  currentStatus: BookingStatus;
  onStatusUpdate: (newStatus: BookingStatus) => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  assigned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  'no-show': 'bg-gray-100 text-gray-800',
  payment_pending: 'bg-amber-100 text-amber-800',
  payment_received: 'bg-emerald-100 text-emerald-800',
  continued: 'bg-indigo-100 text-indigo-800'
};

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No Show',
  payment_pending: 'Payment Pending',
  payment_received: 'Payment Received',
  continued: 'Continued'
};

export const BookingStatusManager: React.FC<BookingStatusManagerProps> = ({
  bookingId,
  currentStatus,
  onStatusUpdate
}) => {
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = (value: string) => {
    setSelectedStatus(value as BookingStatus);
  };

  const handleUpdateStatus = async () => {
    if (selectedStatus === currentStatus) {
      toast({
        title: "No Change",
        description: "Status is already set to this value.",
        variant: "default"
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Validate status transition
      if (!isValidStatusTransition(currentStatus, selectedStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${selectedStatus}`);
      }

      onStatusUpdate(selectedStatus);
      
      toast({
        title: "Status Updated",
        description: `Booking status changed to ${statusLabels[selectedStatus]}`,
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update booking status",
        variant: "destructive"
      });
      setSelectedStatus(currentStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const isValidStatusTransition = (from: BookingStatus, to: BookingStatus): boolean => {
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled', 'no-show'],
      completed: ['payment_pending'],
      cancelled: [],
      'no-show': ['cancelled'],
      payment_pending: ['payment_received'],
      payment_received: ['continued'],
      continued: []
    };

    return validTransitions[from]?.includes(to) || false;
  };

  const getNextValidStatuses = (status: BookingStatus): BookingStatus[] => {
    const transitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled', 'no-show'],
      completed: ['payment_pending'],
      cancelled: [],
      'no-show': ['cancelled'],
      payment_pending: ['payment_received'],
      payment_received: ['continued'],
      continued: []
    };

    return transitions[status] || [];
  };

  const nextValidStatuses = getNextValidStatuses(currentStatus);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Booking Status Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Current Status:</span>
          <Badge className={statusColors[currentStatus]}>
            {statusLabels[currentStatus]}
          </Badge>
        </div>

        {nextValidStatuses.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status:</label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={currentStatus}>
                  {statusLabels[currentStatus]} (Current)
                </SelectItem>
                {nextValidStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedStatus !== currentStatus && (
          <Button 
            onClick={handleUpdateStatus} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? 'Updating...' : `Update to ${statusLabels[selectedStatus]}`}
          </Button>
        )}

        {nextValidStatuses.length === 0 && currentStatus !== 'cancelled' && (
          <p className="text-sm text-gray-500">
            No further status changes available for {statusLabels[currentStatus]} bookings.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
