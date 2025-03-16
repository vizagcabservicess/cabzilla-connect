
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
import { bookingAPI, authAPI } from '@/services/api';
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
    // Check auth
    if (!authAPI.isAuthenticated()) {
      uiToast({
        title: "Authentication Required",
        description: "Please login to view this receipt",
        variant: "destructive",
      });
      navigate('/login', { state: { returnTo: `/receipt/${id}` } });
      return;
    }

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
  }, [id, navigate, uiToast]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    uiToast({
      title: "PDF Download",
      description: "PDF download functionality will be available soon.",
    });
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
          onClick={() => navigate('/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
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
          onClick={() => navigate('/dashboard')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Back to Dashboard
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
