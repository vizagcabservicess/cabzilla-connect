
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { Loader2, FileText, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getApiUrl } from '@/config/api';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";

interface BookingInvoiceProps {
  booking: Booking;
  onGenerateInvoice: (gstEnabled?: boolean, gstDetails?: GSTDetails, isIGST?: boolean, includeTax?: boolean, customInvoiceNumber?: string) => Promise<any>;
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
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gstEnabled, setGstEnabled] = useState(false);
  const [isIGST, setIsIGST] = useState(false);
  const [includeTax, setIncludeTax] = useState(true);
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState('');
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

  const validateGSTDetails = () => {
    if (gstEnabled) {
      if (!gstDetails.gstNumber || gstDetails.gstNumber.trim() === '') {
        toast({
          variant: "destructive",
          title: "Missing GST Number",
          description: "Please enter a valid GST number"
        });
        return false;
      }
      
      if (!gstDetails.companyName || gstDetails.companyName.trim() === '') {
        toast({
          variant: "destructive",
          title: "Missing Company Name",
          description: "Please enter the company name"
        });
        return false;
      }
      
      if (!gstDetails.companyAddress || gstDetails.companyAddress.trim() === '') {
        toast({
          variant: "destructive",
          title: "Missing Company Address",
          description: "Please enter the company address"
        });
        return false;
      }
    }
    return true;
  };

  const handleGenerateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!validateGSTDetails()) {
        setLoading(false);
        return;
      }
      
      console.log('Generating invoice for booking:', booking.id, 'with GST:', gstEnabled, 'IGST:', isIGST, 'Include Tax:', includeTax, 'Custom Invoice Number:', customInvoiceNumber);
      
      // Force a new generation with current parameters
      const result = await onGenerateInvoice(
        gstEnabled, 
        gstEnabled ? gstDetails : undefined, 
        isIGST,
        includeTax,
        customInvoiceNumber.trim() || undefined
      );
      
      console.log('Invoice generation result:', result);
      
      if (result && result.data) {
        setInvoiceData(result.data);
        toast({
          title: "Invoice Generated",
          description: "Invoice was generated successfully"
        });
      } else {
        setInvoiceData(null);
        throw new Error('No invoice data returned from the server');
      }
    } catch (error) {
      console.error("Invoice generation error:", error);
      setError(error instanceof Error ? error.message : "Failed to generate invoice");
      toast({
        variant: "destructive",
        title: "Invoice Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate invoice"
      });
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    try {
      // Use a proper URL with query parameters (no body in GET request)
      const baseUrl = getApiUrl(`/api/admin/download-invoice`);
      const bookingIdParam = `?id=${booking.id}`;
      const gstParam = gstEnabled ? '&gstEnabled=1' : '';
      const igstParam = isIGST ? '&isIGST=1' : '';
      const includeTaxParam = includeTax ? '&includeTax=1' : '&includeTax=0';
      const invoiceNumberParam = customInvoiceNumber.trim() ? `&invoiceNumber=${encodeURIComponent(customInvoiceNumber.trim())}` : '';
      const gstDetailsParam = gstEnabled && gstDetails.gstNumber ? 
        `&gstNumber=${encodeURIComponent(gstDetails.gstNumber)}&companyName=${encodeURIComponent(gstDetails.companyName)}&companyAddress=${encodeURIComponent(gstDetails.companyAddress)}` : '';
      
      const downloadUrl = `${baseUrl}${bookingIdParam}${gstParam}${igstParam}${includeTaxParam}${invoiceNumberParam}${gstDetailsParam}`;
      console.log('Download invoice URL:', downloadUrl);
      
      // Open in a new window/tab for print-based PDF download
      window.open(downloadUrl, '_blank');
      
      toast({
        title: "Invoice Download Started",
        description: "Your invoice is being prepared in a new tab"
      });
    } catch (error) {
      console.error("Invoice download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download invoice. Please try again."
      });
    }
  };

  const handleGstToggle = (checked: boolean) => {
    setGstEnabled(checked);
    if (checked && !includeTax) {
      // When enabling GST, ensure we default to include tax
      setIncludeTax(true);
      toast({
        title: "Tax Inclusion Enabled",
        description: "Enabling GST defaults to include tax in the price"
      });
    }
  };

  const handleGstDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGstDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegenerateInvoice = () => {
    if (loading || isSubmitting) return;
    
    // Set regenerating flag to show appropriate feedback
    setRegenerating(true);
    setInvoiceData(null);
    
    // Force a re-generation after a short delay to ensure state updates
    setTimeout(() => {
      handleGenerateInvoice();
    }, 100);
  };

  const renderInvoiceContent = () => {
    if (loading || isSubmitting) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" className="mb-4" />
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

    if (regenerating) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Spinner size="lg" className="mb-4" />
          <p>Regenerating invoice with new settings...</p>
        </div>
      );
    }

    if (invoiceData?.invoiceHtml) {
      return (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="font-medium">Invoice #{invoiceData.invoiceNumber}</h3>
            <span>Generated: {invoiceData.invoiceDate}</span>
          </div>
          
          <div className="mb-4 p-4 border rounded-md space-y-4">
            <div>
              <Label htmlFor="custom-invoice">Custom Invoice Number</Label>
              <Input 
                id="custom-invoice"
                value={customInvoiceNumber}
                onChange={(e) => setCustomInvoiceNumber(e.target.value)}
                placeholder="Optional - Leave blank for auto-generated number"
              />
              <p className="text-xs text-gray-500 mt-1">
                If provided, this will replace the auto-generated invoice number
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch 
                id="gst-toggle"
                checked={gstEnabled}
                onCheckedChange={handleGstToggle}
              />
              <Label htmlFor="gst-toggle">Include GST (12%)</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="tax-toggle"
                checked={includeTax}
                onCheckedChange={setIncludeTax}
              />
              <Label htmlFor="tax-toggle">{includeTax ? "Price including tax" : "Price excluding tax"}</Label>
            </div>
            
            {gstEnabled && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="gstNumber">GST Number<span className="text-red-500">*</span></Label>
                  <Input 
                    id="gstNumber"
                    name="gstNumber"
                    value={gstDetails.gstNumber}
                    onChange={handleGstDetailsChange}
                    placeholder="Enter GST number"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="companyName">Company Name<span className="text-red-500">*</span></Label>
                  <Input 
                    id="companyName"
                    name="companyName"
                    value={gstDetails.companyName}
                    onChange={handleGstDetailsChange}
                    placeholder="Enter company name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="companyAddress">Company Address<span className="text-red-500">*</span></Label>
                  <Input 
                    id="companyAddress"
                    name="companyAddress"
                    value={gstDetails.companyAddress}
                    onChange={handleGstDetailsChange}
                    placeholder="Enter company address"
                    required
                  />
                </div>
                
                <div className="mt-4">
                  <Label>GST Type</Label>
                  <RadioGroup 
                    value={isIGST ? "igst" : "cgst-sgst"} 
                    onValueChange={(value) => setIsIGST(value === "igst")}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cgst-sgst" id="cgst-sgst" />
                      <Label htmlFor="cgst-sgst">Intra-state (CGST 6% + SGST 6%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="igst" id="igst" />
                      <Label htmlFor="igst">Inter-state (IGST 12%)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
            
            <div>
              <Button 
                variant="outline" 
                onClick={handleRegenerateInvoice}
                disabled={loading || isSubmitting || regenerating || (gstEnabled && (!gstDetails.gstNumber || !gstDetails.companyName || !gstDetails.companyAddress))}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
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
              sandbox="allow-same-origin"
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
                  onClick={handleRegenerateInvoice}
                  disabled={loading || isSubmitting || regenerating || (gstEnabled && (!gstDetails.gstNumber || !gstDetails.companyName || !gstDetails.companyAddress))}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button
                  onClick={handleDownloadPdf}
                  disabled={loading || isSubmitting || regenerating}
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
