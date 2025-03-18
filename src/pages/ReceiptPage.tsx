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
import { format } from "date-fns";

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
        const response = await bookingAPI.getBookingById(bookingId);
        console.log("Booking details:", response);
        if (response && response.data) {
          setBooking(response.data);
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
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
      }
      return format(date, "PPpp");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  const calculatePriceBreakdown = (totalAmount: number) => {
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return { baseFare: 0, taxes: 0 };
    }
    const baseFare = Math.round(totalAmount * 0.85);
    const taxes = Math.round(totalAmount * 0.15);
    return { baseFare, taxes };
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return "₹0";
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatTripType = (tripType?: string, tripMode?: string) => {
    if (!tripType) return "Standard Trip";
    const type = tripType.charAt(0).toUpperCase() + tripType.slice(1);
    const mode = tripMode ? ` (${tripMode.replace('-', ' ')})` : '';
    return `${type}${mode}`;
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

  const { baseFare, taxes } = booking ? calculatePriceBreakdown(booking.totalAmount) : { baseFare: 0, taxes: 0 };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-3xl mx-auto">
          <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Booking Receipt</h1>
              <p className="text-sm mt-1">#{booking?.bookingNumber}</p>
            </div>
            <BookingStatusManager
              currentStatus={booking?.status as BookingStatus}
              onStatusChange={() => {}}
              isAdmin={false}
            />
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
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
                  
                  {booking?.returnDate && (
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
                  <div className="flex justify-between mb-2">
                    <span>Base Fare</span>
                    <span>{formatCurrency(baseFare)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Taxes & Fees</span>
                    <span>{formatCurrency(taxes)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold">
                    <span>Total Amount</span>
                    <span>{formatCurrency(booking?.totalAmount || 0)}</span>
                  </div>
                  <div className="mt-3 text-sm text-green-600 font-medium">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Payment Status:{" "}
                    {booking?.status === "payment_received" ? "Paid" : "Pending"}
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
