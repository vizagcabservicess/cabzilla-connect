import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from '@/types/api';
import { Loader2, FileText, Download, RefreshCw, AlertCircle, FileIcon } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [editMode, setEditMode] = useState(false);
  const [editedStatus, setEditedStatus] = useState(booking.payment_status || invoiceData?.paymentStatus || 'pending');
  const [editedMethod, setEditedMethod] = useState(booking.payment_method || invoiceData?.paymentMethod || '');
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const paymentMethods = [
    'Cash', 'Credit Card', 'Current Account', 'Overdraft account', 'PhonePe'
  ];

  // PATCH: Calculate base fare and extra charges correctly
  const extraChargesTotal = Array.isArray(booking.extraCharges)
    ? booking.extraCharges.reduce((sum, c) => sum + (c.amount || 0), 0)
    : 0;
  const baseFare = (typeof booking.totalAmount === 'number' ? booking.totalAmount : 0) - extraChargesTotal;

  useEffect(() => {
    if (booking && booking.id) {
      handleGenerateInvoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

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
      
      if (result && result.data) {
        setInvoiceData(result.data);
        toast({
          title: "Invoice Generated",
          description: "Invoice was generated successfully"
        });
        
        // Load HTML content immediately
        fetchHtmlInvoice();
        
        // Test if PDF generation is available
        testPdfGeneration();
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
      
      // Still try to fetch HTML, as it might work even if the main API fails
      fetchHtmlInvoice();
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  // Test if PDF generation is working
  const testPdfGeneration = async () => {
    try {
      const testUrl = getApiUrl(`/api/test-pdf.php?t=${new Date().getTime()}`);
      const response = await fetch(testUrl, { method: 'GET' });
      
      if (response.ok) {
        // If we can fetch the test page, we'll assume PDF might work
        setPdfGenerationAvailable(true);
      } else {
        setPdfGenerationAvailable(false);
      }
    } catch (error) {
      console.error("PDF test error:", error);
      setPdfGenerationAvailable(false);
    }
  };

  // Fetch HTML version of invoice
  const fetchHtmlInvoice = async () => {
    try {
      const htmlUrl = createPdfUrl(false, false, true);
      const response = await fetch(htmlUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch HTML: ${response.status} ${response.statusText}`);
      }
      
      const html = await response.text();
      setHtmlContent(html);
      setActiveTab("html"); // Auto-switch to HTML tab as it's more reliable
    } catch (error) {
      console.error("HTML fetch error:", error);
      // Don't show toast for this - it's a background operation
      setError("Could not load HTML invoice. Please try regenerating the invoice.");
    }
  };

  // Create a dynamic and unique URL for PDF download
  const createPdfUrl = (directDownload = false, useAdminEndpoint = false, htmlFormat = false) => {
    const timestamp = new Date().getTime();
    const randomPart = Math.random().toString(36).substring(2, 8);
    
    const endpoint = useAdminEndpoint 
      ? `/api/admin/download-invoice.php` 
      : `/api/download-invoice.php`;
      
    const params = new URLSearchParams({
      id: booking.id.toString(),
      gstEnabled: gstEnabled ? '1' : '0',
      isIGST: isIGST ? '1' : '0',
      includeTax: includeTax ? '1' : '0',
      format: htmlFormat ? 'html' : 'pdf',
      direct_download: directDownload ? '1' : '0',
      v: downloadCount.toString(),
      t: timestamp.toString(),
      r: randomPart
    });
    
    if (customInvoiceNumber.trim()) {
      params.append('invoiceNumber', customInvoiceNumber.trim());
    }
    
    if (gstEnabled) {
      params.append('gstNumber', gstDetails.gstNumber);
      params.append('companyName', gstDetails.companyName);
      params.append('companyAddress', gstDetails.companyAddress || '');
    }
    
    return getApiUrl(`${endpoint}?${params.toString()}`);
  };

  const handleDownloadPdf = () => {
    try {
      setDownloadCount(prev => prev + 1);
      const pdfUrl = createPdfUrl(false);
      
      // Open in new tab with browser's PDF viewer
      window.open(pdfUrl, '_blank');
      
      toast({
        title: "PDF Opened in New Tab",
        description: "Your invoice should open in a new browser tab"
      });
    } catch (error) {
      console.error("Invoice download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to download invoice. Please try the HTML version instead."
      });
    }
  };

  const handleViewHtml = () => {
    try {
      const htmlUrl = createPdfUrl(false, false, true);
      window.open(htmlUrl, '_blank');
      
      toast({
        title: "HTML Invoice",
        description: "HTML version of the invoice opened in a new tab"
      });
    } catch (error) {
      console.error("HTML view error:", error);
      toast({
        variant: "destructive",
        title: "HTML View Failed",
        description: "Failed to open HTML invoice"
      });
    }
  };

  const handleForceDownload = () => {
    try {
      setDownloadCount(prev => prev + 1);
      const pdfUrl = createPdfUrl(true);
      
      // Use download attribute to force download
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `Invoice_${booking.id}_${new Date().getTime()}.pdf`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your invoice download should begin shortly"
      });
    } catch (error) {
      console.error("Force download error:", error);
      toast({
        variant: "destructive",
        title: "Force Download Failed",
        description: "Failed to force download. Try the HTML version instead."
      });
    }
  };

  const handleAdminDownload = () => {
    try {
      setDownloadCount(prev => prev + 1);
      const pdfUrl = createPdfUrl(true, true); // true for direct download, true for admin endpoint
      
      window.open(pdfUrl, '_blank');
      
      toast({
        title: "Admin PDF Download",
        description: "Using admin endpoint to download PDF"
      });
    } catch (error) {
      console.error("Admin download error:", error);
      toast({
        variant: "destructive",
        title: "Admin Download Failed",
        description: "Failed to use admin download. Try the HTML version instead."
      });
    }
  };

  const handleTestPdfDownload = () => {
    try {
      const testUrl = getApiUrl(`/api/test-pdf.php?download=1&t=${new Date().getTime()}`);
      window.open(testUrl, '_blank');
      
      toast({
        title: "Testing PDF Generation",
        description: "Opening test PDF to verify if PDF generation works"
      });
    } catch (error) {
      console.error("Test PDF error:", error);
      toast({
        variant: "destructive",
        title: "Test PDF Failed",
        description: "Failed to open test PDF"
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
    setHtmlContent(null);
    
    setTimeout(() => {
      handleGenerateInvoice();
    }, 100);
  };

  // Placeholder for backend update
  async function updateBookingPayment(bookingId, status, method) {
    setIsSavingPayment(true);
    try {
      const response = await fetch('/api/update-booking.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bookingId,
          payment_status: status,
          payment_method: method,
        }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setInvoiceData((prev) => ({ ...prev, paymentStatus: status, paymentMethod: method }));
        booking.payment_status = status;
        booking.payment_method = method;
        setEditMode(false);
        toast({ title: 'Payment status updated!' });
      } else {
        console.error('Update failed:', result);
        toast({ title: 'Failed to update payment status', description: result.message || '', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed to update payment status', variant: 'destructive' });
    } finally {
      setIsSavingPayment(false);
    }
  }

  const renderInvoiceSettings = () => {
    return (
      <div className="p-4 border rounded-md space-y-4">
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
              <Label htmlFor="companyAddress">Company Address</Label>
              <Input 
                id="companyAddress"
                name="companyAddress"
                value={gstDetails.companyAddress}
                onChange={handleGstDetailsChange}
                placeholder="Enter company address"
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
            disabled={loading || isSubmitting || regenerating || (gstEnabled && (!gstDetails.gstNumber || !gstDetails.companyName))}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
            Regenerate Invoice with Current Settings
          </Button>
        </div>
      </div>
    );
  };

  const renderInvoicePreview = () => {
    if (!invoiceData?.invoiceHtml) {
      return (
        <div className="text-center py-8 border rounded-md">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="mb-4">No invoice preview available.</p>
          <Button onClick={handleGenerateInvoice} disabled={loading || isSubmitting}>Generate Invoice</Button>
        </div>
      );
    }
    
    return (
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
    );
  };

  const renderHtmlView = () => {
    if (!htmlContent) {
      return (
        <div className="text-center py-8 border rounded-md">
          <FileIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="mb-4">HTML invoice has not been loaded yet.</p>
          <Button onClick={fetchHtmlInvoice} disabled={loading || isSubmitting}>Load HTML Invoice</Button>
        </div>
      );
    }
    
    return (
      <div 
        className="html-preview border rounded-md overflow-hidden" 
        style={{ height: '400px', overflow: 'auto' }}
      >
        <iframe 
          srcDoc={htmlContent}
          title="HTML Invoice" 
          className="w-full h-full"
          style={{ border: 'none' }}
          sandbox="allow-same-origin"
        />
      </div>
    );
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

    if (invoiceData?.invoiceHtml || htmlContent) {
      return (
        <div>
          <div className="mb-4 flex justify-between">
            <h3 className="font-medium">Invoice #{invoiceData?.invoiceNumber || 'Generated'}</h3>
            <span>Generated: {invoiceData?.invoiceDate || new Date().toLocaleDateString()}</span>
          </div>
          
          {/* Payment Status and Method */}
          <div className="mb-4 flex items-center gap-6">
            {editMode ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Payment Status:</span>
                  <select
                    value={editedStatus}
                    onChange={e => setEditedStatus(e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="payment_received">Paid</option>
                  </select>
                </div>
                {editedStatus === 'payment_received' && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Mode:</span>
                    <select
                      value={editedMethod}
                      onChange={e => setEditedMethod(e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="">Select</option>
                      {paymentMethods.map(method => (
                        <option key={method} value={method}>{method}</option>
                      ))}
                    </select>
                  </div>
                )}
                <Button
                  size="sm"
                  className="ml-2"
                  onClick={() => updateBookingPayment(booking.id, editedStatus, editedMethod)}
                  disabled={isSavingPayment || (editedStatus === 'payment_received' && !editedMethod)}
                >
                  {isSavingPayment ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => setEditMode(false)}
                  disabled={isSavingPayment}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Payment Status:</span>
                  <span className={
                    (booking.payment_status || invoiceData?.paymentStatus) === 'payment_received'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }>
                    {(booking.payment_status || invoiceData?.paymentStatus) === 'payment_received' ? 'Paid' : 'Pending'}
                  </span>
                </div>
                {(booking.payment_status === 'payment_received' || invoiceData?.paymentStatus === 'payment_received') && (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Mode:</span>
                    <span>{booking.payment_method || invoiceData?.paymentMethod || 'N/A'}</span>
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-2"
                  onClick={() => {
                    setEditedStatus(booking.payment_status || invoiceData?.paymentStatus || 'pending');
                    setEditedMethod(booking.payment_method || invoiceData?.paymentMethod || '');
                    setEditMode(true);
                  }}
                >
                  Edit
                </Button>
              </>
            )}
          </div>
          
          {/* PATCH: Render correct fare breakdown in the invoice preview (HTML or JSX) */}
          <div className="fare-breakdown mb-6">
            <div className="flex justify-between">
              <span>Base Fare</span>
              <span>₹{baseFare}</span>
            </div>
            {extraChargesTotal > 0 && (
              <div className="flex justify-between">
                <span>Extra Charges</span>
                <span>₹{extraChargesTotal}</span>
              </div>
            )}
            <div className="flex justify-between font-bold border-t pt-2 mt-2 text-lg">
              <span>Total Amount</span>
              <span>₹{booking.totalAmount}</span>
            </div>
          </div>

          <Tabs defaultValue="html" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="html" className="flex-1">HTML View</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings">
              {renderInvoiceSettings()}
            </TabsContent>
            
            <TabsContent value="preview">
              {renderInvoicePreview()}
            </TabsContent>
            
            <TabsContent value="html">
              {renderHtmlView()}
            </TabsContent>
          </Tabs>

          {!pdfGenerationAvailable && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                PDF generation may not be working correctly on the server. 
                HTML view is recommended for reliable invoice viewing.
              </AlertDescription>
            </Alert>
          )}
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
            {(invoiceData || htmlContent) && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleRegenerateInvoice}
                  disabled={loading || isSubmitting || regenerating || (gstEnabled && (!gstDetails.gstNumber || !gstDetails.companyName))}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button
                  onClick={handleViewHtml}
                  disabled={loading || isSubmitting || regenerating}
                  variant="secondary"
                >
                  <FileIcon className="h-4 w-4 mr-2" />
                  HTML
                </Button>
                
                <Button
                  onClick={handleDownloadPdf}
                  disabled={loading || isSubmitting || regenerating}
                  variant={pdfGenerationAvailable ? "default" : "outline"}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Open PDF
                </Button>
                
                <Button
                  variant={pdfGenerationAvailable ? "secondary" : "outline"}
                  onClick={handleForceDownload}
                  disabled={loading || isSubmitting || regenerating}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              onClick={handleTestPdfDownload}
            >
              <FileText className="h-4 w-4 mr-2" />
              Test PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
