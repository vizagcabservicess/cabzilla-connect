import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Share, MessageCircle, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';

interface BookingShareProps {
  booking: any; // Use the actual Booking type from GuestDashboard
  isOpen?: boolean;
  onClose: () => void;
}

export function BookingShare({ booking, isOpen = true, onClose }: BookingShareProps) {
  const [copied, setCopied] = useState(false);

  // Helper function to safely get booking data
  const getBookingId = () => booking?.bookingNumber || booking?.booking_id || booking?.id || 'N/A';
  const getPassengerName = () => booking?.passengerName || booking?.guest_name || 'Guest';
  const getPassengerPhone = () => booking?.passengerPhone || booking?.guest_phone || '';
  const getPickupLocation = () => booking?.pickupLocation || booking?.pickup_location || 'Location not specified';
  const getDropLocation = () => booking?.dropLocation || booking?.drop_location || 'Destination not specified';
  const getPickupDate = () => {
    const date = booking?.pickupDate || booking?.pickup_date;
    if (!date) return 'Date not specified';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };
  const getPickupTime = () => booking?.pickup_time || 'Time not specified';
  const getVehicleType = () => booking?.vehicleType || booking?.vehicle_type || booking?.cabType || booking?.cab_type || 'Vehicle not specified';
  const getTotalAmount = () => {
    const amount = booking?.totalAmount || booking?.total_amount || booking?.fare || 0;
    return isNaN(amount) ? 0 : amount;
  };
  const getStatus = () => booking?.status || 'pending';

  const shareText = `🚗 Booking Confirmation - Vizag Taxi Hub

📋 Booking ID: ${getBookingId()}
👤 Passenger: ${getPassengerName()}
${getPassengerPhone() ? `📞 Contact: ${getPassengerPhone()}` : ''}

🗓️ Trip Details:
📅 Date: ${getPickupDate()}
${getPickupTime() !== 'Time not specified' ? `⏰ Time: ${getPickupTime()}` : ''}
📍 From: ${getPickupLocation()}
📍 To: ${getDropLocation()}
🚙 Vehicle: ${getVehicleType()}

💰 Total Amount: ₹${getTotalAmount().toLocaleString()}
✅ Status: ${getStatus().toUpperCase()}

Book your ride at: www.vizagtaxihub.com`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Booking details copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const shareViaWhatsApp = () => {
    const encodedText = encodeURIComponent(shareText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Booking Confirmation - ${getBookingId()}`);
    const body = encodeURIComponent(shareText);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = emailUrl;
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Booking Confirmation - ${getBookingId()}`,
          text: shareText,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Share Booking
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="text-sm space-y-2">
                <div className="font-semibold text-primary">
                  🚗 Booking Confirmation - Vizag Taxi Hub
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div>📋 Booking ID: {getBookingId()}</div>
                  <div>👤 Passenger: {getPassengerName()}</div>
                  <div>📅 Date: {getPickupDate()}</div>
                  {getPickupTime() !== 'Time not specified' && <div>⏰ Time: {getPickupTime()}</div>}
                  <div>📍 {getPickupLocation()} → {getDropLocation()}</div>
                  <div>💰 Amount: ₹{getTotalAmount().toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Copy Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Booking Details</label>
            <div className="flex gap-2">
              <Input
                value={shareText}
                readOnly
                className="text-xs"
                style={{ fontSize: '10px' }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={shareViaWhatsApp}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            
            <Button
              variant="outline"
              onClick={shareViaEmail}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>

          {/* Native Share (if supported) */}
          {navigator.share && (
            <Button onClick={shareViaNative} className="w-full">
              <Share className="h-4 w-4 mr-2" />
              Share
            </Button>
          )}

          {/* Close Button */}
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
