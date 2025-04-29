
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { Loader2, FileText, Download, RefreshCw, AlertCircle, FileIcon, Printer } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { getApiUrl } from '@/config/api';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState<string>("html");
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [pdfGenerationAvailable, setPdfGenerationAvailable] = useState(false);

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
      
      if (result.html) {
        setHtmlContent(result.html);
        setActiveTab("html");
      }
      
      if (result.pdf) {
        setPdfGenerationAvailable(true);
      } else {
        setPdfGenerationAvailable(false);
      }
      
      setInvoiceData(result);
      
      toast({
        title: "Invoice Generated",
        description: "The invoice has been generated successfully",
      });
      
    } catch (error) {
      console.error('Error generating invoice:', error);
      
      setError(
        error instanceof Error ? 
        error.message : 
        "Failed to generate invoice. Please try again later."
      );
      
      toast({
        variant: "destructive",
        title: "Invoice Generation Failed",
        description: 
          error instanceof Error ? 
          error.message : 
          "Failed to generate invoice. Please try again."
      });
      
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      console.log('Downloading PDF from URL:', pdfUrl);
      
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.setAttribute('download', `Invoice_${booking.bookingNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadCount(prevCount => prevCount + 1);
    } else {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "PDF file is not available for download"
      });
    }
  };

  const handlePrintHtml = () => {
    if (htmlContent) {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        printWin.print();
        // Don't close the window automatically as some browsers need it open for printing
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    return '₹' + amount.toLocaleString('en-IN');
  };

  const calculateSubtotal = (): number => {
    let subtotal = booking.totalAmount || 0;
    
    // Add extra charges if they exist
    if (booking.extraCharges && Array.isArray(booking.extraCharges)) {
      subtotal += booking.extraCharges.reduce((sum, charge) => {
        return sum + (typeof charge.amount === 'number' ? charge.amount : 0);
      }, 0);
    }
    
    return subtotal;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">
          {loading || regenerating 
            ? "Generating Invoice..." 
            : "Booking Invoice"}
        </h3>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 mr-2" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Booking Information</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Booking #:</span> {booking.bookingNumber}</p>
                  <p><span className="text-gray-500">Date:</span> {new Date(booking.createdAt).toLocaleDateString()}</p>
                  <p><span className="text-gray-500">Status:</span> {booking.status}</p>
                  <p><span className="text-gray-500">Amount:</span> {formatCurrency(calculateSubtotal())}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Customer Information</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Name:</span> {booking.passengerName || 'N/A'}</p>
                  <p><span className="text-gray-500">Email:</span> {booking.passengerEmail || 'N/A'}</p>
                  <p><span className="text-gray-500">Phone:</span> {booking.passengerPhone || 'N/A'}</p>
                </div>
              </div>
              
              {booking.extraCharges && booking.extraCharges.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Extra Charges</h4>
                  <ul className="text-sm space-y-1">
                    {booking.extraCharges.map((charge: any, index: number) => (
                      <li key={index} className="flex justify-between">
                        <span>{charge.description || charge.label || `Charge ${index+1}`}</span>
                        <span>{formatCurrency(Number(charge.amount) || 0)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="gst-mode"
                  checked={gstEnabled}
                  onCheckedChange={setGstEnabled}
                />
                <Label htmlFor="gst-mode">Enable GST Invoice</Label>
              </div>

              {gstEnabled && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="gst-number">GST Number</Label>
                    <Input
                      id="gst-number"
                      value={gstDetails.gstNumber}
                      onChange={(e) => setGstDetails({...gstDetails, gstNumber: e.target.value})}
                      placeholder="e.g. 29AABCU9603R1ZJ"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={gstDetails.companyName}
                      onChange={(e) => setGstDetails({...gstDetails, companyName: e.target.value})}
                      placeholder="Company Name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company-address">Company Address</Label>
                    <Input
                      id="company-address"
                      value={gstDetails.companyAddress}
                      onChange={(e) => setGstDetails({...gstDetails, companyAddress: e.target.value})}
                      placeholder="Company Address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>GST Type</Label>
                    <RadioGroup 
                      value={isIGST ? "igst" : "cgst"} 
                      onValueChange={(val) => setIsIGST(val === "igst")}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cgst" id="cgst" />
                        <Label htmlFor="cgst">CGST + SGST (Within State)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="igst" id="igst" />
                        <Label htmlFor="igst">IGST (Interstate)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch 
                  id="include-tax"
                  checked={includeTax}
                  onCheckedChange={setIncludeTax}
                />
                <Label htmlFor="include-tax">Include Tax in Total</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="invoice-number">Custom Invoice Number (Optional)</Label>
                <Input
                  id="invoice-number"
                  value={customInvoiceNumber}
                  onChange={(e) => setCustomInvoiceNumber(e.target.value)}
                  placeholder="Leave blank for auto-generated"
                />
              </div>

              <Button 
                type="button" 
                onClick={() => {
                  setRegenerating(true);
                  handleGenerateInvoice();
                }}
                disabled={loading || regenerating || isSubmitting}
                className="w-full"
              >
                {(loading || regenerating || isSubmitting) ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {invoiceData ? "Regenerate Invoice" : "Generate Invoice"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {invoiceData && (
        <div className="pt-4 border-t">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="html" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                HTML Preview
              </TabsTrigger>
              <TabsTrigger value="pdf" className="flex items-center" disabled={!pdfGenerationAvailable}>
                <FileIcon className="mr-2 h-4 w-4" />
                PDF Download
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="html" className="space-y-4">
              <div className="h-[500px] border rounded overflow-auto bg-white">
                {htmlContent ? (
                  <iframe
                    srcDoc={htmlContent}
                    className="w-full h-full"
                    title="Invoice Preview"
                  />
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <p className="text-gray-500">HTML preview is not available</p>
                  </div>
                )}
              </div>
              
              <Button onClick={handlePrintHtml} className="w-full">
                <Printer className="mr-2 h-4 w-4" />
                Print HTML Invoice
              </Button>
            </TabsContent>
            
            <TabsContent value="pdf" className="space-y-4">
              <div className="h-[500px] border rounded overflow-hidden bg-gray-100 relative">
                {pdfUrl ? (
                  <iframe
                    src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="flex flex-col justify-center items-center h-full">
                    <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                    <p className="text-gray-600">PDF generation is not available</p>
                    <p className="text-sm text-gray-500 mt-2">Please use the HTML version instead</p>
                  </div>
                )}
              </div>
              
              <Button 
                onClick={handleDownload} 
                disabled={!pdfUrl}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF Invoice
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
