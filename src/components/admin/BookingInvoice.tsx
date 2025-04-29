
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

  // New simplified UI based on the screenshot
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Booking Invoice</h3>
        <Button variant="outline" onClick={onClose}>Close</Button>
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
                className="w-full bg-blue-500 hover:bg-blue-600"
                variant="default"
              >
                {(loading || regenerating || isSubmitting) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate Invoice
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {invoiceData && (
        <div className="pt-4 border-t">
          <div className="flex flex-col space-y-4">
            <div className="flex border rounded-md overflow-hidden">
              <button 
                className={`flex-1 p-3 flex items-center justify-center ${activeTab === "html" ? "bg-gray-100" : "bg-white"}`}
                onClick={() => setActiveTab("html")}
              >
                <FileText className="mr-2 h-4 w-4" />
                HTML Preview
              </button>
              <button 
                className={`flex-1 p-3 flex items-center justify-center ${activeTab === "pdf" ? "bg-gray-100" : "bg-white"}`}
                onClick={() => setActiveTab("pdf")}
                disabled={!pdfGenerationAvailable}
              >
                <FileIcon className="mr-2 h-4 w-4" />
                PDF Download
              </button>
            </div>
            
            {activeTab === "html" && (
              <div className="space-y-4">
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
              </div>
            )}
            
            {activeTab === "pdf" && (
              <div className="space-y-4">
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

