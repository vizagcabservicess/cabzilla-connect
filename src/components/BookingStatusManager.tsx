
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { bookingAPI } from '@/services/api';
import { Booking, BookingStatus } from '@/types/booking';

interface BookingStatusManagerProps {
  booking: Booking;
  onUpdate: () => void;
}

export const BookingStatusManager = ({ booking, onUpdate }: BookingStatusManagerProps) => {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const statusOptions: { value: BookingStatus; label: string; color: string }[] = [
    { value: 'pending', label: 'Pending', color: 'bg-yellow-500' },
    { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-500' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-purple-500' },
    { value: 'completed', label: 'Completed', color: 'bg-green-500' },
    { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' }
  ];

  const getStatusColor = (status: BookingStatus) => {
    const statusOption = statusOptions.find(option => option.value === status);
    return statusOption?.color || 'bg-gray-500';
  };

  const getNextStatus = (currentStatus: BookingStatus): BookingStatus => {
    switch (currentStatus) {
      case 'pending':
        return 'confirmed';
      case 'confirmed':
        return 'in_progress';
      case 'in_progress':
        return 'completed';
      default:
        return currentStatus;
    }
  };

  const canAdvanceStatus = (currentStatus: BookingStatus) => {
    return ['pending', 'confirmed', 'in_progress'].includes(currentStatus);
  };

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    if (newStatus === booking.status) return;

    try {
      setIsUpdating(true);
      await bookingAPI.updateBookingStatus(booking.id.toString(), newStatus, notes);
      setStatus(newStatus);
      setNotes('');
      onUpdate();
      toast({
        title: "Status Updated",
        description: `Booking status updated to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickAdvance = () => {
    const nextStatus = getNextStatus(booking.status);
    if (nextStatus !== booking.status) {
      handleStatusUpdate(nextStatus);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Booking Status</span>
          <Badge className={`${getStatusColor(booking.status)} text-white`}>
            {booking.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Update Status</label>
          <Select value={status} onValueChange={(value: BookingStatus) => setStatus(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
                    <span>{option.label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this status change..."
            rows={3}
          />
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={() => handleStatusUpdate(status)}
            disabled={isUpdating || status === booking.status}
            className="flex-1"
          >
            {isUpdating ? 'Updating...' : 'Update Status'}
          </Button>
          
          {canAdvanceStatus(booking.status) && (
            <Button
              variant="outline"
              onClick={handleQuickAdvance}
              disabled={isUpdating}
            >
              Advance to {getNextStatus(booking.status).replace('_', ' ')}
            </Button>
          )}
        </div>

        {booking.status === 'in_progress' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>In Progress:</strong> This booking is currently active. Make sure to update to "Completed" when the trip is finished.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
