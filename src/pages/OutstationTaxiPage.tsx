import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Shield,
  Star,
  Zap,
  Users,
  CheckCircle,
  Car,
  Headphones,
  ArrowRight,
  ChevronRight,
  Plane,
  MapPinned,
  CarFront,
  Bus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OutstationHeroWidget } from '@/components/OutstationHeroWidget';
import { ServiceLinks } from '@/components/ServiceLinks';
import { PopularDestinations } from '@/components/PopularDestinations';
import { ServiceEmbedShell } from '@/components/service/ServiceEmbedShell';
import { loadCabTypes } from '@/lib/cabData';
import { parseNumericValue } from '@/services/fareManagementService';
import type { CabType } from '@/types/cab';
import { getVehicleImageUrlForDisplay } from '@/utils/vehicleUrlUtils';

const WHATSAPP_URL =
  'https://wa.me/919966363662?text=' +
  encodeURIComponent('Hi! I need help booking an outstation cab from Vizag.');

type OutstationRideOption = {
  id: string;
  label: string;
  image: string;
  pricePerKm: number;
};

function pickOutstationPerKm(vehicle: CabType): number {
  const of = vehicle.outstationFares;
  if (of) {
    const fromFare = parseNumericValue(
      of.pricePerKm ??
        (of as Record<string, unknown>).price_per_km ??
        (of as Record<string, unknown>).oneWayPricePerKm,
    );
    if (fromFare > 0) return fromFare;
  }
  return parseNumericValue(vehicle.pricePerKm);
}

function buildOutstationRideOptions(vehicles: CabType[]): OutstationRideOption[] {
  const options: OutstationRideOption[] = [];
  for (const vehicle of vehicles) {
    if (vehicle.isActive === false) continue;
    const pricePerKm = pickOutstationPerKm(vehicle);
    if (pricePerKm <= 0) continue;
    const capacity = Number(vehicle.capacity) || 0;
    options.push({
      id: vehicle.id || vehicle.vehicleId || vehicle.name,
      label: capacity > 0 ? `${vehicle.name} (${capacity}+1)` : vehicle.name,
      image: getVehicleImageUrlForDisplay(vehicle),
      pricePerKm,
    });
  }
  return options.sort((a, b) => a.pricePerKm - b.pricePerKm);
}

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function OutstationTaxiPage() {
  const [rideOptions, setRideOptions] = useState<OutstationRideOption[]>([]);
  const [ridesLoading, setRidesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setRidesLoading(true);
      try {
        const vehicles = await loadCabTypes(false, true);
        if (!cancelled) setRideOptions(buildOutstationRideOptions(vehicles));
      } catch (error) {
        console.error('Failed to load outstation ride options:', error);
        if (!cancelled) setRideOptions([]);
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
      icon: <Zap className="w-5 h-5" />,
      title: 'Instant Booking',
      description: 'Book your cab in under 60 seconds',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Safe & Reliable',
      description: 'GPS tracking and verified drivers',
    },
    {
      icon: <Star className="w-5 h-5" />,
      title: 'Best Rates',
      description: 'Transparent per-km pricing, no surge',
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: 'Trusted Service',
      description: '10,000+ satisfied travellers',
    },
  ];

  const popularRoutes = [
    {
      to: 'Araku Valley',
      distance: '115 km',
      href: '/outstation-taxi/visakhapatnam-to-araku-valley',
    },
    {
      to: 'Annavaram',
      distance: '130 km',
      href: '/outstation-taxi/visakhapatnam-to-annavaram',
    },
    {
      to: 'Hyderabad',
      distance: '625 km',
      href: '/outstation-taxi/visakhapatnam-to-hyderabad',
    },
    {
      to: 'Chennai',
      distance: '780 km',
      href: '/outstation-taxi/visakhapatnam-to-chennai',
    },
  ];

  const otherServices = [
    { name: 'Local Taxi', description: 'City rides & packages', href: '/local-taxi', Icon: Car },
    { name: 'Airport Transfer', description: 'Airport pickup & drop', href: '/airport-taxi', Icon: Plane },
    { name: 'Tour Packages', description: 'Sightseeing packages', href: '/tours', Icon: MapPinned },
    { name: 'Group Tours', description: 'Shared tours – save more', href: '/group-tours', Icon: Users },
    { name: 'Shared Carpooling', description: 'Daily office commute', href: '/shared-carpooling', Icon: CarFront },
    { name: 'Tempo Traveller Rental', description: 'Group travel solutions', href: '/tempo-traveller-rental-vizag', Icon: Bus },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Vizag Taxi Hub - Outstation Taxi Service',
    description:
      'Professional outstation cab booking service from Visakhapatnam. One way and round trip taxi service to all major cities in India.',
    url: 'https://vizagtaxihub.com/outstation-taxi',
    telephone: '+91-9966363662',
    areaServed: { '@type': 'City', name: 'Visakhapatnam' },
  };

  const mobileBelowFold = (
    <>
      <div className="space-y-6">
        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <h2 className="mb-2 text-xl font-bold text-gray-900">Why book outstation with us</h2>
          <p className="mb-5 text-sm leading-relaxed text-gray-600 sm:text-base">
            One-way and round-trip cabs from Vizag to Araku, Annavaram, Hyderabad and more — transparent
            rates and professional drivers.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-3 rounded-lg bg-emerald-50/80 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
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
          <h2 className="mb-4 text-lg font-bold text-gray-900">Popular Outstation Routes</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {popularRoutes.map((r) => (
              <Link
                key={r.to}
                to={r.href}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 hover:border-emerald-200"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">Vizag → {r.to}</p>
                  <p className="text-xs text-gray-500">{r.distance}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">Vehicle Options</h2>
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
                    <Car className="h-5 w-5 shrink-0 text-emerald-500" />
                  </div>
                  <p className="text-lg font-bold text-emerald-600">{formatInr(v.pricePerKm)}/km</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
          <PopularDestinations />
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-base font-bold text-gray-900">Book Outstation Cab</h2>
          <p className="mb-4 text-sm text-gray-600">One-way · Round-trip · Transparent per-km rates</p>
          <ul className="mb-4 space-y-2 text-sm text-gray-700">
            {['Door-to-door pickup', 'Professional drivers', 'Sedan to luxury options'].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <Button
            className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
            onClick={() => window.open('tel:+919966363662')}
          >
            <Phone className="mr-2 h-4 w-4" />
            Call +91 9966363662
          </Button>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <ServiceLinks
            currentService="/outstation-taxi"
            title="Other Services"
            variant="sidebar"
          />
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
        <h2 className="text-2xl font-bold text-slate-900 xl:text-3xl">Why book outstation with us</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 xl:text-base">
          One-way and round-trip cabs from Vizag across Andhra Pradesh and beyond — transparent rates
          and professional drivers.
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
        <h2 className="mb-5 text-2xl font-bold text-slate-900">Choose Your Ride</h2>
        {ridesLoading ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : rideOptions.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-white px-4 py-6 text-sm text-slate-600">
            Outstation rates are loading from our pricing system. Use Search Cabs above for live fares.
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
                  {formatInr(v.pricePerKm)}/km
                </p>
                <p className="mt-1 text-xs text-slate-500">One-way outstation rate</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-5 xl:gap-6">
        <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Popular Outstation Routes</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {popularRoutes.map((r) => (
              <Link
                key={r.to}
                to={r.href}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 transition-colors hover:border-blue-200 hover:bg-white"
              >
                <p className="text-sm font-semibold text-slate-900">Vizag → {r.to}</p>
                <p className="mt-0.5 text-xs text-slate-500">{r.distance}</p>
              </Link>
            ))}
          </div>
          <div className="mt-5">
            <PopularDestinations />
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
              Planning a multi-city trip? Tell us your route and we&apos;ll quote a custom package.
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
      slug="outstation"
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
        <OutstationHeroWidget
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

export default OutstationTaxiPage;
