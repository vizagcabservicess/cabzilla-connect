
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Booking } from '@/types/api';
import { formatBookingDate } from '@/utils/bookingUtils';
import { Calendar, MapPin, Phone, Mail, User, IndianRupee, FileText } from 'lucide-react';

interface BookingInvoiceProps {
  booking: Booking;
  onClose: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function BookingInvoice({ booking, onClose, onGenerate, isGenerating }: BookingInvoiceProps) {
  const calculateSubtotal = () => {
    if (!booking.totalAmount) return 0;
    return booking.totalAmount * 0.85;
  };

  const calculateTax = () => {
    if (!booking.totalAmount) return 0;
    return booking.totalAmount * 0.15;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 max-h-[80vh] overflow-auto">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold">INVOICE</h2>
            <p className="text-gray-500">#{booking.bookingNumber}</p>
          </div>
          <div className="text-right">
            <h3 className="font-bold">Vizag Taxi Hub</h3>
            <p className="text-sm text-gray-500">123 Main Street,</p>
            <p className="text-sm text-gray-500">Visakhapatnam, AP 530003</p>
            <p className="text-sm text-gray-500">info@vizagtaxihub.com</p>
            <p className="text-sm text-gray-500">+91 9966363662</p>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h4 className="font-semibold mb-2">Bill To:</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{booking.passengerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{booking.passengerPhone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{booking.passengerEmail}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Invoice Details:</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice Number:</span>
                <span>INV-{booking.bookingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span>{booking.status.toUpperCase()}</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h4 className="font-semibold">Trip Details:</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">Pick-up Location</p>
                <p className="text-gray-500">{booking.pickupLocation}</p>
              </div>
            </div>
            {booking.dropLocation && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                <div>
                  <p className="font-medium">Drop-off Location</p>
                  <p className="text-gray-500">{booking.dropLocation}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <p className="font-medium">Date & Time</p>
                <p className="text-gray-500">{formatBookingDate(booking.pickupDate)}</p>
              </div>
            </div>
            <div>
              <p className="font-medium">Trip Type</p>
              <p className="text-gray-500">{booking.tripType.toUpperCase()} ({booking.tripMode})</p>
            </div>
            <div>
              <p className="font-medium">Vehicle Type</p>
              <p className="text-gray-500">{booking.cabType}</p>
            </div>
            <div>
              <p className="font-medium">Distance</p>
              <p className="text-gray-500">{booking.distance} km</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h4 className="font-semibold">Payment Summary:</h4>
          <div className="bg-gray-50 rounded-md p-4">
            <div className="flex justify-between mb-2">
              <span>Base Fare</span>
              <span>{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes & Fees (15%)</span>
              <span>{formatCurrency(calculateTax())}</span>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between font-bold">
              <span>Total Amount</span>
              <span>{formatCurrency(booking.totalAmount || 0)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p className="font-semibold">Terms & Conditions:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Payment is due within 7 days of invoice date.</li>
            <li>Please include invoice number in payment reference.</li>
            <li>For any queries related to this invoice, please contact our customer service.</li>
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-gray-500">Thank you for choosing Vizag Taxi Hub!</p>
        </div>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onClose} disabled={isGenerating}>
          Close
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating} className="gap-2">
          <FileText className="h-4 w-4" />
          {isGenerating ? "Generating PDF..." : "Download as PDF"}
        </Button>
      </div>
    </div>
  );
}
