
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, MapPin, Clock, Car, CreditCard, ArrowRight, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { CabType } from '@/types/cab';
import { Location } from '@/lib/locationData';
import { bookingAPI } from '@/services/api';
import { Booking } from '@/types/api';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/formatUtils';

interface BookingDetails {
  pickupLocation: Location;
  dropLocation: Location;
  pickupDate: string;
  selectedCab: CabType;
  distance: number;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  bookingId: string;
  createdAt?: string;
  returnDate?: string;
  tripType?: string;
  tripMode?: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
  status?: string;
}

const mapBackendBookingToFrontend = (backendBooking: any, fallbackBooking?: any): BookingDetails => ({
  pickupLocation: {
    id: '1',
    name: backendBooking.pickupLocation || backendBooking.pickup_location || 'N/A',
    city: '',
    state: '',
    lat: 0,
    lng: 0,
    type: 'other',
    popularityScore: 0,
    isInVizag: false,
    address: backendBooking.pickupLocation || backendBooking.pickup_location || ''
  },
  dropLocation: {
    id: '2',
    name: backendBooking.dropLocation || backendBooking.drop_location || 'N/A',
    city: '',
    state: '',
    lat: 0,
    lng: 0,
    type: 'other',
    popularityScore: 0,
    isInVizag: false,
    address: backendBooking.dropLocation || backendBooking.drop_location || ''
  },
  selectedCab: {
    id: '1',
    name: backendBooking.cabType || backendBooking.cab_type || 'N/A',
    capacity: 4,
    luggageCapacity: 2,
    price: 0,
    pricePerKm: 0,
    image: '',
    amenities: [],
    description: '',
    ac: true
  },
  distance: backendBooking.distance || 0,
  totalPrice: backendBooking.totalAmount || backendBooking.total_amount || fallbackBooking?.totalPrice || 0,
  discountAmount: backendBooking.discountAmount || backendBooking.discount_amount || 0,
  finalPrice: backendBooking.totalAmount || backendBooking.total_amount || fallbackBooking?.totalPrice || 0,
  bookingId: backendBooking.id?.toString() || backendBooking.bookingId || backendBooking.booking_id || 'N/A',
  createdAt: backendBooking.createdAt || backendBooking.created_at,
  returnDate: backendBooking.returnDate || backendBooking.return_date,
  tripType: backendBooking.tripType || backendBooking.trip_type,
  tripMode: backendBooking.tripMode || backendBooking.trip_mode,
  passengerName: backendBooking.passengerName || backendBooking.passenger_name,
  passengerPhone: backendBooking.passengerPhone || backendBooking.passenger_phone,
  passengerEmail: backendBooking.passengerEmail || backendBooking.passenger_email,
  status: backendBooking.status || backendBooking.status_code,
  pickupDate: backendBooking.pickupDate || backendBooking.pickup_date || '',
});

const BookingConfirmation = () => {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [bookingId, setBookingId] = useState<string>('');
  const [latestBooking, setLatestBooking] = useState<BookingDetails | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Retrieve booking details from sessionStorage
    const storedBooking = sessionStorage.getItem('bookingDetails');
    if (storedBooking) {
      try {
        const parsedBooking = JSON.parse(storedBooking);
        setBooking(parsedBooking);
        setBookingId(parsedBooking.bookingId);
        // Fetch the latest booking details from the backend
        fetchLatestBooking(parsedBooking.bookingId);
      } catch (error) {
        console.error('Error parsing booking details:', error);
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

  const fetchLatestBooking = async (id: string) => {
    try {
      const response = await bookingAPI.getBookingById(id);
      console.log('API booking details response:', response);
      const mapped = mapBackendBookingToFrontend(response, booking);
      setLatestBooking(mapped);
    } catch (error) {
      console.error('Error fetching latest booking details:', error);
    }
  };

  const bookingToShow = latestBooking || booking;

  if (!bookingToShow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cabGray-50">
        <div className="text-cabGray-600">Loading booking details...</div>
      </div>
    );
  }

  const totalAmount = typeof bookingToShow.totalPrice === 'number' ? bookingToShow.totalPrice : parseFloat(bookingToShow.totalPrice) || 0;
  const { baseFare, taxes } = calculatePriceBreakdown(totalAmount);

  return (
    <div className="min-h-screen bg-cabGray-50">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-card border border-cabGray-100 overflow-hidden animate-fade-in">
            <div className="bg-cabBlue-500 text-white p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-white/80">Your cab has been booked successfully</p>
              <div className="mt-4 text-sm bg-white/10 rounded-md py-2 px-4 inline-block">
                Booking ID: <span className="font-mono font-bold">{bookingToShow.bookingId}</span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-cabGray-800">
                    Booking #{bookingToShow.bookingId}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-sm text-cabGray-500">Booking Date</p>
                  <p className="font-medium">
                    {bookingToShow.createdAt ? formatDate(bookingToShow.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-cabGray-800 mb-3">Trip Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-cabBlue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-cabGray-500">PICKUP LOCATION</p>
                        <p className="font-medium">{bookingToShow.pickupLocation?.name || 'N/A'}</p>
                      </div>
                    </div>
                    {bookingToShow.dropLocation?.name && (
                      <div className="flex items-start">
                        <MapPin className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-xs text-cabGray-500">DROP LOCATION</p>
                          <p className="font-medium">{bookingToShow.dropLocation.name}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-cabBlue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-cabGray-500">PICKUP DATE & TIME</p>
                        <p className="font-medium">
                          {bookingToShow.pickupDate ? formatDate(bookingToShow.pickupDate) : 'N/A'}
                        </p>
                      </div>
                    </div>
                    {bookingToShow.returnDate && (
                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-red-500 mt-0.5 mr-2" />
                        <div>
                          <p className="text-xs text-cabGray-500">RETURN DATE & TIME</p>
                          <p className="font-medium">{formatDate(bookingToShow.returnDate)}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start">
                      <Car className="w-5 h-5 text-cabBlue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-cabGray-500">CAB TYPE</p>
                        <p className="font-medium">{bookingToShow.selectedCab?.name || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <ArrowRight className="w-5 h-5 text-cabBlue-500 mt-0.5 mr-2" />
                      <div>
                        <p className="text-xs text-cabGray-500">TRIP TYPE</p>
                        <p className="font-medium">
                          {formatTripType(bookingToShow.tripType, bookingToShow.tripMode)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-cabGray-800 mb-3">Payment Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Base Fare</span>
                      <span>{formatPrice(baseFare)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Taxes & Fees</span>
                      <span>{formatPrice(taxes)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold">
                      <span>Total Amount</span>
                      <span>{formatPrice(totalAmount)}</span>
                    </div>
                    <div className="mt-3 text-sm text-green-600 font-medium">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Payment Status: {bookingToShow.status === 'payment_received' ? 'Paid' : 'Pending'}
                    </div>
                  </div>
                  <div className="mt-6">
                    <h3 className="font-semibold text-cabGray-800 mb-3">Passenger Details</h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-cabGray-500">NAME</p>
                        <p className="font-medium">{bookingToShow.passengerName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-cabGray-500">PHONE</p>
                        <p className="font-medium">{bookingToShow.passengerPhone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-cabGray-500">EMAIL</p>
                        <p className="font-medium">{bookingToShow.passengerEmail || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col md:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => navigate('/')} 
                  variant="outline" 
                  className="md:mr-4"
                >
                  Back to Home
                </Button>
                <Button>Download Invoice</Button>
              </div>
              
              <div className="mt-6 text-center text-cabGray-500 text-sm">
                Need help with your booking? <a href="#" className="text-cabBlue-600 hover:underline">Contact Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;

// Helper functions (copied from ReceiptPage)
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  try {
    if (dateString.includes(' ')) {
      const [datePart, timePart] = dateString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);
      const date = new Date(year, month - 1, day, hour, minute, second);
      if (isNaN(date.getTime())) throw new Error('Invalid date');
      return format(date, 'PPpp');
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) throw new Error('Invalid date');
    return format(date, 'PPpp');
  } catch {
    return 'Invalid Date';
  }
};

const calculatePriceBreakdown = (totalAmount: number) => {
  if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
    return { baseFare: 0, taxes: 0 };
  }
  const baseFare = Math.round(totalAmount * 0.85);
  const taxes = Math.round(totalAmount * 0.15);
  return { baseFare, taxes };
};

const formatTripType = (tripType?: string, tripMode?: string) => {
  if (!tripType) return 'Standard Trip';
  const type = tripType.charAt(0).toUpperCase() + tripType.slice(1);
  let formattedMode = '';
  if (tripMode) {
    formattedMode = tripMode
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return `${type} (${formattedMode})`;
  }
  return type;
};
