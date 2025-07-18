import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Calendar, MapPin, User, Phone, Mail, CreditCard } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { InvoicePDF } from './InvoicePDF';

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
  extra_charges?: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  payment_method?: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
}

interface BookingInvoiceProps {
  booking: Booking;
  onClose: () => void;
}

export function BookingInvoice({ booking, onClose }: BookingInvoiceProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Calculate amounts properly
  const extraChargesTotal = booking.extra_charges?.reduce((sum, charge) => sum + charge.amount, 0) || 0;
  const subtotal = booking.total_amount || 0;
  const taxes = Math.round((subtotal + extraChargesTotal) * 0.18); // 18% GST on total before tax
  const baseFare = subtotal - extraChargesTotal;
  const totalWithTaxes = subtotal + taxes;

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      const blob = await pdf(
        <InvoicePDF
          booking={booking}
          subtotal={baseFare}
          extraChargesTotal={extraChargesTotal}
          taxes={taxes}
          totalWithTaxes={totalWithTaxes}
        />
      ).toBlob();

      const fileName = `Invoice_${booking.booking_id}_${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(blob, fileName);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-2xl font-bold text-center">
            INVOICE
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-6">
          {/* Invoice Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 mb-2">VizagUp Taxi</h1>
              <p className="text-muted-foreground">Your trusted travel partner</p>
            </div>
            <div className="text-right">
              <div className="bg-muted/30 p-4 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Invoice Number:</p>
                <p className="text-xl font-bold">#{booking.booking_id}</p>
                <p className="text-sm font-medium text-muted-foreground mt-3">Date:</p>
                <p className="text-lg font-semibold">{new Date().toLocaleDateString('en-GB')}</p>
                <p className="text-sm font-medium text-muted-foreground mt-3">Booking #:</p>
                <p className="text-sm font-mono">{booking.booking_id}</p>
              </div>
            </div>
          </div>

          {/* Customer and Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Customer Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-sm">Name:</span>
                  <p className="text-base">{booking.guest_name}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Phone:</span>
                  <p className="text-base">{booking.guest_phone}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Email:</span>
                  <p className="text-base">{booking.guest_email}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Trip Summary</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-sm">Trip Type:</span>
                  <p className="text-base">Outstation (One-way)</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Date:</span>
                  <p className="text-base">
                    {new Date(booking.pickup_date).toLocaleDateString('en-GB')} at {booking.pickup_time}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Vehicle:</span>
                  <p className="text-base">{booking.vehicle_type}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trip Details Section */}
          <div>
            <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Trip Details</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <span className="font-semibold text-sm">Pickup:</span>
                <p className="text-base">{booking.pickup_location}</p>
              </div>
              <div>
                <span className="font-semibold text-sm">Drop:</span>
                <p className="text-base">{booking.drop_location}</p>
              </div>
              <div>
                <span className="font-semibold text-sm">Pickup Time:</span>
                <p className="text-base">
                  {new Date(booking.pickup_date).toLocaleDateString('en-GB')}, {booking.pickup_time}
                </p>
              </div>
            </div>
          </div>

          {/* Fare Breakdown */}
          <div>
            <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Fare Breakdown</h3>
            <div className="bg-muted/20 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold">Description</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4">Base Fare</td>
                    <td className="py-3 px-4 text-right">₹ {baseFare.toLocaleString()}</td>
                  </tr>
                  
                  {booking.extra_charges && booking.extra_charges.length > 0 && 
                    booking.extra_charges.map((charge, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-3 px-4 text-sm">
                          {charge.type}: {charge.description}
                        </td>
                        <td className="py-3 px-4 text-right">₹ {charge.amount.toLocaleString()}</td>
                      </tr>
                    ))
                  }
                  
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4">GST (18%)</td>
                    <td className="py-3 px-4 text-right">₹ {taxes.toLocaleString()}</td>
                  </tr>
                  
                  <tr className="border-b border-border font-semibold text-lg bg-muted/30">
                    <td className="py-4 px-4">Total Amount</td>
                    <td className="py-4 px-4 text-right">₹ {totalWithTaxes.toLocaleString()}</td>
                  </tr>

                  {booking.payment_method && (
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4">Payment Method</td>
                      <td className="py-3 px-4 text-right capitalize">{booking.payment_method}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-muted/20 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-3">Company Information</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>VizagUp Taxi Services</p>
              <p>Visakhapatnam, Andhra Pradesh</p>
              <p>Phone: +91-XXX-XXX-XXXX</p>
              <p>Email: info@vizagup.com</p>
              <p>Website: www.vizagup.com</p>
            </div>
          </div>

          <div className="text-center border-t border-border pt-6 mt-8">
            <p className="text-lg font-semibold text-blue-600 mb-2">Thank you for choosing VizagUp Taxi!</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>For inquiries, please contact: info@vizagcabs.com | +91 9876543210</p>
              <p>Generated on: {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour12: false })}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t border-border">
            <Button 
              onClick={generatePDF} 
              disabled={isGeneratingPDF}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button variant="outline" onClick={onClose} className="px-8">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}