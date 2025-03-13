
import { useState } from 'react';
import { CabType, PromoCode, formatPrice, TripType, TripMode, LocalTripPurpose, hourlyPackages } from '@/lib/cabData';
import { Location } from '@/lib/locationData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X, CheckCircle, Calendar, MapPin, Users, ArrowRight, ArrowLeftRight, Clock, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface BookingSummaryProps {
  pickupLocation: Location | null;
  dropLocation: Location | null;
  pickupDate: Date | undefined;
  selectedCab: CabType | null;
  distance: number;
  totalPrice: number;
  tripType?: TripType;
  tripMode?: TripMode;
  tripPurpose?: LocalTripPurpose;
  hourlyPackage?: string;
  travelTime?: number;
}

export function BookingSummary({
  pickupLocation,
  dropLocation,
  pickupDate,
  selectedCab,
  distance,
  totalPrice,
  tripType = 'outstation',
  tripMode = 'one-way',
  tripPurpose,
  hourlyPackage,
  travelTime = 0
}: BookingSummaryProps) {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const applyPromoCode = () => {
    setIsApplyingPromo(true);
    setPromoError(null);
    
    // Simulate API call delay
    setTimeout(() => {
      // Mock promo codes for demo
      const validPromos: PromoCode[] = [
        {
          code: 'FIRST50',
          description: 'Get 50% off on your first ride',
          discount: 50,
          maxDiscount: 200,
          validUntil: new Date('2023-12-31')
        },
        {
          code: 'CAB100',
          description: 'Flat ₹100 off',
          discount: 0,
          maxDiscount: 100,
          validUntil: new Date('2023-12-31')
        }
      ];
      
      const promo = validPromos.find(
        p => p.code.toLowerCase() === promoCode.toLowerCase()
      );
      
      if (promo) {
        setAppliedPromo(promo);
        setPromoError(null);
      } else {
        setPromoError('Invalid promo code');
      }
      
      setIsApplyingPromo(false);
    }, 800);
  };
  
  const removePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
  };
  
  const calculateDiscount = (): number => {
    if (!appliedPromo) return 0;
    
    let discount = 0;
    
    if (appliedPromo.discount > 0) {
      // Percentage based discount
      discount = (totalPrice * appliedPromo.discount) / 100;
    } else if (appliedPromo.maxDiscount) {
      // Fixed amount discount
      discount = appliedPromo.maxDiscount;
    }
    
    // Apply maximum discount cap if present
    if (appliedPromo.maxDiscount && discount > appliedPromo.maxDiscount) {
      discount = appliedPromo.maxDiscount;
    }
    
    return discount;
  };
  
  const discountAmount = calculateDiscount();
  const finalPrice = totalPrice - discountAmount;
  
  const getSelectedPackageInfo = () => {
    if (tripType === 'local' && hourlyPackage) {
      const selectedPackage = hourlyPackages.find(pkg => pkg.id === hourlyPackage);
      return selectedPackage ? `${selectedPackage.name}` : '';
    }
    return '';
  };
  
  const handleBookNow = () => {
    // Create a booking object with all the details
    const bookingDetails = {
      pickupLocation,
      dropLocation,
      pickupDate,
      selectedCab,
      distance,
      tripType,
      tripMode,
      tripPurpose,
      hourlyPackage,
      appliedPromo,
      totalPrice,
      discountAmount,
      finalPrice,
      travelTime
    };
    
    // Save to sessionStorage (to access on confirmation page)
    sessionStorage.setItem('bookingDetails', JSON.stringify(bookingDetails));
    
    // Navigate to confirmation page
    navigate('/booking-confirmation');
  };
  
  if (!pickupLocation || (!dropLocation && tripType !== 'local') || !pickupDate || !selectedCab) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-card border border-cabGray-100 overflow-hidden">
      <div className="p-5 border-b border-cabGray-100">
        <h3 className="text-xl font-semibold text-cabGray-800">Booking Summary</h3>
        {tripType === 'outstation' && (
          <div className="mt-1 text-sm text-cabBlue-600 font-medium flex items-center">
            {tripMode === 'one-way' ? (
              <>
                <ArrowRight size={14} className="mr-1" /> One Way Trip
              </>
            ) : (
              <>
                <ArrowLeftRight size={14} className="mr-1" /> Round Trip
              </>
            )}
          </div>
        )}
        {tripType === 'local' && hourlyPackage && (
          <div className="mt-1 text-sm text-cabBlue-600 font-medium flex items-center">
            <Clock size={14} className="mr-1" /> {getSelectedPackageInfo()}
          </div>
        )}
      </div>
      
      <div className="p-5 space-y-4">
        <div className="flex items-start space-x-3">
          <MapPin className="text-cabBlue-500 mt-1 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-cabGray-500">PICKUP</p>
            <p className="font-medium text-cabGray-800">{pickupLocation.name}</p>
            <p className="text-xs text-cabGray-600">{pickupLocation.city}, {pickupLocation.state}</p>
          </div>
        </div>
        
        {tripType === 'local' ? (
          <div className="flex items-start space-x-3">
            <Briefcase className="text-cabBlue-500 mt-1 flex-shrink-0" size={18} />
            <div>
              <p className="text-xs text-cabGray-500">TRIP PURPOSE</p>
              <p className="font-medium text-cabGray-800">
                {tripPurpose === 'business' && 'Business Trip'}
                {tripPurpose === 'personal' && 'Personal Trip'}
                {tripPurpose === 'city-tour' && 'City Tour'}
              </p>
              <p className="text-xs text-cabGray-600">{getSelectedPackageInfo()}</p>
            </div>
          </div>
        ) : (
          dropLocation && (
            <div className="flex items-start space-x-3">
              <MapPin className="text-cabBlue-500 mt-1 flex-shrink-0" size={18} />
              <div>
                <p className="text-xs text-cabGray-500">DROP-OFF</p>
                <p className="font-medium text-cabGray-800">{dropLocation.name}</p>
                <p className="text-xs text-cabGray-600">{dropLocation.city}, {dropLocation.state}</p>
              </div>
            </div>
          )
        )}
        
        <div className="flex items-start space-x-3">
          <Calendar className="text-cabBlue-500 mt-1 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-cabGray-500">PICKUP TIME</p>
            <p className="font-medium text-cabGray-800">
              {format(pickupDate, 'EEEE, MMMM d, yyyy')}
            </p>
            <p className="text-xs text-cabGray-600">{format(pickupDate, 'h:mm a')}</p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <Users className="text-cabBlue-500 mt-1 flex-shrink-0" size={18} />
          <div>
            <p className="text-xs text-cabGray-500">CAB TYPE</p>
            <p className="font-medium text-cabGray-800">{selectedCab.name}</p>
            <p className="text-xs text-cabGray-600">
              {selectedCab.capacity} persons • {selectedCab.luggage} bags
            </p>
          </div>
        </div>
        
        <div className="border-t border-cabGray-100 pt-4 mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-cabGray-600">Base fare</span>
            <span className="text-cabGray-800">₹{selectedCab.price.toLocaleString('en-IN')}</span>
          </div>
          
          {tripType === 'local' ? (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-cabGray-600">{getSelectedPackageInfo()}</span>
              <span className="text-cabGray-800">
                ₹{Math.round(selectedCab.price * (hourlyPackages.find(pkg => pkg.id === hourlyPackage)?.multiplier || 1)).toLocaleString('en-IN')}
              </span>
            </div>
          ) : (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-cabGray-600">
                Distance ({distance} km) {tripType === 'outstation' && '(min. 250 km)'}
              </span>
              <span className="text-cabGray-800">₹{(distance * selectedCab.pricePerKm).toLocaleString('en-IN')}</span>
            </div>
          )}
          
          {tripType === 'outstation' && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-cabGray-600">Driver allowance</span>
              <span className="text-cabGray-800">₹250</span>
            </div>
          )}
          
          {appliedPromo && (
            <div className="flex justify-between text-sm mt-1 text-green-600">
              <span className="flex items-center">
                Discount <Tag size={14} className="ml-1" />
              </span>
              <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
        
        <div className="border-t border-cabGray-100 pt-4 flex justify-between items-center">
          <span className="font-semibold text-cabGray-800">Total Amount</span>
          <span className="font-semibold text-xl text-cabGray-800">
            ₹{finalPrice.toLocaleString('en-IN')}
          </span>
        </div>
        
        {!appliedPromo ? (
          <div className="mt-4">
            <p className="text-sm text-cabGray-600 mb-2">Have a promo code?</p>
            <div className="flex space-x-2">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter promo code"
                className="shadow-input"
              />
              <Button 
                onClick={applyPromoCode}
                disabled={!promoCode || isApplyingPromo}
                className="whitespace-nowrap"
              >
                {isApplyingPromo ? "Applying..." : "Apply"}
              </Button>
            </div>
            {promoError && <p className="text-sm text-red-500 mt-1">{promoError}</p>}
          </div>
        ) : (
          <div className="mt-4 bg-green-50 border border-green-100 rounded-md p-3 flex justify-between items-center">
            <div className="flex items-center">
              <CheckCircle size={16} className="text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">{appliedPromo.code} applied</p>
                <p className="text-xs text-green-600">{appliedPromo.description}</p>
              </div>
            </div>
            <button 
              className="text-cabGray-500 hover:text-cabGray-700"
              onClick={removePromo}
            >
              <X size={16} />
            </button>
          </div>
        )}
        
        <Button 
          className="w-full mt-4 py-6 text-base"
          onClick={handleBookNow}
        >
          Book Now
        </Button>
        
        <p className="text-xs text-cabGray-500 text-center mt-2">
          By booking, you agree to our Terms & Conditions and Privacy Policy
        </p>
      </div>
    </div>
  );
}
