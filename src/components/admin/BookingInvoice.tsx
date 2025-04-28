
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { FileText, Download } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { getApiUrl } from '@/config/api';
import { Spinner } from "@/components/ui/spinner";

interface BookingInvoiceProps {
  booking: Booking;
  onClose: () => void;
  onGenerateInvoice?: (gstEnabled?: boolean, gstDetails?: any) => Promise<any>;
  isSubmitting?: boolean;
  pdfUrl?: string;
}

export function BookingInvoice({ booking, onClose, onGenerateInvoice, isSubmitting, pdfUrl }: BookingInvoiceProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownloadPdf = async () => {
    try {
      setLoading(true);
      
      const downloadUrl = pdfUrl || getApiUrl(`/api/download-invoice.php?id=${booking.id}`);
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${booking.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "Success",
        description: "Invoice downloaded successfully"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download invoice"
      });
      
      // Fallback method using iframe
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl || getApiUrl(`/api/download-invoice.php?id=${booking.id}`);
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">Download Invoice</h3>
          <p className="text-sm text-gray-500 mb-4">
            Click the button below to download the invoice for booking #{booking.id}
          </p>
          <div className="flex space-x-4">
            <Button onClick={handleDownloadPdf} disabled={loading || isSubmitting}>
              {(loading || isSubmitting) ? <Spinner className="mr-2" /> : <Download className="mr-2 h-4 w-4" />}
              Download PDF
            </Button>
            <Button variant="outline" onClick={onClose}>
              Back
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
