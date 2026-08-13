import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Phone,
  Clock,
  Shield,
  Star,
  Zap,
  CheckCircle,
  Car,
  MapPin,
  Headphones,
  ChevronRight,
  Plane,
  Route,
  MapPinned,
  Users,
  CarFront,
  Bus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocalHeroWidget } from '@/components/LocalHeroWidget';
import { ServiceLinks } from '@/components/ServiceLinks';
import { ServiceEmbedShell } from '@/components/service/ServiceEmbedShell';
import { loadCabTypes } from '@/lib/cabData';
import { fetchLocalFares, parseNumericValue, type FareData } from '@/services/fareManagementService';
import type { CabType, LocalFare } from '@/types/cab';
import { getVehicleImageUrlForDisplay } from '@/utils/vehicleUrlUtils';

const WHATSAPP_URL =
  'https://wa.me/919966363662?text=' +
  encodeURIComponent('Hi! I need help booking a local cab in Vizag.');

type LocalRideOption = {
  id: string;
  label: string;
  image: string;
  packagePrice: number;
  extraKm: number;
};

function pickLocal8hrPrice(source?: FareData | LocalFare | null): number {
  if (!source) return 0;
  const record = source as Record<string, unknown>;
  return parseNumericValue(
    record.price_8hrs_80km ??
      record.price8hrs80km ??
      record.package8hr80km ??
      record.local_package_8hr ??
      record.price_8hrs80km,
  );
}

function pickLocalExtraKm(source?: FareData | LocalFare | null): number {
  if (!source) return 0;
  const record = source as Record<string, unknown>;
  return parseNumericValue(
    record.price_extra_km ??
      record.priceExtraKm ??
      record.extraKmRate ??
      record.extra_km_charge ??
      record.extraKmCharge,
  );
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

function vehicleIdsMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function buildLocalRideOptions(vehicles: CabType[], fares: FareData[]): LocalRideOption[] {
  const options: LocalRideOption[] = [];

  for (const vehicle of vehicles) {
    if (vehicle.isActive === false) continue;

    const vehicleKeys = [vehicle.id, vehicle.vehicleId, vehicle.name].filter(Boolean) as string[];
    const matchedFare =
      fares.find((fare) =>
        vehicleKeys.some(
          (key) =>
            vehicleIdsMatch(key, fare.vehicleId) ||
            vehicleIdsMatch(key, fare.vehicle_id) ||
            vehicleIdsMatch(key, fare.vehicle_name) ||
            vehicleIdsMatch(key, fare.vehicleName),
        ),
      ) ?? null;

    const packagePrice =
      pickLocal8hrPrice(matchedFare) || pickLocal8hrPrice(vehicle.localPackageFares);
    if (packagePrice <= 0) continue;

    const extraKm =
      pickLocalExtraKm(matchedFare) ||
      pickLocalExtraKm(vehicle.localPackageFares) ||
      parseNumericValue(vehicle.pricePerKm);

    const capacity = Number(vehicle.capacity) || 0;
    const label =
      capacity > 0 ? `${vehicle.name} (${capacity}+1)` : vehicle.name;

    options.push({
      id: vehicle.id || vehicle.vehicleId || vehicle.name,
      label,
      image: getVehicleImageUrlForDisplay(vehicle),
      packagePrice,
      extraKm,
    });
  }

  return options.sort((a, b) => a.packagePrice - b.packagePrice);
}

export function LocalTaxiPage() {
  const [rideOptions, setRideOptions] = useState<LocalRideOption[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadRideOptions = async () => {
      setRidesLoading(true);
      try {
        const [vehicles, fares] = await Promise.all([
          loadCabTypes(false, true),
          fetchLocalFares().catch(() => [] as FareData[]),
        ]);
        if (cancelled) return;
        setRideOptions(buildLocalRideOptions(vehicles, fares));
      } catch (error) {
        console.error('Failed to load local ride options:', error);
        if (!cancelled) setRideOptions([]);
      } finally {
        if (!cancelled) setRidesLoading(false);
      }
    };

    void loadRideOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Quick Pickup',
      description: 'Pickup within 15–30 mins',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Safe Rides',
      description: 'Well maintained cars with GPS tracking',
    },
    {
      icon: <Clock className="w-5 h-5" />,
      title: '24/7 Service',
      description: 'Available round the clock for city travel',
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: 'Fair Pricing',
      description: 'Transparent rates with no surge pricing',
    },
  ];

  const serviceAreas = [
    'MVP Colony',
    'Dwaraka Nagar',
    'Gajuwaka',
    'Madhurawada',
    'Beach Road',
    'Rushikonda',
    'Yendada',
    'Pendurthi',
    'Kailasagiri',
    'Simhachalam',
  ];

  const otherServices = [
    {
      name: 'Outstation Taxi',
      description: 'Inter-city travel',
      href: '/outstation-taxi',
      Icon: Route,
    },
    {
      name: 'Airport Transfer',
      description: 'Airport pickup & drop',
      href: '/airport-taxi',
      Icon: Plane,
    },
    {
      name: 'Tour Packages',
      description: 'Sightseeing packages',
      href: '/tours',
      Icon: MapPinned,
    },
    {
      name: 'Group Tours',
      description: 'Shared tours – save more',
      href: '/group-tours',
      Icon: Users,
    },
    {
      name: 'Shared Carpooling',
      description: 'Daily office commute',
      href: '/shared-carpooling',
      Icon: CarFront,
    },
    {
      name: 'Tempo Traveller Rental',
      description: 'Group travel solutions',
      href: '/tempo-traveller-rental-vizag',
      Icon: Bus,
    },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Vizag Taxi Hub - Local Taxi Service',
    description:
      'Professional local cab booking service in Visakhapatnam. City taxi, point to point rides, and hourly rentals available 24/7.',
    url: 'https://vizagtaxihub.com/local-taxi',
    telephone: '+91-9966363662',
    areaServed: { '@type': 'City', name: 'Visakhapatnam' },
  };

  const mobileBelowFold = (
    <>
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Why book a local cab with us</h2>
          <p className="mb-5 text-sm leading-relaxed text-gray-600 sm:text-base">
            Fast city rides across Visakhapatnam — verified drivers, fair packages, and 24/7 booking.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-3 rounded-lg bg-blue-50/80 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
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
          <h2 className="mb-4 text-lg font-bold text-gray-900">Choose Your Ride (8hrs package)</h2>
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
                    <Car className="h-5 w-5 shrink-0 text-blue-500" />
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {formatInr(v.packagePrice)} / 8hrs
                  </p>
                  {v.extraKm > 0 && (
                    <p className="mt-1 text-xs text-gray-500">Extra {formatInr(v.extraKm)}/km</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Popular Local Areas</h2>
          <div className="flex flex-wrap gap-2">
            {serviceAreas.slice(0, 6).map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-3 py-1.5 text-sm text-gray-700"
              >
                <MapPin className="h-3.5 w-3.5 text-blue-500" />
                {area}
              </span>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base font-bold text-gray-900">Book Local Cab</h2>
          <p className="mb-4 text-sm text-gray-600">City rides · Hourly packages · Point-to-point</p>
          <ul className="mb-4 space-y-2 text-sm text-gray-700">
            {['Verified drivers', 'Fair city rates', '24/7 availability'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-blue-500" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            className="w-full bg-blue-500 text-white hover:bg-blue-600"
            onClick={() => window.open('tel:+919966363662')}
          >
            <Phone className="mr-2 h-4 w-4" />
            Call +91 9966363662
          </Button>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <ServiceLinks currentService="/local-taxi" title="Other Services" variant="sidebar" />
        </div>
      </aside>
    </>
  );

  const desktopBelowFold = (
    <div className="hidden space-y-8 lg:block">
      {/* Help bar */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 xl:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[var(--brand-primary)] shadow-sm">
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
            <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4 fill-[#25D366]" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
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

      {/* Why book */}
      <section className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 xl:text-3xl">Why book a local cab with us</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 xl:text-base">
          Fast city rides across Visakhapatnam — verified drivers, fair packages, and 24/7 booking.
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

      {/* Choose ride — fares + images from backend */}
      <section>
        <h2 className="mb-5 text-2xl font-bold text-slate-900">Choose Your Ride (8hrs package)</h2>
        {ridesLoading ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-slate-100"
              />
            ))}
          </div>
        ) : rideOptions.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-sm text-slate-600">
            Local package fares are loading from our pricing system. Please use Search Cabs above for
            live rates.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {rideOptions.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-[var(--home-card-border)] bg-white p-4 shadow-[var(--home-card-shadow)] transition-colors hover:border-blue-200"
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
                  {formatInr(v.packagePrice)} / 8hrs
                </p>
                {v.extraKm > 0 && (
                  <p className="mt-1 text-xs text-slate-500">Extra {formatInr(v.extraKm)}/km</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Areas + Other services */}
      <section className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5 xl:gap-6">
        <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Popular Local Areas</h2>
          <div className="flex flex-wrap gap-2.5">
            {serviceAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-[var(--brand-primary-light)]/50 px-3 py-1.5 text-sm font-medium text-[var(--brand-primary-dark)]"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {area}
              </span>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link
              to="/vehicle/innova-crysta"
              className="group flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-[var(--brand-primary-light)]/70 px-4 py-3.5 transition-colors hover:bg-[var(--brand-primary-light)]"
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Innova Crysta Taxi Booking
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  Premium comfort for your city rides
                </span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
            <Link
              to="/airport-taxi"
              className="group flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-[var(--brand-primary-light)]/70 px-4 py-3.5 transition-colors hover:bg-[var(--brand-primary-light)]"
            >
              <span>
                <span className="block text-sm font-semibold text-slate-900">
                  Airport Transfer Vizag
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">On-time pickups & drop</span>
              </span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white">
                <ArrowRight className="h-4 w-4" aria-hidden />
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
                className="group flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 transition-colors hover:border-blue-200 hover:bg-white"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-slate-900 group-hover:text-[var(--brand-primary)]">
                    {name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[var(--brand-primary)]"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Link
              to="/fleet"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
            >
              View All Services
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Custom package CTA */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B3A7A] via-[var(--brand-primary-dark)] to-[var(--brand-primary)] px-6 py-7 text-white shadow-lg xl:px-8">
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold tracking-wide">
              VTH
            </span>
            <p className="max-w-xl text-base font-semibold leading-snug xl:text-lg">
              Need a custom package? Tell us your plan and we&apos;ll handle the rest.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-full bg-white px-5 text-[var(--brand-primary-dark)] hover:bg-blue-50"
          >
            <Link to="/contact">
              Get a Quote
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );

  return (
    <ServiceEmbedShell
      slug="local"
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
        <LocalHeroWidget
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
          {/* Mobile keeps previous content layout */}
          <div className="grid grid-cols-1 gap-5 lg:hidden">{mobileBelowFold}</div>
          {desktopBelowFold}
        </>
      }
    />
  );
}

export default LocalTaxiPage;
