
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, MapPin, Clock, Car, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { CabType } from '@/lib/cabData';
import { Location } from '@/lib/locationData';

interface BookingDetails {
  pickupLocation: Location;
  dropLocation: Location;
  pickupDate: string;
  selectedCab: CabType;
  distance: number;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

const BookingConfirmation = () => {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [bookingId, setBookingId] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    // Generate a random booking ID
    const generateBookingId = () => {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = 'BK';
      for (let i = 0; i < 8; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };

    try {
      // Retrieve booking details from sessionStorage
      const storedBooking = sessionStorage.getItem('bookingDetails');
      if (storedBooking) {
        const parsedBooking = JSON.parse(storedBooking);
        setBooking(parsedBooking);
        setBookingId(generateBookingId());
      } else {
        // If no booking details found, redirect to home
        navigate('/');
      }
    } catch (error) {
      console.error('Error retrieving booking details:', error);
      navigate('/');
    }
  }, [navigate]);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cabGray-50">
        <div className="text-cabGray-600">Loading booking details...</div>
      </div>
    );
  }

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
                Booking ID: <span className="font-mono font-bold">{bookingId}</span>
              </div>
            </div>
            
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1">
                  <p className="text-xs text-cabGray-500">PICKUP LOCATION</p>
                  <div className="flex items-start space-x-2">
                    <MapPin size={18} className="text-cabBlue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cabGray-800">{booking.pickupLocation.name}</p>
                      <p className="text-xs text-cabGray-600">
                        {booking.pickupLocation.city}, {booking.pickupLocation.state}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-cabGray-500">DROP LOCATION</p>
                  <div className="flex items-start space-x-2">
                    <MapPin size={18} className="text-cabBlue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cabGray-800">{booking.dropLocation.name}</p>
                      <p className="text-xs text-cabGray-600">
                        {booking.dropLocation.city}, {booking.dropLocation.state}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-cabGray-500">PICKUP DATE</p>
                  <div className="flex items-start space-x-2">
                    <Calendar size={18} className="text-cabBlue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cabGray-800">
                        {format(new Date(booking.pickupDate), 'EEEE, MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-cabGray-500">PICKUP TIME</p>
                  <div className="flex items-start space-x-2">
                    <Clock size={18} className="text-cabBlue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cabGray-800">
                        {format(new Date(booking.pickupDate), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-cabGray-500">CAB TYPE</p>
                  <div className="flex items-start space-x-2">
                    <Car size={18} className="text-cabBlue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cabGray-800">{booking.selectedCab.name}</p>
                      <p className="text-xs text-cabGray-600">
                        {booking.selectedCab.capacity} persons • {booking.selectedCab.luggage} bags
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-cabGray-500">PAYMENT</p>
                  <div className="flex items-start space-x-2">
                    <CreditCard size={18} className="text-cabBlue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-cabGray-800">₹{booking.finalPrice.toLocaleString('en-IN')}</p>
                      <p className="text-xs text-cabGray-600">Pay at pickup (Cash/Card)</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-cabGray-100 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-cabGray-800 mb-4">Driver Details</h3>
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-cabGray-200 rounded-full mr-4 flex items-center justify-center text-cabGray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                  <div>
                    <p className="font-medium text-cabGray-800">Driver will be assigned 1 hour before pickup</p>
                    <p className="text-sm text-cabGray-600">You'll receive driver details via SMS and email</p>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-cabGray-100 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-cabGray-800 mb-4">Fare Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-cabGray-600">Base fare</span>
                    <span className="text-cabGray-800">₹{booking.selectedCab.price.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-cabGray-600">Distance charge ({booking.distance} km)</span>
                    <span className="text-cabGray-800">
                      ₹{(booking.distance * booking.selectedCab.pricePerKm).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {booking.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-₹{booking.discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t border-cabGray-100">
                    <span>Total Amount</span>
                    <span>₹{booking.finalPrice.toLocaleString('en-IN')}</span>
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
