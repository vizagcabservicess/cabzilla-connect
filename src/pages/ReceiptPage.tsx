
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader, 
  CardTitle, 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { bookingAPI } from '@/services/api';
import { 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  Car, 
  Download, 
  FileText, 
  MapPin, 
  Phone, 
  Printer, 
  User, 
  Mail
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Receipt {
  id: number;
  bookingNumber: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: string;
  returnDate?: string;
  cabType: string;
  distance: number;
  tripType: string;
  tripMode: string;
  totalAmount: number;
  status: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string;
  hourlyPackage?: string;
  tourId?: number;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  bookingDate: string;
  lastUpdated: string;
  cancellationReason?: string;
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast: uiToast } = useToast();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setIsLoading(true);
        setError(null);
        if (!id) {
          throw new Error('Receipt ID is missing');
        }

        const data = await bookingAPI.getReceipt(id);
        console.log('Receipt data:', data);
        setReceipt(data);
      } catch (error) {
        console.error('Failed to fetch receipt:', error);
        setError(error instanceof Error ? error.message : 'Failed to load receipt');
        
        uiToast({
          title: "Error Loading Receipt",
          description: error instanceof Error ? error.message : 'Failed to load receipt',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipt();
  }, [id, uiToast]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Create a function to generate PDF using browser's print functionality
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      uiToast({
        title: "Popup Blocked",
        description: "Please allow popups to download PDF",
        variant: "destructive",
      });
      return;
    }

    // Write the receipt HTML to the new window
    if (receiptRef.current) {
      printWindow.document.write('<html><head><title>Receipt</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: Arial, sans-serif; padding: 20px; }
        .receipt-container { max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .section { margin-bottom: 15px; }
        .company-name { font-size: 24px; font-weight: bold; }
        .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .flex { display: flex; align-items: start; margin-bottom: 8px; }
        .label { font-size: 12px; color: #666; text-transform: uppercase; }
        .value { font-weight: 500; }
        .separator { border-top: 1px solid #eee; margin: 15px 0; }
        .total { font-weight: bold; font-size: 18px; }
        .footer { text-align: center; margin-top: 30px; font-size: 14px; color: #666; }
        @media print {
          body { -webkit-print-color-adjust: exact; }
        }
      `);
      printWindow.document.write('</style></head><body>');
      
      // Create a simplified HTML version of the receipt
      printWindow.document.write('<div class="receipt-container">');
      
      // Header
      printWindow.document.write('<div class="header">');
      printWindow.document.write(`<div>
        <div class="company-name">${receipt?.companyName}</div>
        <div>${receipt?.companyAddress}</div>
        <div>${receipt?.companyPhone} | ${receipt?.companyEmail}</div>
      </div>`);
      printWindow.document.write(`<div>
        <div class="title">Receipt</div>
        <div>#${receipt?.bookingNumber}</div>
        <div>Date: ${receipt?.bookingDate ? format(new Date(receipt.bookingDate), 'dd MMM yyyy') : ''}</div>
      </div>`);
      printWindow.document.write('</div>');
      
      // Customer info
      printWindow.document.write('<div class="section">');
      printWindow.document.write('<div class="title">Customer Information</div>');
      printWindow.document.write(`<div>
        <div class="value">${receipt?.passengerName}</div>
        <div>${receipt?.passengerPhone}</div>
        <div>${receipt?.passengerEmail}</div>
      </div>`);
      printWindow.document.write('</div>');
      
      // Trip details
      printWindow.document.write('<div class="section">');
      printWindow.document.write('<div class="title">Trip Details</div>');
      printWindow.document.write('<div class="grid">');
      
      printWindow.document.write(`<div>
        <div class="label">Pickup Location</div>
        <div class="value">${receipt?.pickupLocation}</div>
      </div>`);
      
      if (receipt?.dropLocation) {
        printWindow.document.write(`<div>
          <div class="label">Drop Location</div>
          <div class="value">${receipt.dropLocation}</div>
        </div>`);
      }
      
      printWindow.document.write(`<div>
        <div class="label">Pickup Date</div>
        <div class="value">${receipt?.pickupDate ? format(new Date(receipt.pickupDate), 'dd MMM yyyy, h:mm a') : ''}</div>
      </div>`);
      
      if (receipt?.returnDate) {
        printWindow.document.write(`<div>
          <div class="label">Return Date</div>
          <div class="value">${format(new Date(receipt.returnDate), 'dd MMM yyyy, h:mm a')}</div>
        </div>`);
      }
      
      printWindow.document.write(`<div>
        <div class="label">Vehicle</div>
        <div class="value">${receipt?.cabType}</div>
      </div>`);
      
      printWindow.document.write(`<div>
        <div class="label">Trip Type</div>
        <div class="value">${receipt?.tripType} - ${receipt?.tripMode}</div>
      </div>`);
      
      printWindow.document.write('</div>'); // Close grid
      printWindow.document.write('</div>'); // Close section
      
      // Payment details
      printWindow.document.write('<div class="section">');
      printWindow.document.write('<div class="title">Payment Details</div>');
      printWindow.document.write('<div class="separator"></div>');
      
      printWindow.document.write(`<div class="flex" style="justify-content: space-between">
        <div>Base Fare</div>
        <div>₹${receipt?.totalAmount ? (receipt.totalAmount * 0.9).toFixed(2) : ''}</div>
      </div>`);
      
      printWindow.document.write(`<div class="flex" style="justify-content: space-between">
        <div>Taxes & Fees (10%)</div>
        <div>₹${receipt?.totalAmount ? (receipt.totalAmount * 0.1).toFixed(2) : ''}</div>
      </div>`);
      
      printWindow.document.write('<div class="separator"></div>');
      
      printWindow.document.write(`<div class="flex" style="justify-content: space-between">
        <div class="total">Total Amount</div>
        <div class="total">₹${receipt?.totalAmount?.toLocaleString('en-IN')}</div>
      </div>`);
      
      printWindow.document.write(`<div style="text-align: right; margin-top: 5px;">${receipt?.paymentStatus}</div>`);
      
      printWindow.document.write('</div>'); // Close section
      
      // Footer
      printWindow.document.write('<div class="footer">');
      printWindow.document.write(`<div>Thank you for choosing ${receipt?.companyName}!</div>`);
      printWindow.document.write(`<div>For any assistance, please contact us at ${receipt?.companyPhone}</div>`);
      printWindow.document.write('</div>');
      
      printWindow.document.write('</div>'); // Close receipt container
      printWindow.document.write('</body></html>');
      
      // Trigger print
      printWindow.document.close();
      printWindow.focus();
      
      // Short delay to allow styles to be applied
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      uiToast({
        title: "PDF Download",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return <span className="text-green-600 font-medium">{status.toUpperCase()}</span>;
      case 'pending':
        return <span className="text-yellow-600 font-medium">{status.toUpperCase()}</span>;
      case 'completed':
        return <span className="text-blue-600 font-medium">{status.toUpperCase()}</span>;
      case 'cancelled':
        return <span className="text-red-600 font-medium">{status.toUpperCase()}</span>;
      default:
        return <span className="text-gray-600 font-medium">{status.toUpperCase()}</span>;
    }
  };

  const handleGoBack = () => {
    // Check if we came from the dashboard or from somewhere else
    const referrer = document.referrer;
    if (referrer.includes('/dashboard')) {
      navigate('/dashboard');
    } else if (referrer.includes('/booking')) {
      navigate(`/booking/${id}/edit`);
    } else {
      navigate('/');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="flex justify-center p-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="container mx-auto py-10 px-4">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Receipt Not Found</AlertTitle>
          <AlertDescription>The receipt you're looking for could not be found.</AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2"
          >
            <Download size={16} /> Download PDF
          </Button>
          <Button 
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer size={16} /> Print Receipt
          </Button>
        </div>
      </div>

      <div ref={receiptRef} className="max-w-3xl mx-auto bg-white rounded-lg shadow-md print:shadow-none">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold print:text-3xl">{receipt.companyName}</CardTitle>
                <p className="text-gray-500">{receipt.companyAddress}</p>
                <p className="text-gray-500">{receipt.companyPhone} | {receipt.companyEmail}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold print:text-2xl">Receipt</div>
                <p className="text-gray-500">#{receipt.bookingNumber}</p>
                <p className="text-gray-500">Date: {format(new Date(receipt.bookingDate), 'dd MMM yyyy')}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm text-gray-500 uppercase">Billed To:</h3>
                <div className="mt-1 space-y-1">
                  <p className="font-medium">{receipt.passengerName}</p>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Phone size={14} className="mr-1" /> 
                    {receipt.passengerPhone}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Mail size={14} className="mr-1" /> 
                    {receipt.passengerEmail}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm text-gray-500 uppercase">Booking Details:</h3>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center text-gray-600 text-sm">
                    <Car size={14} className="mr-1" /> 
                    {receipt.cabType}
                  </div>
                  <div className="flex items-center text-gray-600 text-sm">
                    <Calendar size={14} className="mr-1" /> 
                    {format(new Date(receipt.pickupDate), 'dd MMM yyyy, h:mm a')}
                  </div>
                  <div className="text-gray-600 text-sm capitalize">
                    {receipt.tripType} - {receipt.tripMode}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm text-gray-500 uppercase mb-3">Trip Information:</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <MapPin size={16} className="mr-2 text-blue-500 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">PICKUP</p>
                    <p className="font-medium">{receipt.pickupLocation}</p>
                  </div>
                </div>

                {receipt.dropLocation && (
                  <div className="flex items-start">
                    <MapPin size={16} className="mr-2 text-blue-500 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">DROP-OFF</p>
                      <p className="font-medium">{receipt.dropLocation}</p>
                    </div>
                  </div>
                )}

                {receipt.distance > 0 && (
                  <div className="text-sm mt-2">
                    <span className="text-gray-500">Distance:</span> <span className="font-medium">{receipt.distance} km</span>
                  </div>
                )}

                {receipt.hourlyPackage && (
                  <div className="text-sm mt-2">
                    <span className="text-gray-500">Package:</span> <span className="font-medium">{receipt.hourlyPackage}</span>
                  </div>
                )}
              </div>
            </div>

            {(receipt.driverName || receipt.driverPhone || receipt.vehicleNumber) && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm text-gray-500 uppercase mb-3">Driver & Vehicle:</h3>
                  <div className="space-y-2">
                    {receipt.driverName && (
                      <div className="flex items-center">
                        <User size={16} className="mr-2 text-gray-500" />
                        <span className="font-medium">{receipt.driverName}</span>
                      </div>
                    )}
                    
                    {receipt.driverPhone && (
                      <div className="flex items-center">
                        <Phone size={16} className="mr-2 text-gray-500" />
                        <span>{receipt.driverPhone}</span>
                      </div>
                    )}
                    
                    {receipt.vehicleNumber && (
                      <div className="flex items-center">
                        <Car size={16} className="mr-2 text-gray-500" />
                        <span>{receipt.vehicleNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h3 className="text-sm text-gray-500 uppercase mb-3">Payment Summary:</h3>
              <div className="rounded-md border border-gray-200">
                <div className="divide-y divide-gray-200">
                  <div className="grid grid-cols-3 py-2 px-4">
                    <span className="text-gray-500">Base Fare</span>
                    <span className="text-gray-500">₹{(receipt.totalAmount * 0.9).toFixed(2)}</span>
                    <span className="text-right"></span>
                  </div>
                  <div className="grid grid-cols-3 py-2 px-4">
                    <span className="text-gray-500">Taxes & Fees (10%)</span>
                    <span className="text-gray-500">₹{(receipt.totalAmount * 0.1).toFixed(2)}</span>
                    <span className="text-right"></span>
                  </div>
                  <div className="grid grid-cols-3 py-3 px-4 font-semibold bg-gray-50">
                    <span>Total Amount</span>
                    <span>₹{receipt.totalAmount.toLocaleString('en-IN')}</span>
                    <span className="text-right">{receipt.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center mb-2">
                <FileText size={18} className="mr-2 text-blue-500" />
                <h3 className="font-medium">Booking Status: {formatStatus(receipt.status)}</h3>
              </div>
              
              {receipt.cancellationReason && (
                <div className="text-red-600 text-sm">
                  Cancellation Reason: {receipt.cancellationReason}
                </div>
              )}
              
              <div className="text-sm text-gray-500 mt-2">
                Payment Method: {receipt.paymentMethod}
              </div>
              
              <div className="text-sm text-gray-500">
                Last Updated: {format(new Date(receipt.lastUpdated), 'dd MMM yyyy, h:mm a')}
              </div>
            </div>
          </CardContent>

          <CardFooter className="text-center text-gray-500 text-sm border-t pt-6">
            <div className="w-full">
              <p>Thank you for choosing {receipt.companyName}!</p>
              <p className="mt-1">For any assistance, please contact us at {receipt.companyPhone}</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
