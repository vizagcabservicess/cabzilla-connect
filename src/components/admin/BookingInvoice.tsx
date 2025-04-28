
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

  // IMPROVED DOWNLOAD METHOD: Uses multiple approaches for more reliable PDF download
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
      
      // Method 1: Using fetch API first (most reliable for PDF loading)
      fetch(getApiUrl(`/api/download-invoice.php?${params.toString()}`))
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
          }
          return response.blob();
        })
        .then(blob => {
          // Create object URL and trigger download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice_${booking.id}_${customInvoiceNumber || 'download'}.pdf`;
          document.body.appendChild(a);
          a.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
          
          toast({
            title: "PDF Downloaded",
            description: "Your invoice has been downloaded successfully"
          });
        })
        .catch(error => {
          console.error("PDF fetch error:", error);
          
          // Fallback to iframe method
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = getApiUrl(`/api/download-invoice.php?${params.toString()}`);
          document.body.appendChild(iframe);
          
          toast({
            title: "Using Fallback Download Method",
            description: "We're trying an alternative download approach"
          });
          
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 5000);
        });
    } catch (error) {
      console.error("Invoice download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download invoice. Please try an alternative download method."
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
      
      // Method 2: Direct window.open for PDF
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
        description: "Please try the client-side PDF generation"
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

  // IMPROVED CLIENT-SIDE PDF GENERATION
  const handleDataUriDownload = () => {
    try {
      // Format date for display in the PDF
      const formattedDate = booking.pickupDate ? new Date(booking.pickupDate).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric'
      }) : 'N/A';
      
      // Calculate basic fare details
      let baseAmount = 0;
      let taxAmount = 0;
      let totalAmount = 0;
      
      if (booking.totalAmount) {
        totalAmount = parseFloat(booking.totalAmount.toString());
        baseAmount = gstEnabled ? totalAmount / 1.12 : totalAmount;
        baseAmount = Math.round(baseAmount);
        taxAmount = totalAmount - baseAmount;
      }
      
      // Create a more visually appealing PDF that matches the dashboard design
      const content = `
%PDF-1.7
1 0 obj
<</Type /Catalog /Pages 2 0 R>>
endobj
2 0 obj
<</Type /Pages /Kids [3 0 R] /Count 1>>
endobj
3 0 obj
<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>> >> >>
endobj
5 0 obj
<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>
endobj
6 0 obj
<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold>>
endobj
4 0 obj
<</Length 2000>>
stream
BT /F2 18 Tf 180 720 Td (Invoice #${customInvoiceNumber || `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${booking.id}`}) Tj ET

BT /F1 12 Tf 80 680 Td (Customer: ${booking.passengerName || 'N/A'}) Tj ET
BT /F1 12 Tf 80 660 Td (Phone: ${booking.passengerPhone || 'N/A'}) Tj ET
BT /F1 12 Tf 80 640 Td (Email: ${booking.passengerEmail || 'N/A'}) Tj ET

BT /F2 14 Tf 80 600 Td (Trip Details) Tj ET
BT /F1 12 Tf 80 580 Td (Trip Type: ${booking.tripType ? (booking.tripType.charAt(0).toUpperCase() + booking.tripType.slice(1)) : 'N/A'}) Tj ET
BT /F1 12 Tf 80 560 Td (Pickup: ${booking.pickupLocation || 'N/A'}) Tj ET
${booking.dropLocation ? `BT /F1 12 Tf 80 540 Td (Drop: ${booking.dropLocation}) Tj ET` : ''}
BT /F1 12 Tf 80 ${booking.dropLocation ? '520' : '540'} Td (Date: ${formattedDate}) Tj ET
BT /F1 12 Tf 80 ${booking.dropLocation ? '500' : '520'} Td (Vehicle: ${booking.cabType || 'N/A'}) Tj ET

BT /F2 14 Tf 80 460 Td (Fare Details) Tj ET
BT /F1 12 Tf 80 440 Td (Base Amount: \u20B9${baseAmount.toFixed(2)}) Tj ET
${gstEnabled ? isIGST ? 
    `BT /F1 12 Tf 80 420 Td (IGST (12%): \u20B9${taxAmount.toFixed(2)}) Tj ET` : 
    `BT /F1 12 Tf 80 420 Td (CGST (6%): \u20B9${(taxAmount/2).toFixed(2)}) Tj ET
     BT /F1 12 Tf 80 400 Td (SGST (6%): \u20B9${(taxAmount/2).toFixed(2)}) Tj ET` : ''}

BT /F2 14 Tf 80 ${gstEnabled ? '380' : '420'} Td (Total Amount: \u20B9${totalAmount.toFixed(2)}) Tj ET

BT /F1 10 Tf 80 120 Td (Thank you for choosing Vizag Cab Services!) Tj ET
BT /F1 10 Tf 80 100 Td (Contact: +91 9876543210 | Email: info@vizagcabs.com) Tj ET
BT /F1 10 Tf 80 80 Td (Generated on: ${new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}) Tj ET
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000010 00000 n
0000000056 00000 n
0000000111 00000 n
0000000212 00000 n
0000000434 00000 n
0000000500 00000 n
trailer
<</Size 7 /Root 1 0 R>>
startxref
1000
%%EOF
`;

      // Create blob and trigger download
      const blob = new Blob([content], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice_${booking.id}_${customInvoiceNumber || 'client'}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);
      
      toast({
        title: "Client-Side PDF Generated",
        description: "PDF generated in browser to match dashboard design"
      });
    } catch (error) {
      console.error("Client-side PDF generation error:", error);
      toast({
        variant: "destructive",
        title: "Client-Side Generation Failed",
        description: "Failed to generate PDF in browser"
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
