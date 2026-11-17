import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Car,
  Users,
  Phone,
  Star,
  CheckCircle,
  MapPin,
  Clock,
  Shield,
  Heart,
  Building,
  Bus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Play,
  ArrowRight,
  MessageCircle,
  Luggage,
  Snowflake,
  Fuel,
  Tv,
  Speaker,
  Zap,
  Headphones,
  X,
} from 'lucide-react';
import { tourAPI } from '@/services/api/tourAPI';
import { fareAPI } from '@/services/api/fareAPI';
import { TourInfo } from '@/types/cab';
import { VehiclePricing } from '@/types/api';
import { Breadcrumb } from '@/components/Breadcrumb';
import { trackContactCta } from '@/utils/trackContactCta';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

interface TempoTravellerPageProps {
  pageType: string;
  title: string;
  description: string;
  keywords: string;
  url: string;
  color: string;
  icon: React.ReactNode;
  /** Search-aligned H1; defaults to "Perfect Group Travel with {title}". */
  headline?: string;
  /** Hero intro under H1; defaults to tempo traveller group-travel copy. */
  subtitle?: string;
}

type FareTab = 'local' | 'outstation' | 'airport';

const URBANIA_SLIDES = [
  {
    src: 'https://vizagtaxihub.com/uploads/urbania-illustrator-vth.png',
    alt: 'Force Urbania van in Visakhapatnam',
  },
  {
    src: 'https://vizagtaxihub.com/uploads/og-image-urbania.jpg',
    alt: 'Force Urbania group van for hire in Vizag',
  },
];

const SLIDER_IMAGES = [
  {
    src: 'https://vizagtaxihub.com/uploads/tempo-png.png',
    alt: 'AC Tempo Traveller exterior in Visakhapatnam',
  },
  {
    src: 'https://vizagtaxihub.com/uploads/tempo-traveller-seats.jpg',
    alt: 'Push-back AC seats inside Tempo Traveller',
  },
  {
    src: 'https://vizagtaxihub.com/uploads/tempo-traveller-amenities.jpg',
    alt: 'Tempo Traveller cabin and travel amenities',
  },
];

const INCLUDED = [
  'AC tempo traveller with a professional driver',
  'Pickup and drop inside Visakhapatnam',
  'Live trip support on call and WhatsApp',
  'Package or per-km fare shared before you confirm',
];

const EXCLUDED = [
  'Toll, parking, and state entry tax — paid on actuals',
  'Driver night halt when the trip stays overnight',
  'Kilometres or hours beyond the booked package',
  'Sightseeing tickets and hotel stays',
];

const FAQS = [
  {
    q: 'How many people can travel in one tempo?',
    a: 'A 12-seater suits families and small groups. 17 and 18 seaters suit weddings, office teams, and pilgrimage groups. Tell us the headcount and luggage, and we will match the coach.',
  },
  {
    q: 'Is the fare per kilometre or a fixed package?',
    a: 'City trips use 4-hour and 8-hour packages. Outstation trips are charged per kilometre with a daily minimum. Airport drops are a one-way fare. Extra kilometres and extra hours are listed on the rate card.',
  },
  {
    q: 'What is charged extra?',
    a: 'Toll, parking, and permits are extra. An overnight trip adds a driver night halt. Anything beyond the booked hours or kilometres is billed at the extra-hour and extra-km rate.',
  },
  {
    q: 'Can I book for a wedding, office, or temple trip?',
    a: 'Yes. The same AC tempo fleet covers guest pickups, staff shuttles, and temple circuits. Share the date, pickup points, and return time for a fixed quote.',
  },
];

const GLASS =
  'border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl';

function capacityLabel(pageType: string): string {
  if (pageType === '12-seater') return '12 seats';
  if (pageType === '18-seater-tempo-traveller') return '18 seats';
  if (pageType === 'rental') return '12, 17 & 18 seats';
  if (pageType === 'urbania') return '16 seats';
  if (pageType === 'mini-bus' || pageType === 'vizag-araku-bus') return 'Mini bus';
  return 'Group seating';
}

const AIRPORT_FARE = {
  label: 'One-way airport drop',
  price: '₹7,500 onwards',
};

function flattenVehiclePricing(vehicle: VehiclePricing | undefined): VehiclePricing | undefined {
  if (!vehicle) return undefined;
  const nested = (
    vehicle as VehiclePricing & {
      pricing?: {
        local?: Partial<VehiclePricing>;
        outstation?: Partial<VehiclePricing>;
        airport?: Partial<VehiclePricing>;
      };
    }
  ).pricing;
  if (!nested) return vehicle;
  return {
    ...vehicle,
    ...nested.airport,
    ...nested.outstation,
    ...nested.local,
  };
}

function inr(value: number | string | undefined, fallback: string): string {
  if (value === undefined || value === null || value === '') return fallback;
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return amount.toLocaleString('en-IN');
}

const TempoTravellerPage: React.FC<TempoTravellerPageProps> = ({
  pageType,
  title,
  description,
  keywords,
  url,
  headline,
  subtitle,
}) => {
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [vehiclePricing, setVehiclePricing] = useState<VehiclePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [fareTab, setFareTab] = useState<FareTab>('outstation');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [videoPlayer, setVideoPlayer] = useState<'mobile' | 'desktop' | null>(null);
  const isUrbania = pageType === 'urbania';
  const slides = isUrbania ? URBANIA_SLIDES : SLIDER_IMAGES;
  const bookPath = isUrbania ? '/vehicle/urbania' : '/vehicle/tempo-traveller';

  const videoTitles: Record<string, string> = {
    wrgfamvCkns: 'Luxury Tempo Traveller Experience',
    ROa7qu67ECA: 'Thailand Team 5-Star Service',
    QUUuoF04zfk: 'Professional Tempo Service Review',
  };

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tourData, pricingData] = await Promise.all([
          tourAPI.getAvailableTours(),
          fareAPI.getVehiclePricing(),
        ]);
        if (!cancelled) {
          setTours(tourData);
          setVehiclePricing(pricingData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (!cancelled) setError('Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const previousSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const openWhatsApp = (name: string) => {
    trackContactCta('whatsapp', { name });
    window.open(
      'https://wa.me/919966363662?text=' + encodeURIComponent(`Hi! I want to book ${title}`),
      '_blank',
    );
  };

  const callNow = (name: string) => {
    trackContactCta('phone', { name });
    window.open('tel:+919966363662', '_self');
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `Vizag Taxi Hub - ${title}`,
    description,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram',
      addressLocality: 'Visakhapatnam',
      addressRegion: 'Andhra Pradesh',
      postalCode: '530024',
      addressCountry: 'IN',
    },
    telephone: '+91-9966363662',
    openingHours: 'Mo-Su 00:00-23:59',
    paymentAccepted: 'Cash, Credit Card, UPI, Net Banking',
    areaServed: {
      '@type': 'City',
      name: 'Visakhapatnam',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${title} Services`,
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: title,
            description,
          },
          price: '35',
          priceCurrency: 'INR',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: '35',
            priceCurrency: 'INR',
            unitText: 'per kilometer',
          },
        },
      ],
    },
  };

  const getTourType = (tourName: string): string => {
    const name = tourName.toLowerCase();
    if (name.includes('araku') || name.includes('lambasingi') || name.includes('vanajangi')) return 'HILL STATION';
    if (name.includes('borra') || name.includes('cave')) return 'ADVENTURE';
    if (name.includes('temple') || name.includes('simhachalam') || name.includes('annavaram') || name.includes('arasavalli')) return 'PILGRIMAGE';
    if (name.includes('beach') || name.includes('rushikonda')) return 'BEACH';
    return 'TOUR';
  };

  const getTempoTravellerPricing = () => {
    const tempoTraveller = vehiclePricing.find((vehicle) => {
      const vehicleId = vehicle.vehicleId?.toLowerCase() || '';
      const vehicleType = vehicle.vehicleType?.toLowerCase() || '';
      if (isUrbania) {
        return vehicleId.includes('urbania') || vehicleId === 'bus' || vehicleType.includes('urbania');
      }
      return (
        vehicleId.includes('tempo') ||
        vehicleId.includes('traveller') ||
        vehicleType.includes('tempo') ||
        vehicleType.includes('traveller') ||
        vehicleId === 'tempo_traveller' ||
        vehicleId === 'tempo-traveller'
      );
    });

    const match = tempoTraveller || (!isUrbania && vehiclePricing.length > 0 ? vehiclePricing[0] : undefined);
    return flattenVehiclePricing(match);
  };

  const getTempoTravellerPrice = (tour: TourInfo): string => {
    if (tour.pricing) {
      const tempoPrice = isUrbania
        ? tour.pricing['urbania'] ||
          tour.pricing['force_urbania'] ||
          tour.pricing['force-urbania'] ||
          tour.pricing['bus']
        : tour.pricing['tempo_traveller'] ||
          tour.pricing['tempo-traveller'] ||
          Object.values(tour.pricing)[0];
      if (tempoPrice) {
        return `₹${Number(tempoPrice).toLocaleString('en-IN')}`;
      }
    }
    const estimatedPrice = tour.distance * (isUrbania ? 40 : 35);
    return `₹${estimatedPrice.toLocaleString('en-IN')}`;
  };

  const tempoPricing = getTempoTravellerPricing();
  const perKm = inr(tempoPricing?.pricePerKm, isUrbania ? '40' : '35');
  const local8 = inr(tempoPricing?.price8hrs80km, isUrbania ? '8,000' : '7,500');
  const local10Amount = Number(tempoPricing?.price10hrs100km);
  const local10 =
    Number.isFinite(local10Amount) && local10Amount > 0
      ? local10Amount.toLocaleString('en-IN')
      : '';
  const extraKm = inr(tempoPricing?.priceExtraKm, isUrbania ? '40' : '35');
  const extraHour = inr(tempoPricing?.priceExtraHour, isUrbania ? '900' : '750');
  const airportFare = isUrbania
    ? {
        label: 'One-way airport drop',
        price:
          tempoPricing?.airportBasePrice && tempoPricing.airportBasePrice > 0
            ? `₹${tempoPricing.airportBasePrice.toLocaleString('en-IN')} onwards`
            : 'On request',
      }
    : AIRPORT_FARE;
  const includedItems = isUrbania
    ? ['AC Force Urbania with a professional driver', ...INCLUDED.slice(1)]
    : INCLUDED;
  const faqs = isUrbania
    ? [
        {
          q: 'How many people can travel in one Urbania?',
          a: 'The Force Urbania seats 16 passengers, with room for luggage. Share the headcount and we will confirm the van.',
        },
        FAQS[1],
        FAQS[2],
        {
          q: 'Can I book an Urbania for a wedding, office, or temple trip?',
          a: 'Yes. The Urbania covers guest pickups, staff shuttles, and temple circuits. Share the date, pickup points, and return time for a fixed quote.',
        },
      ]
    : FAQS;
  const driverAllowance = tempoPricing?.driverAllowance
    ? `₹${tempoPricing.driverAllowance.toLocaleString('en-IN')}`
    : null;
  const nightHalt = tempoPricing?.nightHaltCharge
    ? `₹${tempoPricing.nightHaltCharge.toLocaleString('en-IN')}`
    : null;

  const specs = [
    { icon: Users, label: capacityLabel(pageType) },
    { icon: Snowflake, label: 'AC cabin' },
    { icon: Tv, label: 'TV' },
    { icon: Speaker, label: 'Sound system' },
    { icon: Luggage, label: 'Luggage space' },
  ];

  const heroFeatures = [
    { icon: Zap, title: 'Easy booking', description: 'Book online or send the trip on WhatsApp.' },
    { icon: Fuel, title: 'Clear fares', description: '8 hr, 10 hr, and per-km rates up front.' },
    { icon: Tv, title: 'TV & sound', description: 'AC coach with a screen and music.' },
    { icon: Headphones, title: '24/7 support', description: 'Call or WhatsApp any hour.' },
  ];

  const relatedLinks = [
    { to: '/tempo-traveller-rental-vizag', title: 'Tempo Traveller Rental', desc: '12, 17 & 18 seater vans in Vizag', icon: Car, bg: 'bg-blue-50 text-blue-600' },
    { to: '/17-seater-tempo-traveller-vizag', title: '17 Seater Tempo Traveller', desc: 'Popular choice for large group travel', icon: Users, bg: 'bg-emerald-50 text-emerald-600' },
    { to: '/12-seater-tempo-traveller-vizag', title: '12 Seater Tempo Traveller', desc: 'Ideal for medium families & groups', icon: Users, bg: 'bg-purple-50 text-purple-600' },
    { to: '/group-travel-tempo-traveller-vizag', title: 'Group Travel', desc: 'Customised group tour transport', icon: Users, bg: 'bg-orange-50 text-orange-600' },
    { to: '/corporate-tempo-traveller-vizag', title: 'Corporate Transport', desc: 'Staff shuttles & corporate events', icon: Building, bg: 'bg-indigo-50 text-indigo-600' },
    { to: '/wedding-tempo-traveller-vizag', title: 'Wedding Transport', desc: 'Guest pickups & venue transfers', icon: Heart, bg: 'bg-pink-50 text-pink-600' },
    { to: '/pilgrimage-tempo-traveller-vizag', title: 'Pilgrimage Tours', desc: 'Temple circuits & group darshan', icon: MapPin, bg: 'bg-amber-50 text-amber-600' },
    { to: '/mini-bus-travels-vizag', title: 'Mini Bus Travels', desc: 'AC mini bus rental services', icon: Bus, bg: 'bg-teal-50 text-teal-600' },
  ];

  const testimonialVideos = [
    { id: 'wrgfamvCkns', label: '@vizagtaxihub' },
    { id: 'ROa7qu67ECA', label: '@vizagtaxihub' },
    { id: 'QUUuoF04zfk', label: '@Vizag Taxi Hub' },
  ];

  const fareTabs: { id: FareTab; label: string }[] = [
    { id: 'outstation', label: 'Outstation' },
    { id: 'local', label: 'Local' },
    { id: 'airport', label: 'Airport' },
  ];

  return (
    <>
      <Helmet>
        <meta name="keywords" content={keywords} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />
        <meta property="twitter:url" content={url} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="relative min-h-screen overflow-x-clip bg-gradient-to-b from-[#d7e8ff] via-[#eef4fb] to-[#f7f9fc]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.35),transparent_58%),radial-gradient(ellipse_at_top_right,rgba(125,211,252,0.45),transparent_52%)]"
        />
        <div className="relative">
        <Navbar />

        <main id="main-content" className="mx-auto max-w-7xl px-3 pb-24 pt-3 sm:px-4 sm:pt-5 md:pb-28 lg:px-6">
          <Breadcrumb
            items={
              pageType === 'rental'
                ? [
                    { label: 'Fleet', href: '/fleet' },
                    { label: 'Tempo Traveller' },
                  ]
                : pageType === 'urbania'
                ? [
                    { label: 'Fleet', href: '/fleet' },
                    { label: 'Urbania' },
                  ]
                : [
                    { label: 'Fleet', href: '/fleet' },
                    { label: 'Tempo Traveller', href: '/tempo-traveller-rental-vizag' },
                    { label: title },
                  ]
            }
          />

          <section className="relative mb-4 overflow-hidden rounded-2xl border border-white/30 bg-gradient-to-br from-[#1e4fa8]/75 via-[#2563eb]/65 to-[#38bdf8]/55 shadow-[0_18px_50px_-24px_rgba(29,78,216,0.65)] backdrop-blur-xl">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="m-3 rounded-xl border border-white/25 bg-white/10 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md sm:m-4 sm:p-5">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
                  <Star className="h-3 w-3 fill-current" aria-hidden />
                  {isUrbania ? 'Force Urbania · Driver included' : 'AC tempo · Driver included'}
                </span>
                <h1 className="mt-2 text-lg font-bold leading-snug sm:text-xl">
                  {headline || title}
                </h1>
                <p className="mt-1 max-w-md text-xs leading-snug text-white/80 sm:text-sm">
                  {subtitle ||
                    'Book an AC tempo traveller with a professional driver. Fares are confirmed before you travel.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {specs.map((spec) => {
                    const Icon = spec.icon;
                    return (
                      <span
                        key={spec.label}
                        className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium"
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {spec.label}
                      </span>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-white/70">
                  Outstation from <span className="text-lg font-bold text-white">₹{perKm}</span>/km
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    asChild
                    className="h-9 rounded-full bg-white px-4 text-sm font-semibold text-[#0B3A7A] hover:bg-blue-50"
                  >
                    <Link to={bookPath}>
                      Book online
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button
                    className="h-9 rounded-full bg-emerald-500 px-4 text-sm font-semibold text-white hover:bg-emerald-600"
                    onClick={() => openWhatsApp('tempo_hero_whatsapp')}
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
                    WhatsApp
                  </Button>
                  <button
                    type="button"
                    onClick={() => callNow('tempo_hero_call')}
                    className="inline-flex items-center gap-1 px-1 text-xs font-semibold text-white"
                  >
                    <Phone className="h-3.5 w-3.5" aria-hidden />
                    9966363662
                  </button>
                </div>
              </div>

              <div className="relative min-h-[180px] overflow-hidden lg:min-h-[260px]">
                <div
                  className="flex h-full transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {slides.map((img, idx) => (
                    <div key={img.src} className="flex w-full min-w-full shrink-0 items-center justify-center">
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="h-44 w-full object-contain p-3 sm:h-52 lg:h-64"
                        loading={idx === 0 ? 'eager' : 'lazy'}
                        decoding="async"
                      />
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label="Previous vehicle photo"
                  onClick={previousSlide}
                  className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Next vehicle photo"
                  onClick={nextSlide}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {slides.map((img, idx) => (
                    <button
                      key={img.src}
                      type="button"
                      aria-label={`View photo ${idx + 1}`}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-1.5 rounded-full ${
                        currentSlide === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {heroFeatures.slice(0, 4).map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className={`rounded-xl px-3 py-3 ${GLASS}`}>
                  <Icon className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden />
                  <h2 className="mt-1.5 text-xs font-semibold text-slate-900 sm:text-sm">{feature.title}</h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">{feature.description}</p>
                </div>
              );
            })}
          </section>

          <section className="mb-5">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Fares</h2>
                <p className="mt-0.5 text-xs text-slate-500">Toll and parking are extra. Confirm before you travel.</p>
              </div>
              {error ? (
                <p className="text-xs font-medium text-amber-700">Standard rates. Call for a live quote.</p>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-xl border border-white/60 bg-white/35 p-1 backdrop-blur-md lg:hidden" role="tablist" aria-label="Fare type">
              {fareTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={fareTab === tab.id}
                  onClick={() => setFareTab(tab.id)}
                  className={`rounded-lg px-2 py-2 text-sm font-semibold ${
                    fareTab === tab.id
                      ? 'bg-white/80 text-[#0B1F3A] shadow-sm backdrop-blur'
                      : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="mt-3 flex items-center justify-center rounded-2xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl py-10">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--brand-primary)]" />
                <span className="ml-2 text-sm text-slate-600">Loading fares...</span>
              </div>
            ) : (
              <div className="mt-3 lg:hidden">
                {fareTab === 'local' ? (
                  <LocalHireCard local8={local8} local10={local10} extraKm={extraKm} extraHour={extraHour} />
                ) : null}
                {fareTab === 'outstation' ? (
                  <FarePackage
                    name="Outstation"
                    price={`₹${perKm}/km`}
                    detail="Minimum 300 km per day"
                    extras={
                      [
                        driverAllowance ? `Driver allowance ${driverAllowance}/day` : 'Driver allowance as per trip',
                        nightHalt ? `Night halt ${nightHalt}` : 'Night halt if the coach stays overnight',
                      ].join(' · ')
                    }
                  />
                ) : null}
                {fareTab === 'airport' ? (
                  <FarePackage
                    name={airportFare.label}
                    price={airportFare.price}
                    detail="Visakhapatnam city to the airport"
                    extras="One way · driver included · toll extra"
                  />
                ) : null}
                {fareTab !== 'local' && fareTab !== 'outstation' && fareTab !== 'airport' ? (
                  <UnreachableFareTab tab={fareTab} />
                ) : null}
              </div>
            )}

            {!loading ? (
              <div className="mt-3 hidden gap-3 lg:grid lg:grid-cols-3">
                <FarePackage
                  name="Outstation"
                  price={`₹${perKm}/km`}
                  detail="Minimum 300 km a day"
                  extras={driverAllowance ? `Driver allowance ${driverAllowance}` : 'Driver allowance extra'}
                />
                <LocalHireCard local8={local8} local10={local10} extraKm={extraKm} extraHour={extraHour} />
                <div className="rounded-xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl p-4">
                  <p className="text-xs font-semibold text-slate-500">Airport</p>
                  <p className="mt-2 text-lg font-bold text-[#0B1F3A]">{airportFare.price}</p>
                  <p className="mt-1 text-sm text-slate-700">City to airport, one way</p>
                  <p className="mt-3 text-xs text-slate-500">Driver included · toll extra</p>
                </div>
              </div>
            ) : null}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                asChild
                className="h-9 w-full rounded-full bg-[var(--brand-primary)] px-2 text-xs text-white hover:bg-[var(--brand-primary-dark)] sm:text-sm"
              >
                <Link to={bookPath} className="whitespace-nowrap">
                  {isUrbania ? 'Book this Urbania' : 'Book this tempo'}
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-9 w-full whitespace-nowrap rounded-full border-white/80 bg-white/50 px-2 text-xs backdrop-blur-md sm:text-sm"
                onClick={() => callNow('tempo_rates_call')}
              >
                <Phone className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Call for this route
              </Button>
            </div>
          </section>

          <section className="mb-8 overflow-hidden rounded-2xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-slate-100">
              <div className="p-4 sm:p-5">
                <h2 className="text-sm font-bold text-slate-900">Included</h2>
                <ul className="mt-3 space-y-2">
                  {includedItems.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-slate-100 p-4 sm:p-5 md:border-t-0">
                <h2 className="text-sm font-bold text-slate-900">Charged extra</h2>
                <ul className="mt-3 space-y-2">
                  {EXCLUDED.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ol className="grid grid-cols-1 gap-3 border-t border-slate-100 px-4 py-4 sm:grid-cols-3 sm:px-5">
              {[
                { step: '1', title: 'Share the trip', text: 'Date, pickup, and group size.' },
                { step: '2', title: 'Get the fare', text: 'We confirm the price before you pay.' },
                { step: '3', title: 'Travel', text: isUrbania ? 'The driver arrives with the AC Urbania.' : 'The driver arrives with the AC tempo.' },
              ].map((item) => (
                <li key={item.step} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-[var(--brand-primary)]">
                    {item.step}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                    <span className="block text-xs text-slate-500">{item.text}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-8">
            <div className="mb-3">
              <h2 className="text-base font-bold text-slate-900">{isUrbania ? 'Tours by Urbania' : 'Tours by tempo'}</h2>
              <p className="text-xs text-slate-500">
                {isUrbania
                  ? 'Sightseeing from Visakhapatnam. Price is the Urbania fare.'
                  : 'Sightseeing from Visakhapatnam. Price is the tempo fare.'}
              </p>
            </div>
            <div className="md:hidden">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--brand-primary)]" />
                  <span className="ml-2 text-sm text-slate-600">Loading tours...</span>
                </div>
              ) : error ? (
                <div className="py-8 text-center">
                  <p className="mb-3 text-sm text-red-600">Tour prices could not be loaded.</p>
                  <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                    Try again
                  </Button>
                </div>
              ) : tours.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-600">
                  No tours available at the moment. Call us for a custom route.
                </p>
              ) : (
                <Swiper spaceBetween={12} slidesPerView={1.12}>
                  {tours.map((tour) => (
                    <SwiperSlide key={tour.id}>
                      <TempoTourCard
                        tour={tour}
                        typeLabel={getTourType(tour.name)}
                        price={getTempoTravellerPrice(tour)}
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}
            </div>
            <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full flex items-center justify-center py-10">
                  <Loader2 className="h-7 w-7 animate-spin text-[var(--brand-primary)]" />
                  <span className="ml-2 text-sm text-slate-600">Loading tours...</span>
                </div>
              ) : error ? (
                <div className="col-span-full py-8 text-center">
                  <p className="mb-3 text-sm text-red-600">Tour prices could not be loaded.</p>
                  <Button onClick={() => window.location.reload()} variant="outline" size="sm">
                    Try again
                  </Button>
                </div>
              ) : tours.length === 0 ? (
                <div className="col-span-full py-8 text-center text-sm text-slate-600">
                  No tours available at the moment. Call us for a custom route.
                </div>
              ) : (
                tours.map((tour) => (
                  <TempoTourCard
                    key={tour.id}
                    tour={tour}
                    typeLabel={getTourType(tour.name)}
                    price={getTempoTravellerPrice(tour)}
                  />
                ))
              )}
            </div>
          </section>

          <section className="mb-10">
            <div className="mb-5 text-center">
              <h2 className="text-lg font-bold text-[#0B1F3A]">Traveller videos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Short reviews from groups who travelled with Vizag Taxi Hub.
              </p>
            </div>
            <div className="md:hidden">
              <Swiper
                spaceBetween={12}
                slidesPerView={1.15}
                onSlideChange={() => {
                  setPlayingVideoId(null);
                  setVideoPlayer(null);
                }}
              >
                {testimonialVideos.map((video) => (
                  <SwiperSlide key={video.id}>
                    <VideoStoryCard
                      videoId={video.id}
                      title={videoTitles[video.id] || 'Customer video'}
                      playing={videoPlayer === 'mobile' && playingVideoId === video.id}
                      onPlay={() => {
                        setVideoPlayer('mobile');
                        setPlayingVideoId(video.id);
                      }}
                      tall
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
            <div className="mx-auto hidden max-w-3xl items-end justify-center gap-4 md:flex">
              {testimonialVideos.map((video, index) => (
                <div key={video.id} className={index === 1 ? 'w-[34%]' : 'w-[28%]'}>
                  <VideoStoryCard
                    videoId={video.id}
                    title={videoTitles[video.id] || 'Customer video'}
                    playing={videoPlayer === 'desktop' && playingVideoId === video.id}
                    onPlay={() => {
                      setVideoPlayer('desktop');
                      setPlayingVideoId(video.id);
                    }}
                    tall={index === 1}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-xs font-semibold text-[var(--brand-primary)]"
                onClick={() => window.open('https://www.youtube.com/@vizagtaxihub', '_blank')}
              >
                More on YouTube
              </button>
            </div>
          </section>

          <section className="mb-10 rounded-2xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl px-5 py-2 shadow-sm sm:px-6">
            <h2 className="py-4 text-base font-bold text-slate-900 sm:text-lg">Questions before you book</h2>
            <Accordion type="single" collapsible>
              {faqs.map((faq) => (
                <AccordionItem key={faq.q} value={faq.q}>
                  <AccordionTrigger className="text-left text-sm font-semibold text-slate-900 hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-slate-600">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-base font-bold text-slate-900 sm:text-lg">
              {isUrbania ? 'Other group transport' : 'Other tempo services'}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {relatedLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl p-4 hover:border-blue-300"
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.bg}`}>
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-slate-600">{item.desc}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 rounded-2xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl px-3 py-3 sm:grid-cols-4">
            {[
              { icon: Shield, label: 'Verified drivers', detail: 'Highway chauffeurs' },
              { icon: Tv, label: 'TV & sound', detail: 'In every coach' },
              { icon: Clock, label: '8 hr & 10 hr', detail: 'Local packages' },
              { icon: Phone, label: '24/7 support', detail: '9966363662' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2 px-1">
                  <Icon className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900">{item.label}</span>
                    <span className="block text-[11px] text-slate-500">{item.detail}</span>
                  </span>
                </div>
              );
            })}
          </section>
        </main>

        <Footer />
        <MobileNavigation />
        </div>
      </div>
    </>
  );
};

function TempoTourCard({
  tour,
  typeLabel,
  price,
}: {
  tour: TourInfo;
  typeLabel: string;
  price: string;
}) {
  return (
    <Link
      to={getTourUrl(tour)}
      className="group relative block h-72 overflow-hidden rounded-2xl shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)]"
    >
      <img
        src={tour.image || `/tours/${tour.id}.jpg`}
        alt={tour.name}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop';
        }}
      />
      <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.72)_46%,transparent)] px-3 pb-3 pt-16 text-white">
        <span className="flex items-center gap-1 text-[11px] text-white/80">
          <MapPin className="h-3 w-3" aria-hidden />
          {typeLabel}
        </span>
        <span className="mt-1 flex items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-snug">{tour.name}</span>
            <span className="mt-0.5 block text-[11px] text-white/75">
              {tour.days} {tour.days === 1 ? 'day' : 'days'} · {tour.distance} km
            </span>
          </span>
          <span className="shrink-0 text-lg font-bold">{price}</span>
        </span>
      </span>
    </Link>
  );
}

function VideoStoryCard({
  videoId,
  title,
  playing,
  onPlay,
  tall,
}: {
  videoId: string;
  title: string;
  playing: boolean;
  onPlay: () => void;
  tall: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[1.4rem] shadow-[0_16px_40px_-24px_rgba(15,23,42,0.55)] ${
        tall ? 'h-80 md:h-[26rem]' : 'h-72 md:h-[22rem]'
      }`}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button type="button" className="absolute inset-0 text-left" onClick={onPlay} aria-label={`Play ${title}`}>
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
          <span className="absolute left-1/2 top-2.5 h-1.5 w-8 -translate-x-1/2 rounded-full bg-black/35" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/15">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-md">
              <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pb-3 pt-10 text-white">
            <span className="block text-xs font-semibold leading-snug sm:text-sm">{title}</span>
            <span className="mt-2 inline-flex rounded-full border border-white/50 px-2 py-0.5 text-[10px] font-semibold tracking-wide">
              Play
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

function LocalHireCard({
  local8,
  local10,
  extraKm,
  extraHour,
}: {
  local8: string;
  local10: string;
  extraKm: string;
  extraHour: string;
}) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl px-4 py-3">
      <p className="text-xs font-semibold text-slate-500">Local hire</p>
      <div className="mt-1 divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 py-1.5">
          <span className="text-sm text-slate-700">8 hr / 80 km</span>
          <span className="text-sm font-bold text-[#0B1F3A]">₹{local8}</span>
        </div>
        <div className="flex items-center justify-between gap-3 py-1.5">
          <span className="text-sm text-slate-700">10 hr / 100 km</span>
          <span className="text-sm font-bold text-[#0B1F3A]">{local10 ? `₹${local10}` : 'On request'}</span>
        </div>
      </div>
      <p className="pt-1 text-xs text-slate-500">
        Extra km ₹{extraKm} · extra hour ₹{extraHour}
      </p>
    </div>
  );
}

function FarePackage({
  name,
  price,
  detail,
  extras,
}: {
  name: string;
  price: string;
  detail: string;
  extras: string;
}) {
  return (
    <div className="rounded-xl border border-white/70 bg-white/50 shadow-[0_10px_32px_-18px_rgba(37,99,235,0.4)] backdrop-blur-xl p-4">
      <p className="text-xs font-semibold text-slate-500">{name}</p>
      <p className="mt-1 text-lg font-bold text-[#0B1F3A]">{price}</p>
      <p className="mt-1 text-sm text-slate-700">{detail}</p>
      <p className="mt-2 text-xs text-slate-500">{extras}</p>
    </div>
  );
}

function UnreachableFareTab({ tab }: { tab: never }): null {
  void tab;
  return null;
}

export default TempoTravellerPage;
