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
  const [downloadCount, setDownloadCount] = useState(0);

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
      
      console.log('Generating invoice for booking:', booking.id, 
                 'with GST:', gstEnabled, 
                 'IGST:', isIGST, 
                 'Include Tax:', includeTax, 
                 'Custom Invoice Number:', customInvoiceNumber);
                 
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
      setDownloadCount(prev => prev + 1);
      
      const params = new URLSearchParams({
        id: booking.id.toString(),
        gstEnabled: gstEnabled ? '1' : '0',
        isIGST: isIGST ? '1' : '0',
        includeTax: includeTax ? '1' : '0',
        format: 'pdf',
        direct_download: '1',
        v: downloadCount.toString(),
        t: new Date().getTime().toString(),
        r: Math.random().toString(36).substring(2)
      });
      
      if (customInvoiceNumber.trim()) {
        params.append('invoiceNumber', customInvoiceNumber.trim());
      }
      
      if (gstEnabled) {
        params.append('gstNumber', gstDetails.gstNumber);
        params.append('companyName', gstDetails.companyName);
        params.append('companyAddress', gstDetails.companyAddress);
      }
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = getApiUrl(`/api/download-invoice.php?${params.toString()}`);
      document.body.appendChild(iframe);
      
      toast({
        title: "Invoice Download Started",
        description: "Your invoice is being downloaded via iframe"
      });
      
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    } catch (error) {
      console.error("Invoice download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download invoice. Please try again."
      });
    }
  };

  const handleAlternativeDownload = () => {
    try {
      setDownloadCount(prev => prev + 1);
      
      const params = new URLSearchParams({
        id: booking.id.toString(),
        gstEnabled: gstEnabled ? '1' : '0',
        isIGST: isIGST ? '1' : '0',
        includeTax: includeTax ? '1' : '0',
        format: 'pdf',
        direct_download: '1',
        v: downloadCount.toString(),
        t: new Date().getTime().toString(),
        r: Math.random().toString(36).substring(2)
      });
      
      if (customInvoiceNumber.trim()) {
        params.append('invoiceNumber', customInvoiceNumber.trim());
      }
      
      if (gstEnabled) {
        params.append('gstNumber', gstDetails.gstNumber);
        params.append('companyName', gstDetails.companyName);
        params.append('companyAddress', gstDetails.companyAddress);
      }
      
      window.open(getApiUrl(`/api/admin/download-invoice.php?${params.toString()}`), '_blank');
      
      toast({
        title: "Alternative Download Method",
        description: "PDF should open in a new tab"
      });
    } catch (error) {
      console.error("Alternative download error:", error);
      toast({
        variant: "destructive",
        title: "Alternative Download Failed",
        description: "Failed with alternative method. Please try again."
      });
    }
  };

  const handleGstToggle = (checked: boolean) => {
    setGstEnabled(checked);
    if (checked && !includeTax) {
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
    
    setRegenerating(true);
    setInvoiceData(null);
    
    setTimeout(() => {
      handleGenerateInvoice();
    }, 100);
  };

  const handleDataUriDownload = () => {
    try {
      const pdfContent = `%PDF-1.7
1 0 obj
<</Type /Catalog /Pages 2 0 R>>
endobj
2 0 obj
<</Type /Pages /Kids [3 0 R] /Count 1>>
endobj
3 0 obj
<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>>
endobj
4 0 obj
<</Length 44>>
stream
BT /F1 24 Tf 100 700 Td (Invoice #${booking.id}) Tj ET
endstream
endobj
trailer
<</Size 5 /Root 1 0 R>>
startxref
0
%%EOF`;

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${booking.id}.pdf`;
      link.click();
      
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      toast({
        title: "Client-Side PDF Generated",
        description: "Basic PDF generated in browser (test only)"
      });
    } catch (error) {
      console.error("Data URI download error:", error);
      toast({
        variant: "destructive",
        title: "Client-Side Generation Failed",
        description: "Failed to generate client-side PDF"
      });
    }
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
                
                <Button
                  variant="secondary"
                  onClick={handleAlternativeDownload}
                  disabled={loading || isSubmitting || regenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Alt Download
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleDataUriDownload}
                  disabled={loading || isSubmitting || regenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Client PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
