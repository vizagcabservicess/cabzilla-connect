import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plane,
  Phone,
  Clock,
  MapPin,
  Shield,
  CheckCircle,
  Headphones,
  ArrowRight,
  AlertTriangle,
  Building2,
  Route,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AirportPeekRail, AirportSectionHead } from '@/components/airport/AirportPeekRail';
import { AirportHeroWidget } from '@/components/AirportHeroWidget';
import { ServiceEmbedShell } from '@/components/service/ServiceEmbedShell';
import { loadCabTypes } from '@/lib/cabData';
import type { CabType } from '@/types/cab';
import { getVehicleImageUrlForDisplay } from '@/utils/vehicleUrlUtils';
import {
  AIRPORT_ADVANCE_BENEFITS,
  AIRPORT_DIRECT_CITIES,
  AIRPORT_FAQS,
  AIRPORT_INTERNAL_LINKS,
  AIRPORT_KNOW_BEFORE,
  AIRPORT_NORTH_ANDHRA_DESTINATIONS,
  AIRPORT_PICKUP_STEPS,
  AIRPORT_POPULAR_ROUTES,
  AIRPORT_TAXI_FLIGHT_STATUS_URL,
  AIRPORT_TAXI_PHONE_DISPLAY,
  AIRPORT_TAXI_PHONE_TEL,
  AIRPORT_TAXI_WHATSAPP_URL,
  AIRPORT_VIZAG_DESTINATIONS,
  buildAirportTaxiStructuredData,
} from '@/seo/airportTaxiPageContent';

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
    ids: ['glanza', 'toyota_glanza'],
    nameIncludes: ['glanza'],
    label: 'Toyota Glanza',
    capacity: 4,
    priceFrom: 2250,
    fallbackImage: '/uploads/toyota-glanza-vizagtaxihub.png',
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
    ids: ['ertiga'],
    nameIncludes: ['ertiga'],
    label: 'Ertiga',
    capacity: 6,
    priceFrom: 3750,
    fallbackImage: '/cars/ertiga.png',
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

const FEATURES = [
  {
    icon: Plane,
    title: 'Flight Tracking',
    description: 'We monitor your flight and coordinate your pickup.',
  },
  {
    icon: Clock,
    title: 'Punctual Service',
    description: 'We plan your pickup around your flight arrival or departure time.',
  },
  {
    icon: MapPin,
    title: 'Meet & Greet',
    description: 'Name-board pickup and luggage assistance are available on request.',
  },
  {
    icon: Shield,
    title: 'Safe Transfers',
    description: 'Experienced drivers and GPS-enabled vehicles for a comfortable journey.',
  },
  {
    icon: Headphones,
    title: '24/7 Service',
    description: 'Book anytime — we arrange airport pickups around the clock.',
  },
] as const;

const AIRPORT_CARD_CLASS =
  'h-full rounded-2xl border border-[var(--home-card-border)] bg-white p-4 shadow-[var(--home-card-shadow)] sm:p-5';

function FeatureCard({ feature }: { feature: (typeof FEATURES)[number] }) {
  const Icon = feature.icon;
  return (
    <div className={AIRPORT_CARD_CLASS}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
      <p className="mt-1 text-sm leading-snug text-slate-600">{feature.description}</p>
    </div>
  );
}

function AreaChip({ place }: { place: string }) {
  return (
    <span className="flex h-full items-center rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
      {place}
    </span>
  );
}

function FareCard({ vehicle }: { vehicle: AirportRideOption }) {
  return (
    <div className={AIRPORT_CARD_CLASS}>
      <h3 className="text-sm font-semibold text-slate-900">{vehicle.label}</h3>
      <div className="my-2 flex h-[5.5rem] items-center justify-center overflow-hidden rounded-xl bg-slate-50 px-2">
        <img
          src={vehicle.image}
          alt={`Airport taxi vehicles for Bhogapuram Airport — ${vehicle.label}`}
          className="h-[4.5rem] w-auto max-w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
      <p className="text-base font-bold leading-snug text-[var(--brand-primary)]">
        Airport transfers from {formatInr(vehicle.priceFrom)}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">All Inclusive</p>
    </div>
  );
}

const RAIL_CARD_WIDTH = 'w-[10.75rem] shrink-0';

function RouteRailCard({ to, distance }: { to: string; distance: string }) {
  return (
    <a href="#airport-booking" className="w-[13.25rem] shrink-0">
      <div className="flex min-h-[10.5rem] flex-col rounded-2xl bg-gradient-to-br from-[#E8F1FF] via-[#F3F7FC] to-[#EEF2F6] p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-[var(--brand-primary)]">
            ASR
          </span>
          <MapPin className="h-4 w-4 text-[var(--brand-primary)]" aria-hidden />
        </div>
        <p className="mt-3 text-[15px] font-semibold leading-snug text-slate-900">
          {to}
        </p>
        <p className="mt-1 text-xs text-slate-500">{distance}</p>
        <span className="mt-auto pt-4 text-xs font-semibold text-[var(--brand-primary)]">
          Book transfer →
        </span>
      </div>
    </a>
  );
}

function FareRailCard({ vehicle }: { vehicle: AirportRideOption }) {
  return (
    <a href="#airport-booking" className={`${RAIL_CARD_WIDTH} block`}>
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-slate-50 p-4">
        <img
          src={vehicle.image}
          alt=""
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
      <p className="mt-2.5 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-900">
        {vehicle.label}
      </p>
      <p className="text-sm font-bold text-slate-900">{formatInr(vehicle.priceFrom)}</p>
      <p className="text-[11px] text-slate-400">All inclusive</p>
      <span className="mt-2.5 inline-flex rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white">
        Book now
      </span>
    </a>
  );
}

function AreaRailChip({ place }: { place: string }) {
  return (
    <a
      href="#airport-booking"
      className="shrink-0 rounded-full bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-800"
    >
      {place}
    </a>
  );
}

function QuickAccessRow({
  icon,
  title,
  subtitle,
  href = '#airport-booking',
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  const className =
    'flex w-full items-center gap-3 px-1 py-3.5 text-left';

  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-slate-900">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block text-xs leading-snug text-slate-400">{subtitle}</span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
    </>
  );

  if (href.startsWith('/')) {
    return (
      <Link to={href} className={className}>
        {body}
      </Link>
    );
  }

  if (href.startsWith('http') || href.startsWith('tel:') || href.startsWith('mailto:')) {
    return (
      <a href={href} className={className} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}>
        {body}
      </a>
    );
  }

  return (
    <a href={href} className={className}>
      {body}
    </a>
  );
}

function AirportMoveBanner() {
  return (
    <div className="border-b border-amber-300 bg-amber-400">
      <p className="mx-auto flex max-w-7xl items-start gap-2 px-3 py-2.5 text-sm font-medium leading-snug text-amber-950 sm:items-center sm:px-4 sm:text-[0.9375rem]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 sm:mt-0" aria-hidden />
        <span>
          <span className="font-bold">From 17 August 2026:</span> Scheduled commercial flights
          move to Bhogapuram Airport (Alluri Sitarama Raju International Airport).
        </span>
      </p>
    </div>
  );
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

  const structuredData = buildAirportTaxiStructuredData();

  return (
    <ServiceEmbedShell
      slug="airport"
      layout="marketing"
      heroBanner={<AirportMoveBanner />}
      helmetExtra={
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      }
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
        <div className="min-w-0 space-y-8 lg:space-y-10">
          <section className="lg:hidden">
            <AirportSectionHead title="Need help?" eyebrow="we're here 24/7" />
            <div className="divide-y divide-slate-100">
              <QuickAccessRow
                icon={<Headphones className="h-4 w-4" aria-hidden />}
                title="Chat on WhatsApp"
                subtitle="Send flight details and we'll arrange pickup"
                href={AIRPORT_TAXI_WHATSAPP_URL}
              />
              <QuickAccessRow
                icon={<Phone className="h-4 w-4" aria-hidden />}
                title={`Call ${AIRPORT_TAXI_PHONE_DISPLAY}`}
                subtitle="Airport booking assistance"
                href={`tel:${AIRPORT_TAXI_PHONE_TEL}`}
              />
            </div>
          </section>

          <section className="hidden flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 lg:flex xl:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <p className="text-sm text-slate-700 xl:text-base">
                <span className="font-semibold text-slate-900">Need help with your booking?</span>{' '}
                Our team can assist with airport transfers, flight details and vehicle selection.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                className="rounded-full border-slate-200 bg-white hover:bg-white"
                onClick={() => window.open(AIRPORT_TAXI_WHATSAPP_URL, '_blank')}
              >
                Chat on WhatsApp
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-slate-200 bg-white text-[var(--brand-primary)] hover:bg-white"
                onClick={() => window.open(`tel:${AIRPORT_TAXI_PHONE_TEL}`)}
              >
                <Phone className="mr-2 h-4 w-4" />
                Call {AIRPORT_TAXI_PHONE_DISPLAY}
              </Button>
            </div>
          </section>

          <section>
            <div className="lg:hidden">
              <AirportSectionHead title="Why book with us" eyebrow="quick access" />
              <div className="divide-y divide-slate-100">
                {FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <QuickAccessRow
                      key={feature.title}
                      icon={<Icon className="h-4 w-4" aria-hidden />}
                      title={feature.title}
                      subtitle={feature.description}
                    />
                  );
                })}
              </div>
            </div>
            <div className="hidden lg:block">
              <h2 className="text-2xl font-bold text-slate-900 xl:text-3xl">
                Why Travelers Choose Vizag Taxi Hub
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 xl:text-base">
                Fixed-rate transfers to and from Bhogapuram Airport, with flight tracking, meet &
                greet and on-time service for the longer journey into Vizag.
              </p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                {FEATURES.map((feature) => (
                  <FeatureCard key={feature.title} feature={feature} />
                ))}
              </div>
            </div>
          </section>

          <section id="airport-routes" className="scroll-mt-24">
            <div className="lg:hidden">
              <AirportSectionHead
                title="Popular airport routes"
                eyebrow="from Bhogapuram"
                viewAllHref="#airport-booking"
              />
              <AirportPeekRail>
                {AIRPORT_POPULAR_ROUTES.map((route) => (
                  <RouteRailCard
                    key={route.to}
                    to={route.cardTo}
                    distance={route.distance}
                  />
                ))}
              </AirportPeekRail>
            </div>
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-slate-900 xl:text-2xl">Popular Airport Routes</h2>
              <p className="mt-1 text-sm text-slate-500">
                Approximate distances from Alluri Sitarama Raju International Airport.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Route</th>
                      <th className="px-3 py-2.5 text-right font-semibold">Approx. distance*</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AIRPORT_POPULAR_ROUTES.map((route) => (
                      <tr key={route.to} className="border-t border-slate-100">
                        <td className="px-3 py-2.5 font-medium text-slate-900">
                          Bhogapuram Airport → {route.to}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{route.distance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                *Distances are approximate and may vary depending on the pickup point and route
                selected.
              </p>
              <Button asChild className="mt-4 rounded-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)]">
                <a href="#airport-booking">
                  Book Airport to Vizag Cab
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </section>

          <section id="airport-fares" className="scroll-mt-24">
            <div className="lg:hidden">
              <AirportSectionHead
                title="Airport taxi fares"
                eyebrow="starting prices"
                viewAllHref="#airport-booking"
                viewAllLabel="view all"
              />
              {ridesLoading ? (
                <AirportPeekRail>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-52 w-[10.75rem] shrink-0 animate-pulse rounded-2xl bg-slate-100"
                    />
                  ))}
                </AirportPeekRail>
              ) : (
                <AirportPeekRail>
                  {rideOptions.map((vehicle) => (
                    <FareRailCard key={vehicle.id} vehicle={vehicle} />
                  ))}
                </AirportPeekRail>
              )}
            </div>
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-slate-900 xl:text-2xl">Airport Taxi Fares</h2>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                Starting fares for airport transfers. Choose the right vehicle for your journey.
              </p>
              {ridesLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {rideOptions.map((vehicle) => (
                    <FareCard key={vehicle.id} vehicle={vehicle} />
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">
                Airport fares may vary depending on the destination, vehicle type, travel date and
                other applicable charges. Please check the final fare before booking.
              </p>
              <Button asChild variant="outline" className="mt-3 rounded-full">
                <a href="#airport-booking">
                  Check Airport Fare
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </section>

          <section>
            <div className="lg:hidden">
              <AirportSectionHead
                title="Bhogapuram to Visakhapatnam"
                eyebrow="about 45 km · 60–75 min"
                viewAllHref="#airport-booking"
                viewAllLabel="view all"
              />
              <AirportPeekRail>
                {[...AIRPORT_VIZAG_DESTINATIONS, 'Other Vizag areas'].map((place) => (
                  <AreaRailChip key={place} place={place} />
                ))}
              </AirportPeekRail>
            </div>
            <div className="hidden rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] lg:block xl:p-6">
              <h2 className="text-xl font-bold text-slate-900 xl:text-2xl">
                Bhogapuram Airport to Visakhapatnam
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 xl:text-base">
                Alluri Sitarama Raju International Airport is approximately{' '}
                <strong>45 km from Visakhapatnam</strong>. Depending on your destination and traffic
                conditions, allow around <strong>60–75 minutes</strong> for transfers to central areas
                of Vizag. We provide direct airport transfers to:
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {AIRPORT_VIZAG_DESTINATIONS.map((place) => (
                  <li key={place}>
                    <AreaChip place={place} />
                  </li>
                ))}
                <li>
                  <AreaChip place="Other areas across Visakhapatnam" />
                </li>
              </ul>
            </div>
          </section>

          <section>
            <div className="lg:hidden">
              <AirportSectionHead
                title="Vizianagaram & Srikakulam"
                eyebrow="north Andhra transfers"
                viewAllHref="#airport-booking"
                viewAllLabel="view all"
              />
              <AirportPeekRail>
                {[...AIRPORT_NORTH_ANDHRA_DESTINATIONS, 'Other nearby towns'].map((place) => (
                  <AreaRailChip key={place} place={place} />
                ))}
              </AirportPeekRail>
            </div>
            <div className="hidden rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] lg:block xl:p-6">
              <h2 className="text-xl font-bold text-slate-900 xl:text-2xl">
                Airport Transfers to Vizianagaram & Srikakulam
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 xl:text-base">
                Because Bhogapuram Airport is located in Vizianagaram district, it is also convenient
                for passengers travelling across North Andhra. Whether you&apos;re travelling into
                Vizag or heading directly to another city, you can book a private airport cab in
                advance.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AIRPORT_NORTH_ANDHRA_DESTINATIONS.map((place) => (
                  <li key={place}>
                    <AreaChip place={place} />
                  </li>
                ))}
                <li>
                  <AreaChip place="Other nearby towns" />
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/outstation-taxi/visakhapatnam-to-vizianagaram"
                  className="text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                >
                  Vizianagaram Taxi →
                </Link>
                <Link
                  to="/outstation-taxi/visakhapatnam-to-srikakulam"
                  className="text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                >
                  Srikakulam Taxi →
                </Link>
              </div>
            </div>
          </section>

          <section>
            <div className="lg:hidden">
              <AirportSectionHead title="How pickup works" eyebrow="from landing to drop" />
              <div className="divide-y divide-slate-100">
                {AIRPORT_PICKUP_STEPS.map((step, index) => (
                  <QuickAccessRow
                    key={step.title}
                    icon={
                      <span className="text-sm font-bold text-slate-800">{index + 1}</span>
                    }
                    title={step.shortTitle}
                    subtitle={step.body}
                  />
                ))}
              </div>
            </div>
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-slate-900 xl:text-2xl">
                How Bhogapuram Airport Pickup Works
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                A simple airport pickup from landing to destination.
              </p>
              <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {AIRPORT_PICKUP_STEPS.map((step, index) => (
                  <li
                    key={step.title}
                    className="rounded-2xl border border-[var(--home-card-border)] bg-white p-4 shadow-[var(--home-card-shadow)]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <h3 className="mt-3 text-sm font-bold text-slate-900">{step.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
              <h2 className="text-xl font-bold text-slate-900">Know Before You Fly</h2>
              <p className="mt-1 text-sm text-slate-500">
                Important things to know about the new Vizag airport.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {AIRPORT_KNOW_BEFORE.map((item) => (
                  <div key={item.title} className="rounded-xl bg-slate-50 p-3">
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
              <h2 className="text-xl font-bold text-slate-900">VTZ – Visakhapatnam Airport</h2>
              <h3 className="mt-2 text-base font-semibold text-slate-800">
                Is your ticket still showing VTZ?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Yes. Passengers may still see <strong>VTZ</strong> in their flight booking or travel
                information. Scheduled commercial operations are moving to the new{' '}
                <strong>Alluri Sitarama Raju International Airport at Bhogapuram</strong>.
              </p>
              <p className="mt-3 text-sm font-medium text-slate-800">
                Before leaving for the airport, always check the airport/location shown in your
                latest airline communication.
              </p>
              <h3 className="mt-6 text-base font-bold text-slate-900">Direct flights</h3>
              <p className="mt-1 text-sm text-slate-600">
                The new airport connects the Visakhapatnam region with several major Indian
                destinations. Flight schedules and timings can change based on airline and airport
                operations.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {AIRPORT_DIRECT_CITIES.map((city) => (
                  <span
                    key={city}
                    className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-sm font-medium text-slate-800"
                  >
                    {city}
                  </span>
                ))}
              </div>
              <a
                href={AIRPORT_TAXI_FLIGHT_STATUS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center text-sm font-semibold text-[var(--brand-primary)] hover:underline"
              >
                View Live Flight Schedule
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
              <p className="mt-2 text-xs text-slate-500">
                Check your airline or the latest airport flight-status information before travelling.
              </p>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
              <h2 className="text-xl font-bold text-slate-900">Why Book Your Airport Taxi in Advance?</h2>
              <p className="mt-2 text-sm text-slate-600">
                The new airport is farther from central Vizag, so arranging your cab before you
                travel can save time after landing.
              </p>
              <ul className="mt-4 space-y-2">
                {AIRPORT_ADVANCE_BENEFITS.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div
              id="group-transfers"
              className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6"
            >
              <h2 className="text-xl font-bold text-slate-900">Flying in as a Group?</h2>
              <p className="mt-2 text-sm text-slate-600">
                Instead of arranging multiple airport taxis, book a larger vehicle and travel
                together from Bhogapuram Airport.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>
                  <strong>Tempo Traveller</strong> — family groups, tour groups and corporate teams.
                </li>
                <li>
                  <strong>Urbania</strong> — larger groups and corporate airport transfers.
                </li>
                <li>
                  <strong>Multiple vehicles</strong> — we can coordinate pickup and drop for very
                  large groups.
                </li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild className="rounded-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)]">
                  <Link to="/tempo-traveller-rental-vizag">See Group Transfer Options</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/urbania-rental-vizag">Urbania Rental</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                <Building2 className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Airport Taxi for Business & Corporate Travel
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                We can arrange airport pickup and drop for individual executives as well as larger
                corporate teams — including Tempo Traveller, Urbania, multi-day transportation and
                corporate billing support.
              </p>
              <Button asChild className="mt-4 rounded-full">
                <Link to="/corporate-tempo-traveller-vizag">Enquire About Corporate Transport</Link>
              </Button>
            </div>
            <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                <Route className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Bhogapuram Airport Taxi for Outstation Travel
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Landing at Bhogapuram Airport and travelling directly to another destination? We
                provide outstation airport transfers across Andhra Pradesh, Odisha, Telangana and
                neighbouring regions.
              </p>
              <Button asChild className="mt-4 rounded-full">
                <Link to="/outstation-taxi">Get an Outstation Quote</Link>
              </Button>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
              <h2 className="text-xl font-bold text-slate-900">Frequently Asked Questions</h2>
              <Accordion type="single" collapsible className="mt-2">
                {AIRPORT_FAQS.map((faq, index) => (
                  <AccordionItem key={faq.question} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left text-sm font-semibold text-slate-900 hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)]">
                <h2 className="text-lg font-bold text-slate-900">Prefer WhatsApp?</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Send us your flight details and we&apos;ll help arrange your airport pickup.
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                  <li>✈️ Flight Number</li>
                  <li>📅 Arrival Date</li>
                  <li>⏰ Arrival Time</li>
                  <li>📍 Drop Location</li>
                  <li>👥 Number of Passengers</li>
                </ul>
                <Button
                  className="mt-4 w-full rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => window.open(AIRPORT_TAXI_WHATSAPP_URL, '_blank')}
                >
                  Chat on WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="mt-2 w-full rounded-full"
                  onClick={() => window.open(`tel:${AIRPORT_TAXI_PHONE_TEL}`)}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Call {AIRPORT_TAXI_PHONE_DISPLAY}
                </Button>
              </div>
            </aside>
          </section>

          <section className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
            <h2 className="text-xl font-bold text-slate-900">Trusted Airport Transfers by Vizag Taxi Hub</h2>
            <p className="mt-2 text-sm text-slate-600">
              From airport pickups to complete journeys across Andhra Pradesh — airport pickup,
              airport drop, local taxi, outstation taxi, Tempo Traveller, Urbania, group transfers
              and corporate transport.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {AIRPORT_INTERNAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-800 hover:border-blue-200 hover:text-[var(--brand-primary)]"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B3A7A] via-[var(--brand-primary-dark)] to-[var(--brand-primary)] px-6 py-7 text-white shadow-lg xl:px-8">
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Plane className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-bold xl:text-xl">
                    Ready to Book Your Bhogapuram Airport Cab?
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-snug text-white/90 xl:text-base">
                    Landing late or travelling with a large group? Tell us your flight details,
                    destination and number of passengers — we&apos;ll help arrange the right vehicle.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Button asChild className="rounded-full bg-white px-5 text-[var(--brand-primary-dark)] hover:bg-blue-50">
                  <a href="#airport-booking">Book Your Airport Cab</a>
                </Button>
                <Button
                  className="rounded-full bg-emerald-500 px-5 text-white hover:bg-emerald-600"
                  onClick={() => window.open(AIRPORT_TAXI_WHATSAPP_URL, '_blank')}
                >
                  Chat on WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                  onClick={() => window.open(`tel:${AIRPORT_TAXI_PHONE_TEL}`)}
                >
                  Call {AIRPORT_TAXI_PHONE_DISPLAY}
                </Button>
              </div>
            </div>
          </section>
        </div>
      }
    />
  );
}

export default AirportTaxiPage;
