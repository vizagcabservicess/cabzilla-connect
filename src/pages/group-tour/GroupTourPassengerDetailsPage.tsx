import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { groupTourAPI, type GroupTour } from '@/services/api/groupTourAPI';
import { initRazorpay, openRazorpayCheckout, type RazorpayResponse } from '@/services/razorpayService';
import { toast } from 'sonner';
import { Loader2, MapPin, Calendar, Users, ArrowLeft, ChevronDown, ChevronUp, User } from 'lucide-react';
import { INDIAN_STATES } from '@/lib/indianStates';
import { countryCodes } from '@/lib/countryCodes';

const STORAGE_KEY = 'groupTourSeatSelection';
const RESERVATION_STORAGE_KEY = 'groupTourReservationId';

type PassengerData = { name: string; age: string; gender: 'male' | 'female' | '' };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

function isValidPhone(phone: string, maxLength: number): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === maxLength && /^\d+$/.test(digits);
}

export default function GroupTourPassengerDetailsPage() {
  const { tourId } = useParams<{ tourId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pickup = searchParams.get('pickup') || '';
  const dropoff = searchParams.get('dropoff') || '';
  const date = searchParams.get('date') || '';

  const [tour, setTour] = useState<GroupTour | null>(null);
  const [stored, setStored] = useState<{ selectedSeats: string[]; seatPrices?: Record<string, number>; boarding_point_id?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reserving, setReserving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [expandedPassenger, setExpandedPassenger] = useState<number>(0);

  const [passengers, setPassengers] = useState<Record<string, PassengerData>>({});
  const [contactPhone, setContactPhone] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => countryCodes[0]);
  const [contactEmail, setContactEmail] = useState('');
  const [stateOfResidence, setStateOfResidence] = useState('');
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);
  const [hasGst, setHasGst] = useState(false);
  const [gstin, setGstin] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [reservationId, setReservationId] = useState<string | null>(null);
  const [reservationExpires, setReservationExpires] = useState<Date | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (String(data.tourId) === String(tourId) && Array.isArray(data.selectedSeats) && data.selectedSeats.length > 0) {
          setStored({
            selectedSeats: data.selectedSeats,
            seatPrices: data.seatPrices,
            boarding_point_id: data.boarding_point_id > 0 ? data.boarding_point_id : undefined,
          });
        }
      } catch (_) {}
    }
  }, [tourId]);

  useEffect(() => {
    const tid = parseInt(tourId || '0', 10);
    if (!tid) return;
    groupTourAPI.searchTours(pickup || '*', dropoff || '*', date || '')
      .then((tours) => {
        const t = tours.find((x) => x.id === tid);
        if (t) setTour(t);
      })
      .catch(() => toast.error('Failed to load tour'))
      .finally(() => setLoading(false));
  }, [tourId, pickup, dropoff, date]);

  useEffect(() => {
    initRazorpay().then(setRazorpayLoaded);
  }, []);

  const selectedSeats = stored?.selectedSeats ?? [];
  const seatPrices = stored?.seatPrices ?? {};
  const basePrice = tour?.price_per_seat ?? 500;
  const totalAmount = selectedSeats.reduce((sum, sid) => sum + (seatPrices[sid] ?? basePrice), 0);

  const updatePassenger = (seatId: string, field: keyof PassengerData, value: string | 'male' | 'female') => {
    setPassengers((p) => ({
      ...p,
      [seatId]: { ...(p[seatId] ?? { name: '', age: '', gender: '' }), [field]: value },
    }));
  };

  const handleProceedToPayment = async () => {
    setPhoneError('');
    setEmailError('');
    const tid = parseInt(tourId || '0', 10);
    if (!tid || selectedSeats.length === 0) {
      toast.error('Invalid session. Please start over.');
      navigate(`/group-tours/seat-selection/${tourId}?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`);
      return;
    }

    for (const seatId of selectedSeats) {
      const p = passengers[seatId];
      if (!p?.name?.trim()) {
        toast.error(`Please enter name for passenger (Seat ${seatId})`);
        return;
      }
      if (!p?.age?.trim() || isNaN(parseInt(p.age, 10)) || parseInt(p.age, 10) < 1 || parseInt(p.age, 10) > 120) {
        toast.error(`Please enter valid age for passenger (Seat ${seatId})`);
        return;
      }
      if (!p?.gender) {
        toast.error(`Please select gender for passenger (Seat ${seatId})`);
        return;
      }
    }

    if (!contactPhone.trim()) {
      setPhoneError('Please enter your phone number');
      toast.error('Please enter your phone number');
      return;
    }
    if (!isValidPhone(contactPhone, selectedCountryCode.maxLength)) {
      const msg =
        selectedCountryCode.code === 'IN'
          ? 'Please enter a valid 10-digit Indian phone number'
          : `Please enter a valid phone number (${selectedCountryCode.maxLength} digits for ${selectedCountryCode.name})`;
      setPhoneError(msg);
      toast.error(msg);
      return;
    }
    if (!contactEmail.trim()) {
      setEmailError('Please enter your email address');
      toast.error('Please enter your email address');
      return;
    }
    if (!isValidEmail(contactEmail)) {
      setEmailError('Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }
    if (hasGst) {
      if (!stateOfResidence) {
        toast.error('Please select your state of residence (required for GST tax invoicing)');
        return;
      }
      if (!gstin.trim()) {
        toast.error('Please enter GSTIN');
        return;
      }
      if (!businessName.trim()) {
        toast.error('Please enter business name');
        return;
      }
      if (!businessAddress.trim()) {
        toast.error('Please enter business address');
        return;
      }
      if (!businessEmail.trim()) {
        toast.error('Please enter business email');
        return;
      }
      if (!isValidEmail(businessEmail)) {
        toast.error('Please enter a valid business email address');
        return;
      }
    }

    if (!termsAccepted) {
      toast.error('Please accept Terms & conditions and Privacy policy to continue');
      return;
    }

    if (!razorpayLoaded) {
      toast.error('Payment gateway loading. Please wait...');
      return;
    }

    const primaryPassenger = passengers[selectedSeats[0]];
    const primaryName = primaryPassenger?.name?.trim() ?? '';
    const primaryGender = (primaryPassenger?.gender === 'male' || primaryPassenger?.gender === 'female') ? primaryPassenger.gender : 'male';

    setReserving(true);
    try {
      const passengerGenders = selectedSeats.map((s) => (passengers[s]?.gender === 'female' ? 'female' : 'male'));
      const fullPhone = selectedCountryCode.dialCode + contactPhone.replace(/\D/g, '');
      const res = await groupTourAPI.reserveSeats(tid, selectedSeats, {
        name: primaryName,
        email: contactEmail.trim(),
        phone: fullPhone,
        gender: primaryGender,
        passenger_genders: passengerGenders,
      });
      setReservationId(res.reservation_id);
      setReservationExpires(new Date(res.expires_at));
      sessionStorage.setItem(RESERVATION_STORAGE_KEY, res.reservation_id);
      setReserving(false);
      setPaying(true);

      const orderRes = await groupTourAPI.createOrder(
        tid,
        res.seat_ids,
        res.reservation_id,
        totalAmount,
        { name: primaryName, email: contactEmail.trim(), phone: fullPhone }
      );

      const reservationIdToUse = res.reservation_id;
      openRazorpayCheckout(
        {
          key: orderRes.razorpay_key_id,
          amount: orderRes.order.amount,
          currency: orderRes.order.currency,
          name: 'Vizag Taxi Hub',
          description: 'Tempo Traveller Seat Sharing',
          order_id: orderRes.order.id,
          prefill: { name: primaryName, email: contactEmail, contact: fullPhone },
          theme: { color: '#2563eb' },
          handler: (response: RazorpayResponse) => handlePaymentSuccess(response, reservationIdToUse),
          modal: {
            ondismiss: () => {
              setPaying(false);
              toast.warning('Payment cancelled. Your seat reservation will expire in 10 minutes.');
            },
          },
        },
        (r) => handlePaymentSuccess(r, reservationIdToUse),
        (err) => {
          setPaying(false);
          toast.error(err?.description || 'Payment failed');
        }
      );
    } catch (err: any) {
      setReserving(false);
      setPaying(false);
      toast.error(err?.message || 'Reservation failed');
    }
  };

  const handlePaymentSuccess = async (response: RazorpayResponse, reservationIdParam?: string) => {
    const rid = (reservationIdParam ?? reservationId ?? sessionStorage.getItem(RESERVATION_STORAGE_KEY))?.trim() || null;
    if (!rid) {
      setPaying(false);
      sessionStorage.removeItem(RESERVATION_STORAGE_KEY);
      toast.error('Session expired. Please select seats again.');
      navigate(`/group-tours/seat-selection/${tourId}?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`);
      return;
    }

    const tid = parseInt(tourId || '0', 10);
    const primaryPassenger = passengers[selectedSeats[0]];
    const primaryName = primaryPassenger?.name?.trim() ?? '';
    const primaryGender = (primaryPassenger?.gender === 'male' || primaryPassenger?.gender === 'female') ? primaryPassenger.gender : 'male';
    const fullPhone = selectedCountryCode.dialCode + contactPhone.replace(/\D/g, '');

    try {
      const seatAmounts: Record<string, number> = {};
      selectedSeats.forEach((sid) => {
        seatAmounts[sid] = seatPrices[sid] ?? basePrice;
      });

      const res = await groupTourAPI.verifyPayment(
        response.razorpay_payment_id,
        response.razorpay_order_id,
        response.razorpay_signature,
        {
          tour_id: tid,
          seat_ids: selectedSeats,
          reservation_id: rid,
          total_amount: totalAmount,
          seat_amounts: seatAmounts,
          customer_name: primaryName,
          customer_email: contactEmail.trim(),
          customer_phone: fullPhone,
          customer_gender: primaryGender,
          boarding_point_id: stored?.boarding_point_id && stored.boarding_point_id > 0 ? stored.boarding_point_id : undefined,
          drop_point_id: stored?.boarding_point_id && stored.boarding_point_id > 0 ? stored.boarding_point_id : undefined,
          passengers: selectedSeats.map((seatId) => ({
            seat_id: seatId,
            name: passengers[seatId]?.name?.trim() ?? '',
            age: parseInt(passengers[seatId]?.age ?? '0', 10) || null,
            gender: (passengers[seatId]?.gender === 'male' || passengers[seatId]?.gender === 'female') ? passengers[seatId].gender : null,
          })),
          state_of_residence: stateOfResidence || undefined,
          whatsapp_updates: whatsappUpdates,
          gstin: hasGst && gstin.trim() ? gstin.trim() : undefined,
          business_name: hasGst && businessName.trim() ? businessName.trim() : undefined,
          business_address: hasGst && businessAddress.trim() ? businessAddress.trim() : undefined,
          business_email: hasGst && businessEmail.trim() ? businessEmail.trim() : undefined,
        }
      );
      setPaying(false);
      toast.success('Booking confirmed!');
      const confirmData = {
        booking_number: res.booking_number,
        pickup_location: tour!.pickup_location,
        dropoff_location: tour!.dropoff_location,
        travel_date: tour!.travel_date,
        seats: selectedSeats,
        total_amount: totalAmount,
        customer_name: primaryName,
        customer_phone: fullPhone,
      };
      sessionStorage.setItem(`groupTourBooking_${res.booking_id}`, JSON.stringify(confirmData));
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(RESERVATION_STORAGE_KEY);
      navigate(`/group-tours/confirmation/${res.booking_id}`);
    } catch (err: any) {
      setPaying(false);
      const msg = err?.response?.data?.error ?? err?.message ?? 'Verification failed';
      toast.error(msg);
    }
  };

  if (loading && !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!stored || stored.selectedSeats.length === 0) {
    navigate(`/group-tours/seat-selection/${tourId}?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`);
    return null;
  }

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 100%)',
    backdropFilter: 'blur(12px)',
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 pt-24 pb-6">
        <div className="container mx-auto px-4">
          <Link
            to={`/group-tours/seat-selection/${tourId}?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`}
            className="inline-flex gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="h-3 w-3 shrink-0" />
            Back to seat selection
          </Link>
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 space-y-4">
              {/* Passenger details */}
              <div className="rounded-xl p-4 border border-white/50 shadow-lg" style={cardStyle}>
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Passenger details</h3>
                <div className="space-y-3">
                  {selectedSeats.map((seatId, idx) => {
                    const p = passengers[seatId] ?? { name: '', age: '', gender: '' };
                    const isExpanded = expandedPassenger === idx;
                    return (
                      <div key={seatId} className="rounded-lg border border-slate-200 bg-white/60 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedPassenger(isExpanded ? -1 : idx)}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
                              <User className="h-3 w-3 text-emerald-600" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-800">Passenger {idx + 1}</span>
                              <span className="text-xs text-slate-500 ml-1.5">Seat {seatId}</span>
                            </div>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs text-slate-600">Name <span className="text-red-500">*</span></Label>
                              <Input placeholder="Name" value={p.name} onChange={(e) => updatePassenger(seatId, 'name', e.target.value)} className="rounded-lg h-9 text-sm mt-0.5" />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600">Age <span className="text-red-500">*</span></Label>
                              <Input type="number" min={1} max={120} placeholder="Age" value={p.age} onChange={(e) => updatePassenger(seatId, 'age', e.target.value)} className="rounded-lg h-9 text-sm mt-0.5" />
                            </div>
                            <div>
                              <Label className="text-xs text-slate-600 block mb-1">Gender <span className="text-red-500">*</span></Label>
                              <div className="flex gap-3 mt-0.5">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="radio" name={`gender-${seatId}`} checked={p.gender === 'male'} onChange={() => updatePassenger(seatId, 'gender', 'male')} className="rounded-full" />
                                  <span className="text-xs">Male</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input type="radio" name={`gender-${seatId}`} checked={p.gender === 'female'} onChange={() => updatePassenger(seatId, 'gender', 'female')} className="rounded-full" />
                                  <span className="text-xs">Female</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Contact details */}
              <div className="rounded-xl p-4 border border-white/50 shadow-lg" style={cardStyle}>
                <h3 className="text-sm font-semibold text-slate-800 mb-0.5">Contact details</h3>
                <p className="text-xs text-slate-500 mb-3">Ticket details will be sent to</p>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-600">Phone <span className="text-red-500">*</span></Label>
                    <div className="flex gap-1.5 mt-0.5">
                      <select
                        value={selectedCountryCode.code}
                        onChange={(e) => {
                          const cc = countryCodes.find((c) => c.code === e.target.value);
                          if (cc) setSelectedCountryCode(cc);
                          setPhoneError('');
                        }}
                        className="flex-shrink-0 w-24 h-9 rounded-lg border border-input bg-background px-2 text-xs text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {countryCodes.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.dialCode}
                          </option>
                        ))}
                      </select>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Phone number"
                        value={contactPhone}
                        onChange={(e) => {
                          setContactPhone(e.target.value.replace(/\D/g, ''));
                          setPhoneError('');
                        }}
                        maxLength={selectedCountryCode.maxLength}
                        className={`rounded-lg h-9 text-sm flex-1 ${phoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                    </div>
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600">Email ID <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      placeholder="Email ID"
                      value={contactEmail}
                      onChange={(e) => {
                        setContactEmail(e.target.value);
                        setEmailError('');
                      }}
                      className={`rounded-lg h-9 text-sm mt-0.5 ${emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-1.5">
                      <svg className="h-4 w-4 text-green-600 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      <span className="text-xs text-slate-700">Send booking details and trip updates on WhatsApp</span>
                    </div>
                    <Switch checked={whatsappUpdates} onCheckedChange={setWhatsappUpdates} className="scale-90" />
                  </div>
                </div>
              </div>

              {/* GST section */}
              <div className="rounded-xl p-4 border border-white/50 shadow-lg" style={cardStyle}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">I have a GST number</h3>
                    <p className="text-xs text-slate-500">Optional</p>
                  </div>
                  <Checkbox checked={hasGst} onCheckedChange={(c) => setHasGst(!!c)} className="rounded scale-90" />
                </div>
                {hasGst && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <Label className="text-xs text-slate-600">State of Residence <span className="text-red-500">*</span></Label>
                      <p className="text-xs text-slate-500 mb-0.5">Required for GST Tax Invoicing</p>
                      <select value={stateOfResidence} onChange={(e) => setStateOfResidence(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-background px-2.5 text-xs mt-0.5">
                        <option value="">Select state</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">GSTIN <span className="text-red-500">*</span></Label>
                      <Input placeholder="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value)} className="rounded-lg h-9 text-sm mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Business Name <span className="text-red-500">*</span></Label>
                      <Input placeholder="Business Name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="rounded-lg h-9 text-sm mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Business Address <span className="text-red-500">*</span></Label>
                      <Input placeholder="Business Address" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className="rounded-lg h-9 text-sm mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600">Business Email <span className="text-red-500">*</span></Label>
                      <Input type="email" placeholder="Business Email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} className="rounded-lg h-9 text-sm mt-0.5" />
                    </div>
                    <div className="rounded-md bg-amber-100 border border-amber-200 px-3 py-2 text-amber-800 text-xs">
                      In case of invalid/cancelled GSTIN, this booking shall be considered as personal booking
                    </div>
                  </div>
                )}
              </div>

              {/* Terms acceptance */}
              <div className="rounded-xl p-4 border border-white/50 shadow-lg" style={cardStyle}>
                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(!!c)} className="mt-0.5 rounded scale-90" />
                  <label htmlFor="terms" className="text-xs text-slate-700 cursor-pointer leading-relaxed">
                    By clicking &apos;Proceed to Payment&apos;, I accept{' '}
                    <Link to="/terms-conditions" className="text-blue-600 underline hover:text-blue-700">Terms & conditions</Link>
                    {' '}and{' '}
                    <Link to="/privacy-policy" className="text-blue-600 underline hover:text-blue-700">Privacy policy</Link>
                  </label>
                </div>
              </div>
            </div>

            {/* Booking summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl p-3 border border-white/50 shadow-xl" style={{ ...cardStyle, background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)' }}>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Booking Summary</h3>
                <div className="space-y-1.5 text-sm font-medium text-slate-700">
                  <p className="flex items-center gap-2 text-sm"><MapPin className="h-3 w-3 text-blue-600 shrink-0" />{pickup || tour?.pickup_location} → {dropoff || tour?.dropoff_location}</p>
                  <p className="flex items-center gap-2 text-sm"><Calendar className="h-3 w-3 text-blue-600 shrink-0" />{date || tour?.travel_date}</p>
                  <p className="flex items-center gap-2 text-sm"><Users className="h-3 w-3 text-blue-600 shrink-0" />Seats: {selectedSeats.join(', ')}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                  {selectedSeats.map((sid) => (
                    <div key={sid} className="flex justify-between text-slate-600">
                      <span>{sid}</span>
                      <span>₹{(seatPrices[sid] ?? basePrice).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold text-slate-800 mt-1.5 text-lg"><span>Total</span><span>₹{totalAmount.toLocaleString('en-IN')}</span></div>
                </div>
                <Button
                  onClick={handleProceedToPayment}
                  disabled={reserving || paying}
                  className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3.5 rounded-lg text-sm font-semibold"
                >
                  {reserving || paying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {reserving ? 'Reserving...' : paying ? 'Opening payment...' : 'Proceed to Payment'}
                </Button>
                {reservationExpires && (
                  <p className="text-[10px] text-amber-600 mt-1.5">
                    Reservation expires in {Math.max(0, Math.ceil((reservationExpires.getTime() - Date.now()) / 60000))} min
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
