
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { bookingAPI } from "@/services/api";
import { MapPin, Calendar, Car, ArrowRight, DollarSign, Printer, Download } from "lucide-react";

const ReceiptPage = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) {
        setError("No booking ID provided");
        setLoading(false);
        return;
      }

      try {
        // Convert bookingId to a number since the API expects a number
        const response = await bookingAPI.getBookingById(bookingId);
        console.log("Booking details:", response);
        setBooking(response);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch booking details:", err);
        setError("Failed to fetch booking details. Please try again later.");
        setLoading(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch booking details",
        });
      }
    };

    fetchBookingDetails();
  }, [bookingId, toast]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-6 max-w-2xl mx-auto">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {error || "Booking not found"}
              </h2>
              <p className="text-gray-600 mb-6">
                We couldn't find the booking receipt you're looking for.
              </p>
              <Button onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <Card className="overflow-hidden">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
              <h1 className="text-xl font-bold">Booking Receipt</h1>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="text-white border-white hover:bg-blue-700">
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
                <Button variant="outline" size="sm" className="text-white border-white hover:bg-blue-700">
                  <Download className="w-4 h-4 mr-1" /> Download
                </Button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-start flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Booking #{booking.bookingNumber}</h2>
                  <p className="text-gray-500">ID: {booking.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Booking Date</p>
                  <p className="font-medium">{formatDate(booking.createdAt)}</p>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Trip Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">PICKUP LOCATION</p>
                        <p className="font-medium">{booking.pickupLocation}</p>
                      </div>
                    </div>
                    
                    {booking.dropLocation && (
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">DROP LOCATION</p>
                          <p className="font-medium">{booking.dropLocation}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">PICKUP DATE & TIME</p>
                        <p className="font-medium">{formatDate(booking.pickupDate)}</p>
                      </div>
                    </div>
                    
                    {booking.returnDate && (
                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">RETURN DATE & TIME</p>
                          <p className="font-medium">{formatDate(booking.returnDate)}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-start">
                      <Car className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">CAB TYPE</p>
                        <p className="font-medium">{booking.cabType}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <ArrowRight className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">TRIP TYPE</p>
                        <p className="font-medium capitalize">{booking.tripType} ({booking.tripMode})</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Passenger Details</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">NAME</p>
                      <p className="font-medium">{booking.passengerName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">PHONE</p>
                      <p className="font-medium">{booking.passengerPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">EMAIL</p>
                      <p className="font-medium">{booking.passengerEmail}</p>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <h3 className="font-semibold text-gray-800 mb-3">Payment Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Base Fare</span>
                      <span>₹{Math.round(booking.totalAmount * 0.85)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Taxes & Fees</span>
                      <span>₹{Math.round(booking.totalAmount * 0.15)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total Amount</span>
                      <span>₹{booking.totalAmount}</span>
                    </div>
                    <div className="mt-3 text-sm text-green-600 font-medium">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Payment Status: {booking.status === 'confirmed' ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="text-center text-gray-500 text-sm">
                <p>Thank you for choosing our service!</p>
                <p>If you have any questions, please contact our support at support@example.com</p>
                <p className="mt-2 text-xs">© {new Date().getFullYear()} Cab Service. All rights reserved.</p>
              </div>
            </div>
          </Card>
          
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="mr-2">
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate(`/booking/${booking.id}/edit`)}>
              Modify Booking
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
