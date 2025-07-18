import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Share, MessageCircle, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Booking {
  id: number;
  booking_id: string;
  pickup_location: string;
  drop_location: string;
  pickup_date: string;
  pickup_time: string;
  vehicle_type: string;
  status: string;
  total_amount: number;
  guest_name: string;
  guest_phone: string;
}

interface BookingShareProps {
  booking: Booking;
  onClose: () => void;
}

export function BookingShare({ booking, onClose }: BookingShareProps) {
  const [copied, setCopied] = useState(false);

  const shareText = `🚗 Booking Confirmation - VizagUp Taxi

📋 Booking ID: ${booking.booking_id}
👤 Passenger: ${booking.guest_name}
📞 Contact: ${booking.guest_phone}

🗓️ Trip Details:
📅 Date: ${new Date(booking.pickup_date).toLocaleDateString()}
⏰ Time: ${booking.pickup_time}
📍 From: ${booking.pickup_location}
📍 To: ${booking.drop_location}
🚙 Vehicle: ${booking.vehicle_type}

💰 Total Amount: ₹${booking.total_amount?.toLocaleString()}
✅ Status: ${booking.status.toUpperCase()}

Book your ride at: www.vizagup.com`;

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
    const subject = encodeURIComponent(`Booking Confirmation - ${booking.booking_id}`);
    const body = encodeURIComponent(shareText);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.location.href = emailUrl;
  };

  const shareViaNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Booking Confirmation - ${booking.booking_id}`,
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
    <Dialog open={true} onOpenChange={onClose}>
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
                  🚗 Booking Confirmation - VizagUp Taxi
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <div>📋 Booking ID: {booking.booking_id}</div>
                  <div>👤 Passenger: {booking.guest_name}</div>
                  <div>📅 Date: {new Date(booking.pickup_date).toLocaleDateString()}</div>
                  <div>⏰ Time: {booking.pickup_time}</div>
                  <div>📍 {booking.pickup_location} → {booking.drop_location}</div>
                  <div>💰 Amount: ₹{booking.total_amount?.toLocaleString()}</div>
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