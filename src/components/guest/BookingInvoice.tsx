
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { InvoicePDF } from './InvoicePDF';

interface Booking {
  id: number;
  booking_id?: string;
  pickup_location?: string;
  drop_location?: string;
  pickup_date?: string;
  pickup_time?: string;
  vehicle_type?: string;
  status?: string;
  total_amount?: number;
  extra_charges?: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  payment_method?: string;
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string;
  bookingNumber?: string;
  pickupLocation?: string;
  dropLocation?: string;
  pickupDate?: string;
  pickupTime?: string;
  cab_type?: string;
  cabType?: string;
  passenger_name?: string;
  passengerName?: string;
  name?: string;
  passenger_phone?: string;
  passengerPhone?: string;
  passenger_email?: string;
  passengerEmail?: string;
  totalAmount?: number;
  paymentMethod?: string;
  tripType?: string;
  tripMode?: string;
  extraCharges?: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
  gstEnabled?: boolean;
  gstAmount?: number;
}

interface BookingInvoiceProps {
  booking: Booking;
  onClose: () => void;
}

// Utility to extract base fare and extra charges from backend invoice HTML
function extractInvoiceValues(html: string): { baseFare?: number, extraCharges?: number } {
  let baseFare;
  let extraCharges;
  try {
    // Extract base fare (first occurrence of 'Base Fare' followed by a number)
    const baseFareMatch = html.match(/Base Fare<\/td>\s*<td[^>]*>₹\s*([\d,]+\.?\d*)/i);
    if (baseFareMatch) {
      baseFare = parseFloat(baseFareMatch[1].replace(/,/g, ''));
    }
    // Extract extra charges (sum all rows under 'Extra Charges' section)
    const extraChargesSection = html.split('Extra Charges')[1];
    if (extraChargesSection) {
      const chargeMatches = [...extraChargesSection.matchAll(/<td[^>]*>₹\s*([\d,]+\.?\d*)<\/td>/g)];
      if (chargeMatches.length > 0) {
        extraCharges = chargeMatches.reduce((sum, m) => sum + parseFloat(m[1].replace(/,/g, '')), 0);
      }
    }
  } catch (e) { /* ignore parse errors */ }
  return { baseFare, extraCharges };
}

export function BookingInvoice({ booking, onClose }: BookingInvoiceProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [invoiceHtml, setInvoiceHtml] = useState<string | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLatestInvoice() {
      if (booking && booking.id) {
        setLoadingInvoice(true);
        setInvoiceError(null);
        try {
          const resp = await fetch(`/api/admin/get-invoice.php?booking_id=${booking.id}`);
          const data = await resp.json();
          if (data.status === 'success' && data.invoice && data.invoice.invoice_html) {
            setInvoiceHtml(data.invoice.invoice_html);
          } else {
            setInvoiceHtml(null);
            setInvoiceError('No invoice found for this booking.');
          }
        } catch (e) {
          setInvoiceHtml(null);
          setInvoiceError('Failed to load invoice.');
        } finally {
          setLoadingInvoice(false);
        }
      }
    }
    fetchLatestInvoice();
  }, [booking]);

  console.log('BookingInvoice - booking data:', booking);

  // Safe number conversion
  const safeNumber = (value: any): number => {
    if (typeof value === 'number' && !isNaN(value)) return value;
    if (typeof value === 'string') {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  // Calculate amounts with safe number handling
  const extraChargesArr = Array.isArray(booking.extraCharges) ? booking.extraCharges : 
                         Array.isArray(booking.extra_charges) ? booking.extra_charges : [];
  
  const extraChargesTotal = extraChargesArr.reduce((sum, charge) => {
    return sum + safeNumber(charge.amount);
  }, 0);

  const totalBeforeTax = safeNumber(booking.totalAmount || booking.total_amount);
  
  // GST calculation (12% if enabled)
  const gstEnabled = booking.gstEnabled || booking.gstAmount !== undefined;
  let baseFare = 0;
  let taxes = 0;
  if (gstEnabled) {
    baseFare = Math.round((totalBeforeTax - extraChargesTotal) / 1.12);
    taxes = (totalBeforeTax - extraChargesTotal) - baseFare;
  } else {
    baseFare = Math.max(0, totalBeforeTax - extraChargesTotal);
    taxes = 0;
  }
  const totalWithTaxes = totalBeforeTax;

  console.log('Invoice calculations:', {
    extraChargesTotal,
    totalBeforeTax,
    baseFare,
    taxes,
    totalWithTaxes
  });

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      toast.loading('Generating PDF...');
      
      const blob = await pdf(
        <InvoicePDF
          booking={booking}
          subtotal={baseFare}
          extraChargesTotal={extraChargesTotal}
          taxes={taxes}
          totalWithTaxes={totalWithTaxes}
        />
      ).toBlob();

      const fileName = `Invoice_${booking.bookingNumber || booking.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      saveAs(blob, fileName);
      
      toast.dismiss();
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Helper functions for safe data access
  const getBookingId = () => booking.bookingNumber || booking.booking_id || booking.id || 'N/A';
  const getGuestName = () => booking.guest_name || booking.passenger_name || booking.passengerName || booking.name || 'N/A';
  const getGuestPhone = () => booking.guest_phone || booking.passenger_phone || booking.passengerPhone || 'N/A';
  const getGuestEmail = () => booking.guest_email || booking.passenger_email || booking.passengerEmail || 'N/A';
  const getPickupLocation = () => booking.pickup_location || booking.pickupLocation || 'N/A';
  const getDropLocation = () => booking.drop_location || booking.dropLocation || 'N/A';
  const getPickupDate = () => {
    try {
      const date = booking.pickup_date || booking.pickupDate;
      return date ? new Date(date).toLocaleDateString('en-GB') : 'N/A';
    } catch {
      return 'N/A';
    }
  };
  const getPickupTime = () => {
    const time = booking.pickup_time || booking.pickupTime;
    if (time) return time;
    try {
      const date = booking.pickup_date || booking.pickupDate;
      return date ? new Date(date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    } catch {
      return 'N/A';
    }
  };
  const getVehicleType = () => booking.vehicle_type || booking.cab_type || booking.cabType || 'N/A';
  const getPaymentMethod = () => booking.payment_method || booking.paymentMethod || 'N/A';
  const getTripType = () => booking.tripType || 'N/A';
  const getTripMode = () => booking.tripMode || '';

  // If invoiceHtml is available, parse values for summary
  let summaryBaseFare = undefined;
  let summaryExtraCharges = undefined;
  if (invoiceHtml) {
    const parsed = extractInvoiceValues(invoiceHtml);
    if (typeof parsed.baseFare === 'number') summaryBaseFare = parsed.baseFare;
    if (typeof parsed.extraCharges === 'number') summaryExtraCharges = parsed.extraCharges;
  }

  // Only render summary after backend invoice HTML is loaded and parsed
  if (!invoiceHtml) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-lg font-semibold text-center">INVOICE</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-lg">Loading invoice...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Top summary section ---
  // Use the parsed summaryBaseFare and summaryExtraCharges if available
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-base font-semibold text-center">
            INVOICE
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex justify-between">
              <span>Base Fare</span>
              <span className="font-semibold text-lg text-yellow-700">₹{typeof summaryBaseFare === 'number' ? summaryBaseFare.toLocaleString('en-IN') : '--'}</span>
            </div>
            {typeof summaryExtraCharges === 'number' && summaryExtraCharges > 0 && (
              <div className="flex justify-between">
                <span>Extra Charges</span>
                <span className="font-semibold text-lg text-yellow-700">₹{summaryExtraCharges.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>

          {/* Customer and Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Customer Details</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-sm">Name:</span>
                  <p className="text-base">{getGuestName()}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Phone:</span>
                  <p className="text-base">{getGuestPhone()}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Email:</span>
                  <p className="text-base">{getGuestEmail()}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 border-b border-border pb-2">Trip Summary</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-semibold text-sm">Trip Type:</span>
                  <p className="text-base">{getTripType()} {getTripMode() && `(${getTripMode()})`}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Date:</span>
                  <p className="text-base">{getPickupDate()} {getPickupTime()}</p>
                </div>
                <div>
                  <span className="font-semibold text-sm">Vehicle:</span>
                  <p className="text-base">{getVehicleType()}</p>
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
                <p className="text-base">{getPickupLocation()}</p>
              </div>
              <div>
                <span className="font-semibold text-sm">Drop:</span>
                <p className="text-base">{getDropLocation()}</p>
              </div>
              <div>
                <span className="font-semibold text-sm">Pickup Time:</span>
                <p className="text-base">{getPickupTime()}</p>
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
                    <td className="py-3 px-4 text-right">₹ {(typeof summaryBaseFare === 'number' ? summaryBaseFare : baseFare).toLocaleString('en-IN')}</td>
                  </tr>
                  {extraChargesArr.length > 0 && 
                    extraChargesArr.map((charge, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-3 px-4 text-sm">
                          {charge.type || 'Extra Charge'}: {charge.description || 'Additional service'}
                        </td>
                        <td className="py-3 px-4 text-right">₹ {safeNumber(charge.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))
                  }
                  {gstEnabled && (
                    <tr className="border-b border-border/50">
                      <td className="py-3 px-4">GST (18%)</td>
                      <td className="py-3 px-4 text-right">₹ {taxes.toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                  <tr className="border-b border-border font-semibold text-lg bg-muted/30">
                    <td className="py-4 px-4">Total Amount</td>
                    <td className="py-4 px-4 text-right">₹ {totalWithTaxes.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4">Payment Method</td>
                    <td className="py-3 px-4 text-right capitalize">{getPaymentMethod()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-muted/20 p-6 rounded-lg">
            <h3 className="text-lg font-bold mb-3">Company Information</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Vizag Taxi Hub</p>
              <p>Visakhapatnam, Andhra Pradesh</p>
              <p>Phone: +91 9876543210</p>
              <p>Email: info@vizagtaxihub.com</p>
              <p>Website: www.vizagtaxihub.com</p>
            </div>
          </div>

          <div className="text-center border-t border-border pt-6 mt-8">
            <p className="text-lg font-semibold text-blue-600 mb-2">Thank you for choosing Vizag Taxi Hub!</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>For inquiries, please contact: info@vizagtaxihub.com | +91 9966363662</p>
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
