import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { Loader2, FileText, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BookingInvoiceProps {
  booking: Booking;
  onGenerateInvoice: (gstEnabled?: boolean, gstDetails?: GSTDetails) => Promise<any>;
  onClose: () => void;
  isSubmitting: boolean;
  pdfUrl: string;
}

interface GSTDetails {
  gstNumber: string;
  companyName: string;
  companyAddress: string;
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
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstDetails, setGstDetails] = useState<GSTDetails>({
    gstNumber: '',
    companyName: '',
    companyAddress: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (booking && booking.id) {
      handleGenerateInvoice();
    }
  }, [booking?.id]);

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await onGenerateInvoice(gstEnabled, gstEnabled ? gstDetails : undefined);
      
      if (result?.data) {
        setInvoiceData(result.data);
        toast({
          title: "Success",
          description: "Invoice generated successfully"
        });
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      setError(error instanceof Error ? error.message : "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    const params = new URLSearchParams();
    params.append('id', booking.id.toString());
    if (gstEnabled) {
      params.append('gstEnabled', '1');
      params.append('gstNumber', gstDetails.gstNumber);
      params.append('companyName', gstDetails.companyName);
      params.append('companyAddress', gstDetails.companyAddress);
    }
    const downloadUrl = `${pdfUrl}?${params.toString()}`;
    window.open(downloadUrl, '_blank');
  };

  const handleGstToggle = (checked: boolean) => {
    setGstEnabled(checked);
  };

  const handleGstDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGstDetails(prev => ({
      ...prev,
      [name]: value
    }));
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
          
          <div className="mb-4 p-4 border rounded-md">
            <div className="flex items-center space-x-2">
              <Switch 
                id="gst-toggle"
                checked={gstEnabled}
                onCheckedChange={handleGstToggle}
              />
              <Label htmlFor="gst-toggle">Include GST (12%)</Label>
            </div>
            
            {gstEnabled && (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input 
                    id="gstNumber"
                    name="gstNumber"
                    value={gstDetails.gstNumber}
                    onChange={handleGstDetailsChange}
                    placeholder="Enter GST number"
                    required={gstEnabled}
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input 
                    id="companyName"
                    name="companyName"
                    value={gstDetails.companyName}
                    onChange={handleGstDetailsChange}
                    placeholder="Enter company name"
                    required={gstEnabled}
                  />
                </div>
                <div>
                  <Label htmlFor="companyAddress">Company Address</Label>
                  <Input 
                    id="companyAddress"
                    name="companyAddress"
                    value={gstDetails.companyAddress}
                    onChange={handleGstDetailsChange}
                    placeholder="Enter company address"
                    required={gstEnabled}
                  />
                </div>
              </div>
            )}
            
            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={handleGenerateInvoice}
                disabled={loading || isSubmitting}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Invoice with Current Settings
              </Button>
            </div>
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
