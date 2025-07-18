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

  const subtotal = booking.total_amount - (booking.extra_charges?.reduce((sum, charge) => sum + charge.amount, 0) || 0);
  const extraChargesTotal = booking.extra_charges?.reduce((sum, charge) => sum + charge.amount, 0) || 0;
  const taxes = Math.round(subtotal * 0.18); // 18% GST
  const totalWithTaxes = subtotal + extraChargesTotal + taxes;

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      const blob = await pdf(
        InvoicePDF({
          booking,
          subtotal,
          extraChargesTotal,
          taxes,
          totalWithTaxes,
        })
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice - {booking.booking_id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-primary">VizagUp Taxi</h1>
                  <p className="text-muted-foreground">Your trusted travel partner</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-mono text-lg">{booking.booking_id}</p>
                  <p className="text-sm text-muted-foreground mt-2">Date</p>
                  <p>{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Customer Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {booking.guest_name}</p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      {booking.guest_phone}
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      {booking.guest_email}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Trip Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">From:</span> {booking.pickup_location}</p>
                    <p><span className="font-medium">To:</span> {booking.drop_location}</p>
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {new Date(booking.pickup_date).toLocaleDateString()} at {booking.pickup_time}
                    </p>
                    <p><span className="font-medium">Vehicle:</span> {booking.vehicle_type}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Billing Details</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Base Fare</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>

                {booking.extra_charges && booking.extra_charges.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Extra Charges</p>
                      {booking.extra_charges.map((charge, index) => (
                        <div key={index} className="flex justify-between text-sm pl-4">
                          <span className="text-muted-foreground">
                            {charge.type}: {charge.description}
                          </span>
                          <span>₹{charge.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />
                <div className="flex justify-between">
                  <span>GST (18%)</span>
                  <span>₹{taxes.toLocaleString()}</span>
                </div>

                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total Amount</span>
                  <span>₹{totalWithTaxes.toLocaleString()}</span>
                </div>

                {booking.payment_method && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Payment Method
                      </span>
                      <span className="capitalize">{booking.payment_method}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Company Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">Company Information</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>VizagUp Taxi Services</p>
                <p>Visakhapatnam, Andhra Pradesh</p>
                <p>Phone: +91-XXX-XXX-XXXX</p>
                <p>Email: info@vizagup.com</p>
                <p>Website: www.vizagup.com</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              onClick={generatePDF} 
              disabled={isGeneratingPDF}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}