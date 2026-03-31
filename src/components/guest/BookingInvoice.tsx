
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';
import { InvoicePDF } from './InvoicePDF';
import type { Booking as ApiBooking } from '@/types/api';
import { patchInvoiceHtmlTripTypeCell } from '@/utils/invoiceTripTypeDisplay';

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
  bookingType?: string;
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
    // Extract base fare - match both with and without "(excluding tax)" text
    const baseFareMatch = html.match(/Base Fare[^<]*<\/td>\s*<td[^>]*>₹\s*([\d,]+\.?\d*)/i);
    if (baseFareMatch) {
      baseFare = parseFloat(baseFareMatch[1].replace(/,/g, ''));
    }
    
    // Extract extra charges by looking for individual charge rows (not the base fare row)
    const rows = html.split('<tr>');
    extraCharges = 0;
    for (const row of rows) {
      // Skip base fare, GST, and total rows
      if (row.includes('Base Fare') || row.includes('GST') || row.includes('IGST') || 
          row.includes('CGST') || row.includes('SGST') || row.includes('Total Amount') ||
          row.includes('No extra charges')) {
        continue;
      }
      // Look for amount pattern in remaining rows
      const amountMatch = row.match(/>₹\s*([\d,]+\.?\d*)<\/td>/);
      if (amountMatch) {
        extraCharges += parseFloat(amountMatch[1].replace(/,/g, ''));
      }
    }
    
    console.log('Extracted invoice values:', { baseFare, extraCharges });
  } catch (e) { 
    console.error('Error parsing invoice HTML:', e);
  }
  return { baseFare, extraCharges };
}

export function BookingInvoice({ booking, onClose }: BookingInvoiceProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [rawInvoiceHtml, setRawInvoiceHtml] = useState<string | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

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

  const formatCurrency = useCallback((amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0.00';
    }
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  // Calculate amounts with safe number handling
  const extraChargesArr = Array.isArray(booking.extraCharges) ? booking.extraCharges : 
                         Array.isArray(booking.extra_charges) ? booking.extra_charges : [];
  
  const extraChargesTotal = extraChargesArr.reduce((sum, charge) => {
    return sum + safeNumber(charge.amount);
  }, 0);

  const totalBeforeTax = safeNumber(booking.totalAmount || booking.total_amount);
  const baseFareFromFareField = safeNumber((booking as any).fare);
  const gstAmountFromBooking = safeNumber(booking.gstAmount);
  
  // GST calculation (18% if enabled)
  const gstEnabled = booking.gstEnabled || booking.gstAmount !== undefined;
  let baseFare = 0;
  let taxes = 0;
  let totalWithTaxes = Math.max(0, totalBeforeTax);

  if (gstEnabled) {
    const baseCandidates = [
      baseFareFromFareField,
      totalBeforeTax > 0 ? totalBeforeTax - gstAmountFromBooking : 0
    ].filter((value) => typeof value === 'number' && !isNaN(value) && value > 0);

    const inferredBase = baseCandidates.length > 0 ? Math.max(...baseCandidates) : 0;
    if (inferredBase > 0) {
      baseFare = inferredBase;
    } else if (totalBeforeTax > 0) {
      baseFare = Math.round((totalBeforeTax - extraChargesTotal) / 1.18);
    } else {
      baseFare = Math.max(0, totalBeforeTax - extraChargesTotal);
    }

    const taxableSubtotal = Math.max(0, baseFare + extraChargesTotal);
    taxes = Number((taxableSubtotal * 0.18).toFixed(2));
    totalWithTaxes = Number((taxableSubtotal + taxes).toFixed(2));
  } else {
    baseFare = Math.max(
      0,
      baseFareFromFareField > 0 ? baseFareFromFareField : totalBeforeTax - extraChargesTotal
    );
    taxes = 0;
    totalWithTaxes = baseFare + extraChargesTotal;
  }

  const sanitizeInvoiceHtml = useCallback((html: string | null) => {
    if (!html) return html;
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return html;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const normalizedBase = Math.max(0, baseFare);
      const taxableAmount = Math.max(0, normalizedBase + extraChargesTotal);
      const normalizedTaxes = Number((taxableAmount * 0.18).toFixed(2));
      const normalizedTotal = Number((taxableAmount + normalizedTaxes).toFixed(2));
      const halfTax = Number((normalizedTaxes / 2).toFixed(2));

      // Update labels
      const textUpdates: Array<{ selector: string; regex: RegExp; replacement: string }> = [
        { selector: 'body', regex: /Additional\s+12%\s+GST/gi, replacement: 'Additional 18% GST' },
        { selector: 'body', regex: /CGST\s*\(6%\)/gi, replacement: 'CGST (9%)' },
        { selector: 'body', regex: /SGST\s*\(6%\)/gi, replacement: 'SGST (9%)' },
        { selector: 'body', regex: /IGST\s*\(12%\)/gi, replacement: 'IGST (18%)' },
        { selector: 'body', regex: /CGST\s*6%\s*\+\s*SGST\s*6%/gi, replacement: 'CGST 9% + SGST 9%' },
        { selector: 'body', regex: /12%\s*GST/gi, replacement: '18% GST' }
      ];

      textUpdates.forEach(({ selector, regex, replacement }) => {
        const node = doc.querySelector(selector);
        if (node && node.innerHTML) {
          node.innerHTML = node.innerHTML.replace(regex, replacement);
        }
      });

      const setAmount = (cell: HTMLTableCellElement | null, amount: number) => {
        if (!cell) return;
        const formatted = amount.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        cell.innerHTML = `<span class="rupee-symbol">₹</span> ${formatted}`;
      };

      const findRowByLabel = (label: string) => {
        return Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr')).find((row) =>
          row.cells.length > 0 && row.cells[0].textContent?.toLowerCase().includes(label.toLowerCase())
        );
      };

      const baseRow = findRowByLabel('base fare');
      if (baseRow) {
        baseRow.cells[0].textContent = baseRow.cells[0].textContent?.replace(/(Base Fare).*/i, 'Base Fare (excluding tax)');
        setAmount(baseRow.cells[1] ?? null, normalizedBase);
      }

      if (gstEnabled) {
        const igstRow = findRowByLabel('igst');
        if (igstRow) {
          igstRow.cells[0].textContent = 'IGST (18%)';
          setAmount(igstRow.cells[1] ?? null, normalizedTaxes);
        } else {
          const cgstRow = findRowByLabel('cgst');
          if (cgstRow) {
            cgstRow.cells[0].textContent = 'CGST (9%)';
            setAmount(cgstRow.cells[1] ?? null, halfTax);
          }
          const sgstRow = findRowByLabel('sgst');
          if (sgstRow) {
            sgstRow.cells[0].textContent = 'SGST (9%)';
            setAmount(sgstRow.cells[1] ?? null, normalizedTaxes - halfTax);
          }
        }
      }

      const totalRow = doc.querySelector<HTMLTableRowElement>('tr.total-row');
      if (totalRow && totalRow.cells.length > 1) {
        setAmount(totalRow.cells[1], normalizedTotal);
      }

      const taxNote = doc.querySelector<HTMLElement>('.tax-note');
      if (taxNote) {
        taxNote.textContent = gstEnabled
          ? /igst/i.test(taxNote.textContent || '')
            ? 'This invoice includes GST as per applicable rates. IGST 18% has been applied.'
            : 'This invoice includes GST as per applicable rates. CGST 9% + SGST 9% has been applied.'
          : taxNote.textContent;
      }

      let out = doc.documentElement.outerHTML;
      out = patchInvoiceHtmlTripTypeCell(out, booking as unknown as ApiBooking);
      return out;
    } catch (error) {
      console.error('Failed to sanitize invoice HTML:', error);
      return patchInvoiceHtmlTripTypeCell(html, booking as unknown as ApiBooking);
    }
  }, [baseFare, gstEnabled, taxes, totalWithTaxes, formatCurrency, booking]);

  const invoiceHtml = useMemo(
    () => sanitizeInvoiceHtml(rawInvoiceHtml),
    [rawInvoiceHtml, sanitizeInvoiceHtml]
  );

  useEffect(() => {
    async function fetchLatestInvoice() {
      if (booking && booking.id) {
        setLoadingInvoice(true);
        setInvoiceError(null);
        try {
          const resp = await fetch(`/api/admin/get-invoice.php?booking_id=${booking.id}`);
          const data = await resp.json();
          if (data.status === 'success' && data.invoice && data.invoice.invoice_html) {
            setRawInvoiceHtml(data.invoice.invoice_html);
          } else {
            setRawInvoiceHtml(null);
            setInvoiceError('No invoice found for this booking.');
          }
        } catch (e) {
          setRawInvoiceHtml(null);
          setInvoiceError('Failed to load invoice.');
        } finally {
          setLoadingInvoice(false);
        }
      }
    }
    fetchLatestInvoice();
  }, [booking, sanitizeInvoiceHtml]);

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
      
      const pdfBase = Number(baseFare.toFixed(2));
      const pdfTaxes = Number(taxes.toFixed(2));
      const pdfTotal = Number(totalWithTaxes.toFixed(2));
      const pdfExtraCharges = Number(effectiveExtraCharges.toFixed(2));
      const pdfIsIGST = Boolean(invoiceHtml && /igst/i.test(invoiceHtml) && !/cgst/i.test(invoiceHtml));

      const blob = await pdf(
        <InvoicePDF
          booking={booking}
          subtotal={pdfBase}
          extraChargesTotal={pdfExtraCharges}
          taxes={pdfTaxes}
          totalWithTaxes={pdfTotal}
          isIGST={pdfIsIGST}
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
      if (date) {
        // Date is already in IST, just format it
        const pickupDate = new Date(date);
        return pickupDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
      return 'N/A';
    } catch {
      return 'N/A';
    }
  };
  const getVehicleType = () => booking.vehicle_type || booking.cab_type || booking.cabType || 'N/A';
  const getPaymentMethod = () => {
    const method = (booking as { payment_method?: string; paymentMethod?: string; payment_status?: string }).payment_method
      || (booking as { payment_method?: string; paymentMethod?: string; payment_status?: string }).paymentMethod;
    if (method && method !== 'N/A') return method;
    const paid = (booking as { payment_status?: string }).payment_status === 'paid' || booking.status === 'confirmed';
    return paid ? 'Online' : (method || 'N/A');
  };
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

  const effectiveBaseFare = typeof summaryBaseFare === 'number' ? summaryBaseFare : baseFare;
  const effectiveExtraCharges = typeof summaryExtraCharges === 'number' ? summaryExtraCharges : extraChargesTotal;

  if (gstEnabled) {
    const gstBaseAmount = Math.max(0, effectiveBaseFare + effectiveExtraCharges);
    taxes = Number((gstBaseAmount * 0.18).toFixed(2));
    totalWithTaxes = Number((gstBaseAmount + taxes).toFixed(2));
  } else {
    taxes = 0;
    totalWithTaxes = Number((effectiveBaseFare + effectiveExtraCharges).toFixed(2));
  }
  baseFare = effectiveBaseFare;

  // Loading or error state
  if (!invoiceHtml) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-lg font-semibold text-center">INVOICE</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-lg">
            {loadingInvoice ? 'Loading invoice...' : (invoiceError || 'No invoice found for this booking.')}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // --- Minimal 3-column layout ---
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-2">
          <DialogTitle className="text-base font-semibold text-center">INVOICE</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-3">
          {/* 3-Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold border-b pb-1">Customer</h3>
              <p className="text-sm">{getGuestName()}</p>
              <p className="text-sm">{getGuestPhone()}</p>
              <p className="text-sm">{getGuestEmail()}</p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold border-b pb-1">Trip</h3>
              <p className="text-sm">{getPickupLocation()} → {getDropLocation()}</p>
              <p className="text-sm">{getPickupDate()} {getPickupTime()}</p>
              <p className="text-sm">
                {booking.bookingType === 'group_tour' || getTripType() === 'group_tour' ? 'Group Tour' : getTripType()}
              </p>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold border-b pb-1">Fare</h3>
              <p className="text-sm">Base: ₹{formatCurrency(effectiveBaseFare)}</p>
              {effectiveExtraCharges > 0 && <p className="text-sm">Extras: ₹{formatCurrency(effectiveExtraCharges)}</p>}
              <p className="text-sm font-semibold">Total: ₹{formatCurrency(totalWithTaxes)}</p>
              <p className="text-sm capitalize">Payment: {getPaymentMethod()}</p>
            </div>
          </div>

          {/* Compact Fare Table (for GST/extra charges) */}
          {(gstEnabled || extraChargesArr.length > 0) && (
            <div className="text-sm">
              <table className="w-full">
                <tbody>
                  {gstEnabled && (
                    <tr><td className="py-1">GST (18%)</td><td className="text-right py-1">₹{taxes.toLocaleString('en-IN')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Company & Footer - Compact */}
          <div className="bg-muted/20 p-3 rounded text-sm text-muted-foreground flex flex-wrap justify-between items-center gap-2">
            <div>
              <p className="font-semibold text-foreground">Vizag Taxi Hub</p>
              <p>Visakhapatnam | +91 9966363662 | info@vizagtaxihub.com</p>
            </div>
            <p className="text-xs">Thank you for choosing Vizag Taxi Hub!</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-border">
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
