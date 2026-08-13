import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  Phone,
  Clock,
  MapPin,
  Shield,
  CheckCircle,
  Car,
  Users,
  Headphones,
  ArrowRight,
  ChevronRight,
  Route,
  MapPinned,
  CarFront,
  Bus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AirportHeroWidget } from '@/components/AirportHeroWidget';
import { ServiceLinks } from '@/components/ServiceLinks';
import { ServiceEmbedShell } from '@/components/service/ServiceEmbedShell';
import { loadCabTypes } from '@/lib/cabData';
import type { CabType } from '@/types/cab';
import { getVehicleImageUrlForDisplay } from '@/utils/vehicleUrlUtils';

const WHATSAPP_URL =
  'https://wa.me/919966363662?text=' +
  encodeURIComponent('Hi! I need help booking an airport cab in Vizag.');

/** Default starting fares from Alluri Sitarama Raju International Airport (marketing). */
const DEFAULT_AIRPORT_STARTING_RIDES = [
  {
    ids: ['sedan'],
    nameIncludes: ['swift', 'dzire'],
    label: 'Swift Dzire',
    capacity: 4,
    priceFrom: 2250,
    fallbackImage: '/cars/sedan.png',
  },
  {
    ids: ['ertiga'],
    nameIncludes: ['ertiga'],
    label: 'Ertiga',
    capacity: 6,
    priceFrom: 3750,
    fallbackImage: '/cars/ertiga.png',
  },
  {
    ids: ['glanza', 'toyota_glanza'],
    nameIncludes: ['glanza'],
    label: 'Toyota Glanza',
    capacity: 4,
    priceFrom: 2250,
    fallbackImage: '/uploads/toyota-glanza-vizagtaxihub.png',
  },
  {
    ids: ['innova_crysta'],
    nameIncludes: ['crysta'],
    label: 'Innova Crysta',
    capacity: 7,
    priceFrom: 4250,
    fallbackImage: '/cars/innova.png',
  },
  {
    ids: ['tempo_traveller'],
    nameIncludes: ['tempo traveller', 'tempo'],
    label: 'Tempo Traveller',
    capacity: 17,
    priceFrom: 7800,
    fallbackImage: '/cars/tempo.png',
  },
  {
    ids: ['amaze', 'aura'],
    nameIncludes: ['amaze', 'aura'],
    label: 'Hyundai Aura',
    capacity: 4,
    priceFrom: 2250,
    fallbackImage: '/uploads/taxi-services--visakhapatnam-amaze.png',
  },
  {
    ids: ['bus', 'urbania'],
    nameIncludes: ['urbania'],
    label: 'Urbania',
    capacity: 16,
    priceFrom: 7800,
    fallbackImage: '/cars/tempo.png',
  },
] as const;

type AirportRideOption = {
  id: string;
  label: string;
  image: string;
  capacity: number;
  priceFrom: number;
};

function normalizeKey(value?: string): string {
  return (value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function findCatalogVehicle(
  vehicles: CabType[],
  ride: (typeof DEFAULT_AIRPORT_STARTING_RIDES)[number],
): CabType | undefined {
  const byId = vehicles.find((vehicle) => {
    if (vehicle.isActive === false) return false;
    const keys = [vehicle.id, vehicle.vehicleId].map(normalizeKey).filter(Boolean);
    return ride.ids.some((id) => keys.includes(normalizeKey(id)));
  });
  if (byId) return byId;

  return vehicles.find((vehicle) => {
    if (vehicle.isActive === false) return false;
    const name = (vehicle.name || '').toLowerCase();
    return ride.nameIncludes.some((token) => name.includes(token));
  });
}

function buildAirportRideOptions(vehicles: CabType[]): AirportRideOption[] {
  return DEFAULT_AIRPORT_STARTING_RIDES.map((ride) => {
    const vehicle = findCatalogVehicle(vehicles, ride);
    const id = vehicle?.id || vehicle?.vehicleId || ride.ids[0];
    return {
      id,
      label: `${ride.label} (${ride.capacity}+1)`,
      image: vehicle ? getVehicleImageUrlForDisplay(vehicle) : ride.fallbackImage,
      capacity: ride.capacity,
      priceFrom: ride.priceFrom,
    };
  }).sort((a, b) => a.priceFrom - b.priceFrom);
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function AirportTaxiPage() {
  const [rideOptions, setRideOptions] = useState<AirportRideOption[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRidesLoading(true);
      try {
        const vehicles = await loadCabTypes(false, true);
        if (!cancelled) setRideOptions(buildAirportRideOptions(vehicles));
      } catch (error) {
        console.error('Failed to load airport ride options:', error);
        if (!cancelled) setRideOptions(buildAirportRideOptions([]));
      } finally {
        if (!cancelled) setRidesLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const features = [
    {
      icon: <Plane className="w-5 h-5" />,
      title: 'Flight Tracking',
      description: 'We monitor delays and early arrivals',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: 'Punctual Service',
      description: 'On-time pickup and drop for every flight',
    },
    {
      icon: <MapPin className="w-5 h-5" />,
      title: 'Meet & Greet',
      description: 'Name board assistance and luggage help',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Safe Transfer',
      description: 'Licensed drivers with GPS tracking',
    },
  ];

  const popularRoutes = [
    { to: 'Railway Station', distance: '12 km' },
    { to: 'Beach Road', distance: '15 km' },
    { to: 'Rushikonda', distance: '25 km' },
    { to: 'Kailasagiri', distance: '18 km' },
    { to: 'MVP Colony', distance: '14 km' },
    { to: 'Gajuwaka', distance: '22 km' },
  ];

  const otherServices = [
    { name: 'Local Taxi', description: 'City rides & packages', href: '/local-taxi', Icon: Car },
    { name: 'Outstation Taxi', description: 'Inter-city travel', href: '/outstation-taxi', Icon: Route },
    { name: 'Tour Packages', description: 'Sightseeing packages', href: '/tours', Icon: MapPinned },
    { name: 'Group Tours', description: 'Shared tours – save more', href: '/group-tours', Icon: Users },
    { name: 'Shared Carpooling', description: 'Daily office commute', href: '/shared-carpooling', Icon: CarFront },
    { name: 'Tempo Traveller Rental', description: 'Group travel solutions', href: '/tempo-traveller-rental-vizag', Icon: Bus },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Vizag Taxi Hub — Cabs in Visakhapatnam Airport',
    description:
      'Book cabs in Visakhapatnam Airport at fixed rates. 24/7 airport pickup and drop with flight tracking and professional drivers.',
    url: 'https://vizagtaxihub.com/airport-taxi',
    telephone: '+91-9966363662',
    areaServed: { '@type': 'City', name: 'Visakhapatnam' },
  };

  const mobileBelowFold = (
    <>
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Why travelers choose us</h2>
          <p className="mb-5 text-sm leading-relaxed text-gray-600 sm:text-base">
            Fixed-rate airport pickup and drop with flight tracking, meet & greet, and on-time service.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-3 rounded-lg bg-sky-50/80 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-0.5 text-xs text-gray-600">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900">Choose Your Ride</h2>
          <p className="mb-4 text-xs text-gray-500">
            Starting fares from Alluri Sitarama Raju International Airport
          </p>
          {ridesLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {rideOptions.slice(0, 3).map((v) => (
                <div key={v.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">{v.label}</h3>
                    <Car className="h-5 w-5 shrink-0 text-sky-500" />
                  </div>
                  <p className="text-lg font-bold text-sky-600">{formatInr(v.priceFrom)} onwards</p>
                  <p className="mt-0.5 text-xs text-gray-500">from Airport</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Popular Airport Routes</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {popularRoutes.slice(0, 4).map((r) => (
              <div
                key={r.to}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">Airport → {r.to}</p>
                  <p className="text-xs text-gray-500">{r.distance}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base font-bold text-gray-900">Book Airport Cab</h2>
          <p className="mb-4 text-sm text-gray-600">Fixed rates · Flight tracking · 24/7 pickup & drop</p>
          <ul className="mb-4 space-y-2 text-sm text-gray-700">
            {['Airport pickup & drop', 'Meet & greet', 'Professional driver'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-sky-500" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            className="w-full bg-sky-500 text-white hover:bg-sky-600"
            onClick={() => window.open('tel:+919966363662')}
          >
            <Phone className="mr-2 h-4 w-4" />
            Call +91 9966363662
          </Button>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <ServiceLinks currentService="/airport-taxi" title="Other Services" variant="sidebar" />
        </div>
      </aside>
    </>
  );

  const desktopBelowFold = (
    <div className="hidden space-y-8 lg:block">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 xl:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
            <Headphones className="h-5 w-5" aria-hidden />
          </span>
          <p className="text-sm text-slate-700 xl:text-base">
            <span className="font-semibold text-slate-900">Need help with your booking?</span>{' '}
            Our team is ready to assist you anytime.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            className="rounded-full border-slate-200 bg-white hover:bg-white"
            onClick={() => window.open(WHATSAPP_URL, '_blank')}
          >
            Chat on WhatsApp
          </Button>
          <Button
            variant="outline"
            className="rounded-full border-slate-200 bg-white text-[var(--brand-primary)] hover:bg-white"
            onClick={() => window.open('tel:+919966363662')}
          >
            <Phone className="mr-2 h-4 w-4" />
            Call +91 9966363662
          </Button>
        </div>
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 xl:text-3xl">Why travelers choose us</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 xl:text-base">
          Fixed-rate airport pickup and drop with flight tracking, meet & greet, and on-time service.
        </p>
        <div className="mt-6 grid grid-cols-4 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 text-left shadow-[var(--home-card-shadow)]"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
              <p className="mt-1 text-sm leading-snug text-slate-600">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-2xl font-bold text-slate-900">Choose Your Ride</h2>
        <p className="mb-5 text-sm text-slate-500">
          Starting fares from Alluri Sitarama Raju International Airport
        </p>
        {ridesLoading ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : rideOptions.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-sm text-slate-600">
            Airport fares are loading from our pricing system. Use Search Cabs above for live rates.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {rideOptions.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-[var(--home-card-border)] bg-white p-4 shadow-[var(--home-card-shadow)]"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{v.label}</h3>
                  <Car className="h-5 w-5 shrink-0 text-[var(--brand-primary)]" aria-hidden />
                </div>
                <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-50 px-2">
                  <img
                    src={v.image}
                    alt={v.label}
                    className="max-h-24 w-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className="text-xl font-bold text-[var(--brand-primary)]">
                  {formatInr(v.priceFrom)} onwards
                </p>
                <p className="mt-0.5 text-xs text-slate-500">from Airport</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5 xl:gap-6">
        <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Popular Airport Routes</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {popularRoutes.map((r) => (
              <div
                key={r.to}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
              >
                <p className="text-sm font-semibold text-slate-900">Airport → {r.to}</p>
                <p className="mt-0.5 text-xs text-slate-500">{r.distance}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              to="/tempo-traveller-rental-vizag"
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 hover:border-blue-200"
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">Tempo Traveller</span>
                <span className="mt-0.5 block text-xs text-slate-600">Group airport transfers</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <Link
              to="/local-taxi"
              className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 hover:border-blue-200"
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">Local City Cabs</span>
                <span className="mt-0.5 block text-xs text-slate-600">Hourly packages in Vizag</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Other Services</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {otherServices.map(({ name, description, href, Icon }) => (
              <Link
                key={href}
                to={href}
                className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 hover:border-blue-200 hover:bg-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{name}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              to="/fleet"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
            >
              View All Services
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B3A7A] via-[var(--brand-primary-dark)] to-[var(--brand-primary)] px-6 py-7 text-white shadow-lg xl:px-8">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold">
              VTH
            </span>
            <p className="max-w-xl text-base font-semibold leading-snug xl:text-lg">
              Landing late or with a large group? Tell us your flight details — we&apos;ll handle the rest.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-full bg-white px-5 text-[var(--brand-primary-dark)] hover:bg-blue-50"
          >
            <Link to="/contact">
              Get a Quote
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );

  return (
    <ServiceEmbedShell
      slug="airport"
      layout="marketing"
      helmetExtra={<script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
      hero={({
        onStepChange,
        onTripEditOpenChange,
        summaryBackHref,
        embedStretchToShell,
        embedDesktopCardLayout,
        embedDesktopCardTitle,
      }) => (
        <AirportHeroWidget
          onStepChange={onStepChange}
          onTripEditOpenChange={onTripEditOpenChange}
          summaryBackHref={summaryBackHref}
          embedStretchToShell={embedStretchToShell}
          embedDesktopCardLayout={embedDesktopCardLayout}
          embedDesktopCardTitle={embedDesktopCardTitle}
        />
      )}
      belowFold={
        <>
          <div className="grid grid-cols-1 gap-5 lg:hidden">{mobileBelowFold}</div>
          {desktopBelowFold}
        </>
      }
    />
  );
}

export default AirportTaxiPage;
