
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { Loader2, FileText, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BookingInvoiceProps {
  booking: Booking;
  onGenerateInvoice: () => Promise<any>;
  onClose: () => void;
  isSubmitting: boolean;
  pdfUrl: string;
}

export function BookingInvoice({
  booking,
  onGenerateInvoice,
  onClose,
  isSubmitting,
  pdfUrl
}: BookingInvoiceProps) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Try to generate invoice when component mounts
    if (booking && booking.id) {
      handleGenerateInvoice();
    }
  }, [booking?.id]);

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onGenerateInvoice();
      
      if (result && result.data) {
        setInvoiceData(result.data);
      } else {
        // If no data returned but no error, still remove loading state
        setInvoiceData(null);
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      setError(error instanceof Error ? error.message : "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    // Open PDF in new tab to trigger download
    window.open(pdfUrl, '_blank');
  };

  const renderInvoiceContent = () => {
    if (loading || isSubmitting) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p>Generating invoice...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (invoiceData?.invoiceHtml) {
      return (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="font-medium">Invoice #{invoiceData.invoiceNumber}</h3>
            <span>Generated: {invoiceData.invoiceDate}</span>
          </div>
          
          <div 
            className="invoice-preview border rounded-md overflow-hidden" 
            style={{ height: '400px', overflow: 'auto' }}
          >
            <iframe 
              srcDoc={invoiceData.invoiceHtml}
              title="Invoice Preview" 
              className="w-full h-full"
              style={{ border: 'none' }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="mb-4">No invoice has been generated for this booking yet.</p>
        <Button onClick={handleGenerateInvoice}>Generate Invoice</Button>
      </div>
    );
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {renderInvoiceContent()}
        
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={onClose}>
            Back
          </Button>
          
          <div className="flex space-x-2">
            {invoiceData && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleGenerateInvoice}
                  disabled={loading || isSubmitting}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                <Button
                  onClick={handleDownloadPdf}
                  disabled={loading || isSubmitting}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
