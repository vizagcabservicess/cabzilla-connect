import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { bookingAPI } from "@/services/api";
import { MapPin, Calendar, Car, ArrowRight, DollarSign, Printer } from "lucide-react";
import { BookingStatusManager } from "@/components/BookingStatusManager";
import { BookingStatus } from "@/types/api";
import { format, parseISO, isValid } from "date-fns";

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
        setLoading(true);
        const bookingIdNumber = parseInt(bookingId, 10);
        
        const response = await bookingAPI.getBookingById(bookingIdNumber);
        console.log("Booking details:", response);
        if (response) {
          setBooking(response);
        } else {
          throw new Error("Invalid booking data received");
        }
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

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    
    try {
      // Handle SQL datetime format (YYYY-MM-DD HH:MM:SS)
      if (dateString.includes(' ')) {
        const [datePart, timePart] = dateString.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        
        const date = new Date(year, month - 1, day, hour, minute, second);
        if (isNaN(date.getTime())) {
          throw new Error("Invalid date");
        }
        return format(date, "PPpp");
      }
      
      // Try standard ISO format
      const date = parseISO(dateString);
      if (!isValid(date)) {
        throw new Error("Invalid date");
      }
      return format(date, "PPpp");
    } catch (error) {
      console.error("Date formatting error:", error, "for date:", dateString);
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return "₹0";
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatTripType = (tripType?: string, tripMode?: string) => {
    if (!tripType) return "Standard Trip";
    
    const type = tripType.charAt(0).toUpperCase() + tripType.slice(1);
    let formattedMode = "";
    
    if (tripMode) {
      // Convert one-way to One Way, etc.
      formattedMode = tripMode
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `${type} (${formattedMode})`;
    }
    
    return type;
  };

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

  // Ensure totalAmount is a number
  const totalAmount = typeof booking.totalAmount === 'number' 
    ? booking.totalAmount 
    : parseFloat(booking.totalAmount) || 0;

  const paymentStatus = booking?.paymentStatus || booking?.payment_status || booking?.status || 'Pending';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <div>
              <h1 className="text-xl font-medium">Booking Receipt</h1>
              <p className="text-sm mt-1">#{booking?.bookingNumber}</p>
            </div>
            <div className="flex gap-2">
              <BookingStatusManager
                currentStatus={booking?.status as BookingStatus}
                onStatusChange={async () => {}}
                isAdmin={false}
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint} 
                className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-medium text-gray-800">
                  Booking #{booking?.bookingNumber}
                </h2>
                <p className="text-gray-500">ID: {booking?.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Booking Date</p>
                <p className="font-medium">
                  {booking?.createdAt ? formatDate(booking.createdAt) : "N/A"}
                </p>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Trip Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">PICKUP LOCATION</p>
                      <p className="font-medium">{booking?.pickupLocation || "N/A"}</p>
                    </div>
                  </div>
                  
                  {booking?.dropLocation && (
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">DROP LOCATION</p>
                        <p className="font-medium">{booking.dropLocation}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">PICKUP DATE & TIME</p>
                      <p className="font-medium">
                        {booking?.pickupDate ? formatDate(booking.pickupDate) : "N/A"}
                      </p>
                    </div>
                  </div>
                  
                  {booking?.tripType === 'outstation' && booking?.tripMode === 'round-trip' && booking?.returnDate && (
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-gray-500">RETURN DATE & TIME</p>
                        <p className="font-medium">{formatDate(booking.returnDate)}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start">
                    <Car className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">CAB TYPE</p>
                      <p className="font-medium">{booking?.cabType || "N/A"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <ArrowRight className="w-5 h-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <p className="text-xs text-gray-500">TRIP TYPE</p>
                      <p className="font-medium">
                        {formatTripType(booking?.tripType, booking?.tripMode)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Payment Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {booking.driverAllowance > 0 && (
                    <div className="flex justify-between mb-2">
                      <span>Driver Allowance</span>
                      <span>{formatCurrency(booking.driverAllowance)}</span>
                    </div>
                  )}
                  {booking.nightCharges > 0 && (
                    <div className="flex justify-between mb-2">
                      <span>Night Charges</span>
                      <span>{formatCurrency(booking.nightCharges)}</span>
                    </div>
                  )}
                  {booking.extraDistanceFare > 0 && (
                    <div className="flex justify-between mb-2">
                      <span>Extra Distance Charges</span>
                      <span>{formatCurrency(booking.extraDistanceFare)}</span>
                    </div>
                  )}
                  {booking.airportFee > 0 && (
                    <div className="flex justify-between mb-2">
                      <span>Airport Fee</span>
                      <span>{formatCurrency(booking.airportFee)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total Amount</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className={`mt-3 text-sm font-medium ${paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Payment Status: {paymentStatus === "paid" ? "Paid" : "Pending"}
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Passenger Details
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">NAME</p>
                      <p className="font-medium">{booking?.passengerName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">PHONE</p>
                      <p className="font-medium">{booking?.passengerPhone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">EMAIL</p>
                      <p className="font-medium">{booking?.passengerEmail || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ReceiptPage;
