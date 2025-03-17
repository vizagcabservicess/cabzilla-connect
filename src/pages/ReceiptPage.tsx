
import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { useToast } from '@/components/ui/use-toast';
import { Download, Printer, Share2, Mail } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const { toast } = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadReceipt() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await bookingAPI.getReceipt(id);
        setBooking(data);
        setEmailAddress(data.passengerEmail || '');
      } catch (error) {
        console.error('Failed to load receipt:', error);
        setError(error instanceof Error ? error.message : 'Failed to load receipt');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load receipt. Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadReceipt();
  }, [id, toast]);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    
    try {
      toast({
        title: 'Generating PDF',
        description: 'Your receipt is being generated as a PDF...',
      });
      
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = canvas.height * imgWidth / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Receipt-${booking?.bookingNumber || id}.pdf`);
      
      toast({
        title: 'PDF Downloaded',
        description: 'Your receipt has been downloaded successfully.',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Failed',
        description: 'Could not generate PDF. Please try again later.',
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Booking Receipt - ${booking?.bookingNumber}`,
          text: 'Your cab booking receipt from Vizag Taxi Hub',
          url: window.location.href,
        });
        toast({
          title: 'Shared Successfully',
          description: 'Your receipt has been shared.',
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          variant: 'destructive',
          title: 'Sharing Failed',
          description: error instanceof Error ? error.message : 'Could not share receipt',
        });
      }
    } else {
      // Copy link to clipboard as fallback
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Link Copied',
        description: 'Receipt link copied to clipboard.',
      });
    }
  };

  const handleSendEmail = async () => {
    if (!id || !emailAddress) {
      toast({
        variant: 'destructive',
        title: 'Email Required',
        description: 'Please enter a valid email address.',
      });
      return;
    }
    
    try {
      setEmailSending(true);
      await bookingAPI.sendReceiptEmail(id, emailAddress);
      toast({
        title: 'Email Sent',
        description: 'Receipt has been sent to your email.',
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        variant: 'destructive',
        title: 'Email Failed',
        description: error instanceof Error ? error.message : 'Failed to send email',
      });
    } finally {
      setEmailSending(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-lg">Loading your receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto py-12 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Receipt</h1>
          <p className="mb-6">{error || 'Receipt not found'}</p>
          <Link to="/">
            <Button>Return to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 print:py-2">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex justify-between items-center print:hidden">
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
        
        <Card className="shadow-md" ref={receiptRef}>
          <CardHeader className="bg-blue-50 print:bg-white">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl text-blue-700">Booking Receipt</CardTitle>
                <CardDescription>Vizag Taxi Hub</CardDescription>
              </div>
              <div className="text-right">
                <p className="font-bold">Booking #{booking.bookingNumber}</p>
                <p className="text-sm text-gray-500">{formatDate(booking.createdAt)}</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Passenger Details</h3>
                <p className="font-medium">{booking.passengerName}</p>
                <p>{booking.passengerEmail}</p>
                <p>{booking.passengerPhone}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Trip Details</h3>
                <p><span className="font-medium">Trip Type:</span> {booking.tripType.charAt(0).toUpperCase() + booking.tripType.slice(1)} ({booking.tripMode})</p>
                <p><span className="font-medium">Vehicle:</span> {booking.cabType}</p>
                <p><span className="font-medium">Distance:</span> {booking.distance} km</p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Journey Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">FROM</p>
                  <p className="font-medium">{booking.pickupLocation}</p>
                  <p className="text-sm">{formatDate(booking.pickupDate)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">TO</p>
                  <p className="font-medium">{booking.dropLocation}</p>
                  {booking.returnDate && booking.tripMode === 'round-trip' && (
                    <p className="text-sm">Return: {formatDate(booking.returnDate)}</p>
                  )}
                </div>
              </div>
            </div>
            
            {booking.hourlyPackage && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-2">Package Details</h3>
                <p>{booking.hourlyPackage}</p>
              </div>
            )}
            
            <Separator className="my-6" />
            
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Subtotal</span>
              <span>₹{booking.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Taxes & Fees</span>
              <span>Included</span>
            </div>
            
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total</span>
              <span>₹{booking.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4 bg-gray-50 print:bg-white">
            <div className="w-full">
              <p className="text-gray-600 text-sm mb-2">
                <strong>Status:</strong> {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </p>
              <p className="text-gray-600 text-sm">
                For any assistance, please contact us at <a href="tel:+918887776666" className="text-blue-600">+91 8887776666</a> or <a href="mailto:info@vizagtaxihub.com" className="text-blue-600">info@vizagtaxihub.com</a>
              </p>
            </div>
          </CardFooter>
        </Card>
        
        <div className="mt-6 print:hidden">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input 
              type="email" 
              placeholder="Email address" 
              value={emailAddress} 
              onChange={(e) => setEmailAddress(e.target.value)} 
              className="flex-grow"
            />
            <Button 
              onClick={handleSendEmail} 
              disabled={emailSending || !emailAddress}
            >
              {emailSending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-transparent border-white rounded-full"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Receipt
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
