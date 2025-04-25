
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { DownloadCloud, RefreshCcw, ArrowLeft, Printer } from 'lucide-react';

interface BookingInvoiceProps {
  booking: Booking;
  downloadUrl: string;
  onGenerate: () => Promise<any>;
  onBack: () => void;
  isGenerating?: boolean;
}

export function BookingInvoice({ 
  booking,
  downloadUrl,
  onGenerate, 
  onBack,
  isGenerating = false
}: BookingInvoiceProps) {
  
  const handlePrint = () => {
    // Open a new window and print
    const printWindow = window.open(downloadUrl, '_blank');
    if (printWindow) {
      // If window opened, try to trigger print
      printWindow.addEventListener('load', () => {
        try {
          printWindow.print();
        } catch (e) {
          console.error('Failed to trigger print:', e);
        }
      });
    }
  };

  const getDirectDownloadUrl = () => {
    // Ensure we're using the download URL with direct flag
    if (downloadUrl.includes('?')) {
      if (!downloadUrl.includes('direct=1')) {
        return `${downloadUrl}&direct=1`;
      }
      return downloadUrl;
    }
    return `${downloadUrl}?direct=1`;
  };
  
  const getFallbackInvoiceHtml = () => {
    // Generate a basic invoice directly in the browser as a fallback
    const invoiceNumber = `INV-${Date.now().toString().substring(0, 10)}`;
    const generatedDate = new Date().toLocaleDateString();
    const baseFare = booking.totalAmount ? booking.totalAmount * 0.85 : 0;
    const taxAmount = booking.totalAmount ? booking.totalAmount * 0.15 : 0;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; }
          .header { display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 20px; margin-bottom: 20px; }
          .company { margin-bottom: 30px; }
          .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .customer { width: 45%; }
          .invoice-info { width: 45%; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; }
          .footer { text-align: center; font-size: 0.9em; color: #666; margin-top: 30px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div>
              <h1>INVOICE</h1>
              <p>Vizag Taxi Hub</p>
            </div>
            <div>
              <h2>${invoiceNumber}</h2>
              <p>Date: ${generatedDate}</p>
            </div>
          </div>
          
          <div class="details">
            <div class="customer">
              <h3>Bill To:</h3>
              <p>${booking.passengerName || 'Customer'}</p>
              <p>${booking.passengerPhone || ''}</p>
              <p>${booking.passengerEmail || ''}</p>
            </div>
            <div class="invoice-info">
              <h3>Trip Details:</h3>
              <p>Booking #: ${booking.bookingNumber}</p>
              <p>Date: ${new Date(booking.pickupDate || '').toLocaleDateString()}</p>
              <p>Vehicle: ${booking.cabType || 'Standard'}</p>
            </div>
          </div>
          
          <table>
            <tr>
              <th>Description</th>
              <th>Amount</th>
            </tr>
            <tr>
              <td>Base Fare</td>
              <td>₹${baseFare.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Tax</td>
              <td>₹${taxAmount.toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td>Total</td>
              <td>₹${(booking.totalAmount || 0).toFixed(2)}</td>
            </tr>
          </table>
          
          <div class="footer">
            <p>Thank you for choosing Vizag Taxi Hub.</p>
            <p>For support, contact: support@vizagtaxihub.com | +91 9966363662</p>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
  };
  
  const handleFallbackPrint = () => {
    // Create a new window with the fallback invoice HTML
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(getFallbackInvoiceHtml());
      printWindow.document.close();
    }
  };

  // Open download URL in an iframe to avoid page navigation
  const handleDownload = () => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = getDirectDownloadUrl();
      document.body.appendChild(iframe);
      
      // Remove iframe after download attempt
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    } catch (e) {
      console.error('Download failed, falling back to direct link:', e);
      window.open(getDirectDownloadUrl(), '_blank');
    }
  };
  
  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Booking Invoice</h3>
          <p className="text-sm text-gray-500">
            Invoice for booking #{booking.bookingNumber}
          </p>
        </div>
        
        <div className="p-4 bg-gray-50 rounded-md">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Booking Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{booking.bookingNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Invoice Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{new Date().toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="mt-1 text-sm text-gray-900">{booking.passengerName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="mt-1 text-sm text-gray-900">₹{booking.totalAmount?.toFixed(2)}</dd>
            </div>
          </dl>
        </div>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-2">
          <Button
            className="flex-1"
            variant="default"
            onClick={handlePrint}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print Invoice
          </Button>
          
          <Button
            className="flex-1"
            variant="outline"
            onClick={handleDownload}
          >
            <DownloadCloud className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onGenerate()}
            disabled={isGenerating}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {isGenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
          
          <Button
            variant="ghost"
            onClick={onBack}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="text-sm text-gray-500">
          <p className="mb-2">If you encounter issues with the invoice download:</p>
          <ul className="list-disc pl-5">
            <li>Try using the Print button instead</li>
            <li>Check your browser's download settings</li>
            <li>Try regenerating the invoice</li>
            <li>Contact support if problems persist</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
