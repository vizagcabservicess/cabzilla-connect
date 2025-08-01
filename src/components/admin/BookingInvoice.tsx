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

interface InvoiceState {
  gstEnabled: boolean;
  isIGST: boolean;
  includeTax: boolean;
  customInvoiceNumber: string;
  gstDetails: GSTDetails;
}

interface BookingInvoiceProps {
  booking: Booking;
  onGenerateInvoice: (gstEnabled?: boolean, gstDetails?: any, isIGST?: boolean, includeTax?: boolean, customInvoiceNumber?: string) => Promise<any>;
  onClose: () => void;
  isSubmitting: boolean;
  pdfUrl: string;
  invoiceState: InvoiceState;
  onInvoiceStateChange: (state: InvoiceState) => void;
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
  pdfUrl,
  invoiceState,
  onInvoiceStateChange
}: BookingInvoiceProps) {
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use lifted state from props
  const { gstEnabled, isIGST, includeTax, customInvoiceNumber, gstDetails } = invoiceState;
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

  // CRITICAL FIX: Use original fare field - NEVER use totalAmount for base fare calculation
  const extraChargesTotal = Array.isArray(booking.extraCharges)
    ? booking.extraCharges.reduce((sum, c) => sum + (c.amount || 0), 0)
    : 0;
  
  // Generate keys for storing original values
  const originalBaseFareKey = `original-base-fare-${booking.id}`;
  
  let baseFare = 0;
  
  // Check if we have a stored original base fare
  const storedBaseFare = localStorage.getItem(originalBaseFareKey);
  
  if (storedBaseFare && !isNaN(parseFloat(storedBaseFare))) {
    // Use the stored original base fare (never changes)
    baseFare = parseFloat(storedBaseFare);
    console.log(`Using locked base fare for booking ${booking.id}: ₹${baseFare}`);
  } else {
    // CRITICAL: Use booking.fare (original fare) instead of totalAmount which may include GST
    const originalFare = (typeof booking.fare === 'number' ? booking.fare : 0);
    
    if (originalFare > 0) {
      // Use the original fare from booking record
      baseFare = originalFare;
      console.log(`Using booking.fare as base fare for booking ${booking.id}: ₹${baseFare}`);
    } else {
      // Fallback: Calculate from totalAmount but subtract extra charges
      // This handles legacy bookings that might not have the fare field populated
      const rawTotal = (typeof booking.totalAmount === 'number' ? booking.totalAmount : 0);
      baseFare = rawTotal - extraChargesTotal;
      
      // If this seems to include GST (high amount), try to reverse it
      if (baseFare > 15000) {
        const possiblePreGstAmount = baseFare / 1.12;
        if (possiblePreGstAmount > 1000 && possiblePreGstAmount < baseFare * 0.95) {
          baseFare = Math.round(possiblePreGstAmount);
          console.log(`Reverse-calculated base fare from totalAmount: ₹${baseFare}`);
        }
      }
      console.log(`Calculated base fare for booking ${booking.id}: ₹${baseFare}`);
    }
    
    // Store the calculated original base fare (this never changes)
    localStorage.setItem(originalBaseFareKey, baseFare.toString());
    console.log(`Locked original base fare for booking ${booking.id}: ₹${baseFare}`);
  }
  
  // Function to reset base fare if needed (for development/debugging)
  const resetBaseFare = () => {
    localStorage.removeItem(originalBaseFareKey);
    console.log(`Base fare reset for booking ${booking.id}`);
  };

  useEffect(() => {
    async function fetchLatestInvoice() {
      if (booking && booking.id) {
        try {
          setLoading(true);
          const resp = await fetch(`/api/admin/get-invoice.php?booking_id=${booking.id}`);
          const data = await resp.json();
          
          if (data.status === 'success' && data.invoice) {
            setInvoiceData(data.invoice);
            
            // Only update state if there's no stored state in localStorage
            const hasStoredState = localStorage.getItem(`invoice-settings-${booking.id}`);
            if (!hasStoredState) {
              // Update form state from the fetched invoice only if no localStorage data exists
              const fetchedGstEnabled = !!data.invoice.gst_enabled;
              const fetchedGstDetails = {
                gstNumber: data.invoice.gst_number || '',
                companyName: data.invoice.company_name || '',
                companyAddress: data.invoice.company_address || ''
              };
              const fetchedInvoiceNumber = data.invoice.invoice_number || '';
              const fetchedIncludeTax = !!data.invoice.include_tax;
              const fetchedIsIGST = !!data.invoice.is_igst;
              
              onInvoiceStateChange({
                gstEnabled: fetchedGstEnabled,
                gstDetails: fetchedGstDetails,
                customInvoiceNumber: fetchedInvoiceNumber,
                includeTax: fetchedIncludeTax,
                isIGST: fetchedIsIGST
              });
            }
            
            // Set HTML content if available
            if (data.invoice.invoice_html) {
              setHtmlContent(data.invoice.invoice_html);
            }
          } else {
            console.log('No existing invoice found, using stored settings');
            setInvoiceData(null);
          }
        } catch (e) {
          console.error('Error fetching invoice:', e);
          setInvoiceData(null);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchLatestInvoice();
  }, [booking.id, onInvoiceStateChange]);

  // Only generate new invoice if we don't have existing data and we're not loading
  useEffect(() => {
    if (booking && booking.id && !loading && invoiceData === null) {
      console.log('No existing invoice found, generating new one with current settings');
      handleGenerateInvoice();
    }
  }, [booking.id, loading, invoiceData]);

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
      
      console.log('🔥 INVOICE GENERATION DEBUG:');
      console.log('Booking ID:', booking.id);
      console.log('Booking object:', booking);
      console.log('Locked Base Fare (frontend):', baseFare);
      console.log('Booking totalAmount:', booking.totalAmount);
      console.log('Booking fare:', booking.fare);
      console.log('Extra charges total:', extraChargesTotal);
      console.log('GST Settings:', { gstEnabled, isIGST, includeTax });
      
      // CRITICAL: Pass the locked base fare to prevent backend recalculation
      const extendedGstDetails = gstEnabled ? {
        ...gstDetails,
        lockedBaseFare: baseFare,  // Include the locked base fare
        originalTotalAmount: booking.totalAmount, // For comparison
        originalFare: booking.fare, // Original fare field
        extraChargesTotal: extraChargesTotal // Extra charges
      } : {
        lockedBaseFare: baseFare,
        originalTotalAmount: booking.totalAmount,
        originalFare: booking.fare,
        extraChargesTotal: extraChargesTotal
      };
      
      console.log('Extended GST Details being sent:', extendedGstDetails);
                 
      const result = await onGenerateInvoice(
        gstEnabled, 
        extendedGstDetails, 
        isIGST,
        includeTax,
        customInvoiceNumber.trim() || undefined
      );
      
      console.log('📨 Invoice generation result received:', result);
      console.log('📊 Result data structure:', result?.data);
      
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
      lockedBaseFare: baseFare.toString(),  // CRITICAL: Pass locked base fare
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
    onInvoiceStateChange({
      ...invoiceState,
      gstEnabled: checked,
      includeTax: checked ? true : invoiceState.includeTax
    });
    if (checked && !includeTax) {
      toast({
        title: "Tax Inclusion Enabled",
        description: "Enabling GST defaults to include tax in the price"
      });
    }
  };

  const handleGstDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onInvoiceStateChange({
      ...invoiceState,
      gstDetails: {
        ...invoiceState.gstDetails,
        [name]: value
      }
    });
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
    // Force re-render when state changes
    const forceRenderKey = `${invoiceData?.id || 'new'}-${gstEnabled}-${customInvoiceNumber}-${gstDetails.gstNumber}-${gstDetails.companyName}-${gstDetails.companyAddress}`;
    
    return (
      <div className="p-4 border rounded-md space-y-4" key={forceRenderKey}>
        <div>
          <Label htmlFor="custom-invoice">Custom Invoice Number</Label>
          <Input 
            id="custom-invoice"
            key={`custom-invoice-${forceRenderKey}`}
            value={customInvoiceNumber || ''}
            onChange={(e) => onInvoiceStateChange({...invoiceState, customInvoiceNumber: e.target.value})}
            placeholder="Optional - Leave blank for auto-generated number"
          />
          <p className="text-xs text-gray-500 mt-1">
            If provided, this will replace the auto-generated invoice number
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="gst-toggle"
            key={`gst-toggle-${forceRenderKey}`}
            checked={gstEnabled}
            onCheckedChange={handleGstToggle}
          />
          <Label htmlFor="gst-toggle">Include GST (12%)</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch 
            id="tax-toggle"
            key={`tax-toggle-${forceRenderKey}`}
            checked={includeTax}
            onCheckedChange={(checked) => onInvoiceStateChange({...invoiceState, includeTax: checked})}
          />
          <Label htmlFor="tax-toggle">{includeTax ? "Price including tax" : "Price excluding tax"}</Label>
        </div>
        
        {gstEnabled && (
          <div className="space-y-3" key={`gst-section-${forceRenderKey}`}>
            <div>
              <Label htmlFor="gstNumber">GST Number<span className="text-red-500">*</span></Label>
              <Input 
                id="gstNumber"
                name="gstNumber"
                key={`gstNumber-${forceRenderKey}`}
                value={gstDetails.gstNumber || ''}
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
                key={`companyName-${forceRenderKey}`}
                value={gstDetails.companyName || ''}
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
                key={`companyAddress-${forceRenderKey}`}
                value={gstDetails.companyAddress || ''}
                onChange={handleGstDetailsChange}
                placeholder="Enter company address"
              />
            </div>
            <Label>GST Type</Label>
            <RadioGroup 
              key={`gst-type-${forceRenderKey}`}
              value={isIGST ? "igst" : "cgst-sgst"} 
              onValueChange={(value) => onInvoiceStateChange({...invoiceState, isIGST: value === "igst"})}
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
         )}
         <div className="space-y-2">
           <Button 
             variant="outline" 
             onClick={handleRegenerateInvoice}
             disabled={loading || isSubmitting || regenerating || (gstEnabled && (!gstDetails.gstNumber || !gstDetails.companyName))}
             className="w-full"
           >
             <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
             Regenerate Invoice with Current Settings
           </Button>
           
           {/* Debug button to reset base fare cache */}
           <Button 
             variant="destructive" 
             size="sm"
             onClick={() => {
               resetBaseFare();
               toast({
                 title: "Base Fare Cache Cleared",
                 description: "The locked base fare has been reset. Please regenerate the invoice."
               });
             }}
             className="w-full"
           >
             🔧 Reset Base Fare Cache (Debug)
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
                    (booking.paymentStatus || booking.payment_status || invoiceData?.paymentStatus || booking.status) === 'paid'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }>
                    {(booking.paymentStatus || booking.payment_status || invoiceData?.paymentStatus || booking.status) === 'paid' ? 'Paid' : 'Pending'}
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
            
            <TabsContent value="settings" key={`settings-${invoiceData?.id || 'new'}-${gstEnabled}-${customInvoiceNumber}`}>
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
