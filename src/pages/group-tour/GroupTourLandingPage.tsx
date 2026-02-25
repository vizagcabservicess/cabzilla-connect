import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, MapPin, Search, ChevronDown, ChevronUp, Bus, Users, Calendar, Shield } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { groupTourAPI, type RouteOption } from '@/services/api/groupTourAPI';
import { PopularGroupTours } from '@/components/PopularGroupTours';
import { format } from 'date-fns';

export default function GroupTourLandingPage() {
  const navigate = useNavigate();
  const [policyOpen, setPolicyOpen] = useState(false);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState('');
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState(false);
  const [pickupDropdownOpen, setPickupDropdownOpen] = useState(false);
  const [dropoffDropdownOpen, setDropoffDropdownOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  useEffect(() => {
    groupTourAPI.getRoutes().then(setRoutes).catch(() => setRoutes([]));
  }, []);

  const sortedRoutes = [...routes].sort((a, b) => {
    const d1 = a.first_date ?? '';
    const d2 = b.first_date ?? '';
    return d1.localeCompare(d2);
  });

  useEffect(() => {
    if (!pickup.trim() || !dropoff.trim()) {
      setAvailableDates(new Set());
      return;
    }
    setDatesLoading(true);
    groupTourAPI
      .getAvailableDates(pickup.trim(), dropoff.trim())
      .then((d) => setAvailableDates(new Set(d)))
      .catch(() => setAvailableDates(new Set()))
      .finally(() => setDatesLoading(false));
  }, [pickup, dropoff]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickup.trim() || !dropoff.trim() || !date) return;
    const params = new URLSearchParams({
      pickup: pickup.trim(),
      dropoff: dropoff.trim(),
      date,
    });
    navigate(`/group-tours/search?${params}`);
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const setRoute = (route: RouteOption) => {
    setPickup(route.pickup_location);
    setDropoff(route.dropoff_location);
    setPickupDropdownOpen(false);
    setDropoffDropdownOpen(false);
    setDate(route.first_date || '');
  };

  useEffect(() => {
    if (availableDates.size === 0) return;
    if (date && availableDates.has(date)) return;
    const first = [...availableDates].sort()[0];
    if (first) setDate(first);
  }, [availableDates, date]);

  const routeDropdown = (open: boolean, forPickup: boolean) =>
    open && sortedRoutes.length > 0 ? (
      <div
        className="absolute left-0 right-0 top-full mt-0.5 z-50 max-h-44 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg py-0.5"
        onMouseDown={(e) => e.preventDefault()}
      >
        {sortedRoutes.map((r, i) => (
          <button
            key={i}
            type="button"
            className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-2"
            onClick={() => setRoute(r)}
          >
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            {r.label}
          </button>
        ))}
      </div>
    ) : null;

  const heroBg = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';

  return (
    <>
      <Helmet>
        <title>Discover Vizag with Group Tours | Vizag Taxi Hub</title>
        <meta name="description" content="Explore popular destinations near Vizag at affordable prices. Save up to 60% on shared travel! Book group tours to Araku, Lambasingi and more." />
        <meta name="keywords" content="vizag group tours, affordable group tours vizag, shared travel vizag, group tour packages, vizag taxi hub group tours, popular group tours, best-selling group tours, vizag to araku group tour, vizag taxi" />
        <meta name="author" content="Vizag Taxi Hub" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/group-tours" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/group-tours" />
        <meta property="og:title" content="Discover Vizag with Group Tours | Vizag Taxi Hub" />
        <meta property="og:description" content="Explore popular destinations near Vizag at affordable prices. Save up to 60% on shared travel!" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Discover Vizag with Group Tours | Vizag Taxi Hub" />
        <meta name="twitter:description" content="Explore popular destinations near Vizag at affordable prices. Save up to 60% on shared travel!" />
        <meta name="twitter:image" content="/og-image.png" />
      </Helmet>
      <Navbar />
      <div className="min-h-screen bg-slate-50">
        {/* Hero Section with scenic background */}
        <section className="relative min-h-[480px] flex items-center overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-800/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />

          <div className="relative z-10 container mx-auto px-4 pt-24 pb-12">
            <div className="max-w-xl mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight">
                Discover Vizag with Group Tours
              </h1>
              <p className="text-white/90 text-sm sm:text-base mb-0.5">
                Explore popular destinations near Vizag at affordable prices.
              </p>
              <p className="text-white/80 text-xs sm:text-sm font-medium">
                Save up to 60% on shared travel!
              </p>
            </div>

            {/* Search form - white card overlay, single row */}
            <div className="max-w-4xl bg-white rounded-2xl shadow-xl p-4 sm:p-5 border border-white/20">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
                <div className="relative flex-1 min-w-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                    <Input
                      placeholder="Pickup location"
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      onFocus={() => { setPickupDropdownOpen(true); setDropoffDropdownOpen(false); }}
                      onBlur={() => setTimeout(() => setPickupDropdownOpen(false), 150)}
                      className="pl-8 h-9 rounded-lg border-slate-200 text-xs pr-7"
                      autoComplete="off"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    {routeDropdown(pickupDropdownOpen, true)}
                  </div>
                </div>
                <div className="relative flex-1 min-w-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
                  <div className="relative">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                    <Input
                      placeholder="Destination location"
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      onFocus={() => { setDropoffDropdownOpen(true); setPickupDropdownOpen(false); }}
                      onBlur={() => setTimeout(() => setDropoffDropdownOpen(false), 150)}
                      className="pl-8 h-9 rounded-lg border-slate-200 text-xs pr-7"
                      autoComplete="off"
                    />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                    {routeDropdown(dropoffDropdownOpen, false)}
                  </div>
                </div>
                <div className="relative flex-1 min-w-0">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pickup Date</label>
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full h-9 justify-start text-left font-normal pl-8 text-xs rounded-lg border-slate-200 relative min-w-0"
                        disabled={datesLoading}
                      >
                        <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate pr-6">{date ? format(new Date(date + 'T12:00:00'), 'dd MMM') : 'Select date'}</span>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={date ? new Date(date + 'T12:00:00') : undefined}
                        onSelect={(d) => {
                          if (d) {
                            setDate(d.toISOString().slice(0, 10));
                            setDatePopoverOpen(false);
                          }
                        }}
                        disabled={(d) => {
                          const ds = d.toISOString().slice(0, 10);
                          if (ds < todayStr) return true;
                          if (pickup.trim() && dropoff.trim()) {
                            if (datesLoading || availableDates.size === 0) return true;
                            return !availableDates.has(ds);
                          }
                          return false;
                        }}
                        fromDate={new Date(todayStr)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button
                  type="submit"
                  disabled={!pickup.trim() || !dropoff.trim() || !date}
                  className="h-9 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="mr-2 h-3.5 w-3.5" />
                  Search Group Tours
                </Button>
              </form>
            </div>
          </div>
        </section>

        {/* Popular Group Tours */}
        <div className="border-t border-slate-100 bg-white pt-8 sm:pt-12">
          <PopularGroupTours />
        </div>

        {/* VEHICLE & BOOKING POLICY */}
        <section className="py-12 sm:py-16 bg-white border-t border-slate-100">
          <div className="container mx-auto px-4 max-w-3xl">
            <button
              type="button"
              onClick={() => setPolicyOpen(!policyOpen)}
              className="w-full flex items-center justify-between text-left py-3 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <span className="font-bold text-slate-900 text-lg">VEHICLE & BOOKING POLICY</span>
              {policyOpen ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
            </button>
            {policyOpen && (
              <div className="mt-2 p-4 sm:p-6 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4 text-sm text-slate-700">
                <p>
                  To provide you with the most reliable and affordable travel, we assign vehicles based on the total number of confirmed passengers for each trip:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li><strong>10–17 Passengers:</strong> 17-Seater Tempo Traveller.</li>
                  <li><strong>7 Passengers:</strong> Innova Crysta.</li>
                  <li><strong>5–6 Passengers:</strong> Ertiga.</li>
                  <li><strong>1–4 Passengers:</strong> Comfortable Sedan.</li>
                </ul>
                <div className="pt-2 border-t border-slate-200">
                  <p className="font-semibold text-slate-800 mb-2">Important Notes for Shared Tours</p>
                  <ul className="space-y-1.5">
                    <li><strong>Minimum Requirement:</strong> Trips require a minimum of 4 total bookings to proceed at the shared seat rate.</li>
                    <li><strong>Notification:</strong> If a trip has fewer than 4 bookings 24 hours before departure, we will contact you via WhatsApp or phone.</li>
                    <li><strong>Your Flexibility:</strong> In the event of low bookings, you can choose between a full refund, rescheduling to a later date, or upgrading to a private tour.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-12 sm:py-16 bg-slate-50 border-t border-slate-100">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Bus className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Comfortable Tempo Traveller</p>
                  <p className="text-slate-500 text-xs">Spacious AC vehicles for group travel</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Experienced Tour Guides</p>
                  <p className="text-slate-500 text-xs">Local experts for memorable trips</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Easy Online Booking</p>
                  <p className="text-slate-500 text-xs">Book seats in minutes, pay online</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Safe & Affordable Travel</p>
                  <p className="text-slate-500 text-xs">Secure payment, trusted operators</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
