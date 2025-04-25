
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, User, Phone, Mail, Car, IndianRupee } from 'lucide-react';
import { Booking } from '@/types/api';
import { format } from 'date-fns';

interface BookingDetailsProps {
  booking: Booking;
  onClose: () => void;
  onEdit: () => void;
  onAssignDriver: () => void;
  onCancel: () => void;
  onGenerateInvoice: () => void;
}

export function BookingDetails({ 
  booking, 
  onClose, 
  onEdit, 
  onAssignDriver,
  onCancel,
  onGenerateInvoice
}: BookingDetailsProps) {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <CardHeader className="sticky top-0 bg-white z-10 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Booking #{booking.bookingNumber}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Created on {format(new Date(booking.createdAt), 'PPP')}
              </p>
            </div>
            <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          {/* Customer Information */}
          <section className="space-y-2">
            <h3 className="font-semibold">Customer Information</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <span>{booking.passengerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>{booking.passengerPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span>{booking.passengerEmail}</span>
              </div>
            </div>
          </section>

          {/* Trip Details */}
          <section className="space-y-2">
            <h3 className="font-semibold">Trip Details</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium">Pickup Location</p>
                  <p className="text-sm text-gray-600">{booking.pickupLocation}</p>
                </div>
              </div>
              {booking.dropLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="font-medium">Drop Location</p>
                    <p className="text-sm text-gray-600">{booking.dropLocation}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium">Pickup Date & Time</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(booking.pickupDate), 'PPP p')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium">Vehicle Type</p>
                  <p className="text-sm text-gray-600">{booking.cabType}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Details */}
          <section className="space-y-2">
            <h3 className="font-semibold">Payment Details</h3>
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium">Total Amount</p>
                  <p className="text-sm text-gray-600">₹{booking.totalAmount.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {booking.status === 'pending' && (
              <>
                <Button onClick={onEdit}>
                  Edit Booking
                </Button>
                <Button onClick={onAssignDriver} variant="outline">
                  Assign Driver
                </Button>
              </>
            )}
            {['pending', 'confirmed'].includes(booking.status) && (
              <Button onClick={onCancel} variant="destructive">
                Cancel Booking
              </Button>
            )}
            {booking.status !== 'cancelled' && (
              <Button onClick={onGenerateInvoice} variant="outline">
                Generate Invoice
              </Button>
            )}
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
