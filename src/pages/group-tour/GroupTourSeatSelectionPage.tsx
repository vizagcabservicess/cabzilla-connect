import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { SeatMap } from '@/components/group-tour/SeatMap';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { groupTourAPI, type GroupTour, type BoardingPoint, type SeatStatus } from '@/services/api/groupTourAPI';
import { toast } from 'sonner';
import { Loader2, MapPin, Calendar, Users, ArrowLeft, Clock, PanelRightOpen, Check, FileText } from 'lucide-react';

const MAX_SEATS = 6;
const POLL_INTERVAL = 5000;
const RESERVATION_MINUTES = 10;

export default function GroupTourSeatSelectionPage() {
  const { tourId } = useParams<{ tourId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pickup = searchParams.get('pickup') || '';
  const dropoff = searchParams.get('dropoff') || '';
  const date = searchParams.get('date') || '';

  const [tour, setTour] = useState<GroupTour | null>(null);
  const [seats, setSeats] = useState<Record<string, SeatStatus>>({});
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerGender, setCustomerGender] = useState<'male' | 'female' | ''>('');
  const [boardingPoints, setBoardingPoints] = useState<BoardingPoint[]>([]);
  const [selectedBoardingPoint, setSelectedBoardingPoint] = useState<BoardingPoint | null>(null);
  const [boardingPanelOpen, setBoardingPanelOpen] = useState(false);
  const panelAutoOpened = useRef(false);
  const [policyTab, setPolicyTab] = useState<'cancellation' | 'vehicle' | 'other'>('cancellation');

  const basePrice = tour?.price_per_seat ?? 500;
  const seatPrices: Record<string, number> = {};
  selectedSeats.forEach((sid) => {
    const p = seats[sid]?.price;
    seatPrices[sid] = p != null ? p : basePrice;
  });
  const totalAmount = selectedSeats.reduce((sum, sid) => sum + (seatPrices[sid] ?? basePrice), 0);

  const fetchTourAndSeats = useCallback(async () => {
    const tid = parseInt(tourId || '0', 10);
    if (!tid) return;
    try {
      const [tours, seatData, points] = await Promise.all([
        groupTourAPI.searchTours(pickup || '*', dropoff || '*', date || ''),
        groupTourAPI.getSeatAvailability(tid),
        groupTourAPI.getBoardingPoints(tid),
      ]);
      const t = tours.find((x) => x.id === tid);
      if (t) setTour(t);
      setSeats(seatData.seats || {});
      setBoardingPoints(points);
    } catch (err) {
      toast.error('Failed to load seats');
    }
  }, [tourId, pickup, dropoff, date]);

  useEffect(() => {
    fetchTourAndSeats().finally(() => setLoading(false));
  }, [fetchTourAndSeats]);

  useEffect(() => {
    const tid = parseInt(tourId || '0', 10);
    if (!tid || loading) return;
    const interval = setInterval(fetchTourAndSeats, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [tourId, loading, fetchTourAndSeats]);

  useEffect(() => {
    if (boardingPoints.length > 0 && !selectedBoardingPoint) {
      setSelectedBoardingPoint(boardingPoints[0]);
    }
  }, [boardingPoints]);

  useEffect(() => {
    if (boardingPoints.length > 0 && !loading && !panelAutoOpened.current) {
      panelAutoOpened.current = true;
      setBoardingPanelOpen(true);
    }
  }, [boardingPoints.length, loading]);

  // When gender changes to male (or cleared), deselect any female-only seats
  useEffect(() => {
    if (customerGender !== 'female') {
      setSelectedSeats((prev) =>
        prev.filter((sid) => !seats[sid]?.is_female_only)
      );
    }
  }, [customerGender, seats]);

  const handleSeatClick = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((s) => s.filter((id) => id !== seatId));
    } else if (selectedSeats.length < MAX_SEATS) {
      const s = seats[seatId];
      const status = s?.status;
      const isFemaleOnly = s?.is_female_only;
      if (status === 'available') {
        if (isFemaleOnly && customerGender !== 'female') return;
        setSelectedSeats((s) => [...s, seatId].sort());
      }
    }
  };

  if (loading && !tour) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Tour not found.</p>
      </div>
    );
  }

  return (
    <>
      <Navbar />
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100 pt-24 pb-6">
      <div className="container mx-auto px-4">
        <Link
          to={`/group-tours/search?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="h-3 w-3 shrink-0" />
          Back
        </Link>
        {/* Boarding point slide-in panel */}
        <Sheet open={boardingPanelOpen} onOpenChange={setBoardingPanelOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-base">Select Boarding Point</SheetTitle>
              <p className="text-xs text-slate-500">Choose your pickup location for this tour</p>
            </SheetHeader>
            <div className="mt-6 space-y-2">
              {boardingPoints.length === 0 ? (
                <p className="text-slate-600 py-4">No boarding points configured for this tour.</p>
              ) : (
                boardingPoints.map((bp) => {
                  const isSelected = selectedBoardingPoint?.id === bp.id;
                  return (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => {
                      setSelectedBoardingPoint(bp);
                      setBoardingPanelOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all flex items-start gap-2 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                    }`}>
                      {isSelected ? <Check className="h-3 w-3 text-white" /> : null}
                    </span>
                    <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{bp.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-600 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {bp.boarding_time || '07:00'}
                    </p>
                    {bp.address ? (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {bp.address}
                      </p>
                    ) : null}
                    </div>
                  </button>
                  );
                })
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          {/* Main: Seat map */}
          <div className="lg:col-span-2 space-y-4">
            <div
              className="rounded-xl p-3 border border-white/50 shadow-lg flex flex-wrap items-center justify-between gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 100%)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {tour.pickup_location} → {tour.dropoff_location}
                </p>
                <p className="text-xs text-slate-500">{tour.travel_date}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBoardingPanelOpen(true)}
                className="gap-1.5 text-xs h-8"
              >
                <PanelRightOpen className="h-3 w-3" />
                {selectedBoardingPoint ? selectedBoardingPoint.name : 'Select boarding point'}
              </Button>
            </div>

            <div className="mb-3">
              <label className="text-xs font-medium text-slate-600 block mb-1">Your gender (for female-only seats)</label>
              <select
                value={customerGender}
                onChange={(e) => setCustomerGender(e.target.value as 'male' | 'female' | '')}
                className="w-full max-w-xs h-9 rounded-lg border border-input bg-background px-2.5 text-xs"
              >
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <SeatMap
              seats={seats}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
              maxSelections={MAX_SEATS}
              disabled={false}
              customerGender={customerGender}
              showPrices
              basePrice={basePrice}
            />

            {/* Cancellation & Other policies */}
            <div
              className="rounded-xl border border-white/50 shadow-lg overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.5) 100%)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className="flex border-b border-slate-200 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPolicyTab('cancellation')}
                  className={`flex-1 min-w-0 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 ${policyTab === 'cancellation' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  Cancellation
                </button>
                <button
                  type="button"
                  onClick={() => setPolicyTab('vehicle')}
                  className={`flex-1 min-w-0 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 ${policyTab === 'vehicle' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  Vehicle & Booking
                </button>
                <button
                  type="button"
                  onClick={() => setPolicyTab('other')}
                  className={`flex-1 min-w-0 px-3 py-3 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 ${policyTab === 'other' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  Other
                </button>
              </div>
              <div className="p-4 text-sm text-slate-700">
                {policyTab === 'cancellation' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800">Cancellation policy</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left p-2 font-medium text-slate-700">Time before travel</th>
                            <th className="text-left p-2 font-medium text-slate-700">Deduction</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          <tr className="border-t border-slate-100"><td className="p-2">More than 24 hours</td><td className="p-2">15% of seat fare</td></tr>
                          <tr className="border-t border-slate-100"><td className="p-2">12–24 hours before departure</td><td className="p-2">20% of seat fare</td></tr>
                          <tr className="border-t border-slate-100"><td className="p-2">6–12 hours before departure</td><td className="p-2">50% of seat fare</td></tr>
                          <tr className="border-t border-slate-100"><td className="p-2">Less than 6 hours</td><td className="p-2">100% (no refund)</td></tr>
                        </tbody>
                      </table>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                      <li>Cancellation charges are computed on a per-seat basis.</li>
                      <li>Ticket cannot be cancelled after scheduled departure from the first boarding point.</li>
                      <li>For group bookings, individual seats can be cancelled.</li>
                    </ul>
                  </div>
                )}
                {policyTab === 'vehicle' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800">Vehicle & booking policy</h4>
                    <p className="text-xs text-slate-600">We assign vehicles based on confirmed passengers:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                      <li><strong>10–17:</strong> Tempo Traveller</li>
                      <li><strong>7:</strong> Innova Crysta</li>
                      <li><strong>5–6:</strong> Ertiga</li>
                      <li><strong>1–4:</strong> Sedan</li>
                    </ul>
                    <p className="text-xs text-slate-600"><strong>Minimum 4 bookings</strong> required. If fewer 24h before departure, we&apos;ll contact you. Choose: full refund, reschedule, or upgrade to private tour.</p>
                  </div>
                )}
                {policyTab === 'other' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800">Other policies</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">Child passenger policy</p>
                        <p className="text-xs text-slate-600 mt-0.5">Children above 5 years will need a separate seat and ticket.</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">Luggage policy</p>
                        <p className="text-xs text-slate-600 mt-0.5">1 piece of Checkin luggage per passenger accepted free.</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">Pets policy</p>
                        <p className="text-xs text-slate-600 mt-0.5">Pets are not allowed on group tours.</p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">Pick-up time policy</p>
                        <p className="text-xs text-slate-600 mt-0.5">Vehicle will not wait beyond scheduled departure. No refund for late-arriving passengers.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: Booking summary */}
          <div className="lg:col-span-1">
            <div
              className="sticky top-24 rounded-xl p-3 border border-white/50 shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Booking Summary</h3>
              <div className="space-y-1.5 text-sm font-medium text-slate-700">
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
                  {pickup || tour.pickup_location} → {dropoff || tour.dropoff_location}
                </p>
                <p className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3 w-3 text-blue-600 shrink-0" />
                  {date || tour.travel_date}
                </p>
                {selectedBoardingPoint && (
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
                    Boarding: {selectedBoardingPoint.name} ({selectedBoardingPoint.boarding_time || '07:00'})
                  </p>
                )}
                <p className="flex items-center gap-2 text-sm">
                  <Users className="h-3 w-3 text-blue-600 shrink-0" />
                  Seats: {selectedSeats.length ? `${selectedSeats.length} selected` : 'None selected'}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
                <div className="flex justify-between font-semibold text-slate-800 mt-1.5 text-lg">
                  <span>Total</span>
                  <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <Button
                onClick={() => {
                  if (selectedSeats.length === 0) {
                    toast.error('Please select at least one seat');
                    return;
                  }
                  if (boardingPoints.length > 0 && !selectedBoardingPoint) {
                    toast.error('Please select a boarding point');
                    setBoardingPanelOpen(true);
                    return;
                  }
                  sessionStorage.setItem('groupTourSeatSelection', JSON.stringify({
                    tourId,
                    selectedSeats,
                    seatPrices: selectedSeats.reduce((acc, sid) => {
                      acc[sid] = seats[sid]?.price ?? basePrice;
                      return acc;
                    }, {} as Record<string, number>),
                    boarding_point_id: selectedBoardingPoint?.id && selectedBoardingPoint.id > 0 ? selectedBoardingPoint.id : 0,
                    pickup: pickup || tour.pickup_location,
                    dropoff: dropoff || tour.dropoff_location,
                    date: date || tour.travel_date,
                  }));
                  navigate(`/group-tours/passenger-details/${tourId}?pickup=${encodeURIComponent(pickup)}&dropoff=${encodeURIComponent(dropoff)}&date=${date}`);
                }}
                disabled={selectedSeats.length === 0 || (boardingPoints.length > 0 && !selectedBoardingPoint)}
                className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3.5 rounded-lg text-sm font-semibold"
              >
                Continue to Passenger Details
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
      <Footer />
    </>
  );
}
