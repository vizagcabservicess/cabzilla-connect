import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Bus,
  BusFront,
  Car,
  Caravan,
  CarFront,
  ChevronRight,
  Church,
  Heart,
  MapPinned,
  Plane,
  Route,
  ShipWheel,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ServiceLinksProps {
  currentService?: string;
  title?: string;
  /** `sidebar` = single-column list for narrow asides; `default` = multi-column grid. */
  variant?: 'default' | 'sidebar';
}

type ServiceItem = {
  name: string;
  href: string;
  description: string;
  emoji: string;
  Icon: LucideIcon;
};

const services: ServiceItem[] = [
  {
    name: 'Local Taxi',
    href: '/local-taxi',
    description: 'City rides and local trips',
    emoji: '🚗',
    Icon: Car,
  },
  {
    name: 'Outstation Taxi',
    href: '/outstation-taxi',
    description: 'Inter-city travel',
    emoji: '🛣️',
    Icon: Route,
  },
  {
    name: 'Airport Transfer',
    href: '/airport-taxi',
    description: 'Airport pickup & drop',
    emoji: '✈️',
    Icon: Plane,
  },
  {
    name: 'Tour Packages',
    href: '/tours',
    description: 'Sightseeing packages',
    emoji: '🏛️',
    Icon: MapPinned,
  },
  {
    name: 'Group Tours',
    href: '/group-tours',
    description: 'Shared tours – save up to 60%',
    emoji: '👥',
    Icon: Users,
  },
  {
    name: 'Shared Carpooling',
    href: '/shared-carpooling',
    description: 'Daily office & college commute',
    emoji: '🚘',
    Icon: CarFront,
  },
  {
    name: 'Urbania Rental Vizag',
    href: '/urbania-rental-vizag',
    description: 'Premium Urbania van hire',
    emoji: '🚐',
    Icon: Caravan,
  },
  {
    name: 'Tempo Traveller Rental',
    href: '/tempo-traveller-rental-vizag',
    description: 'Group travel solutions',
    emoji: '🚌',
    Icon: Bus,
  },
  {
    name: '17 Seater Tempo Traveller',
    href: '/17-seater-tempo-traveller-vizag',
    description: 'Large group transportation',
    emoji: '🚐',
    Icon: BusFront,
  },
  {
    name: '12 Seater Tempo Traveller',
    href: '/12-seater-tempo-traveller-vizag',
    description: 'Medium group travel',
    emoji: '🚐',
    Icon: Caravan,
  },
  {
    name: 'Group Travel',
    href: '/group-travel-tempo-traveller-vizag',
    description: 'Specialized group travel',
    emoji: '👥',
    Icon: Users,
  },
  {
    name: 'Corporate Transport',
    href: '/corporate-tempo-traveller-vizag',
    description: 'Business travel solutions',
    emoji: '🏢',
    Icon: Building2,
  },
  {
    name: 'Wedding Transport',
    href: '/wedding-tempo-traveller-vizag',
    description: 'Special wedding services',
    emoji: '💒',
    Icon: Heart,
  },
  {
    name: 'Pilgrimage Tours',
    href: '/pilgrimage-tempo-traveller-vizag',
    description: 'Religious journey transport',
    emoji: '🕍',
    Icon: Church,
  },
  {
    name: 'Mini Bus Travels',
    href: '/mini-bus-travels-vizag',
    description: 'Mini bus rental services',
    emoji: '🚌',
    Icon: Bus,
  },
  {
    name: 'Fleet',
    href: '/fleet',
    description: 'Our vehicle fleet',
    emoji: '🚙',
    Icon: CarFront,
  },
  {
    name: 'Hire Driver',
    href: '/hire-driver',
    description: 'Professional drivers',
    emoji: '👨‍✈️',
    Icon: ShipWheel,
  },
];

export const ServiceLinks: React.FC<ServiceLinksProps> = ({
  currentService,
  title = 'Our Services',
  variant = 'default',
}) => {
  const filteredServices = currentService
    ? services.filter((service) => service.href !== currentService)
    : services;

  const isSidebar = variant === 'sidebar';

  return (
    <div className={isSidebar ? 'bg-white' : 'mt-8 rounded-lg bg-gray-50 p-6'}>
      <h3
        className={
          isSidebar
            ? 'mb-3 text-base font-bold text-gray-900'
            : 'mb-4 text-xl font-semibold text-gray-900'
        }
      >
        {title}
      </h3>
      <div
        className={
          isSidebar
            ? 'flex flex-col divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white'
            : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
        }
      >
        {filteredServices.map((service) => {
          const Icon = service.Icon;
          if (isSidebar) {
            return (
              <Link
                key={service.href}
                to={service.href}
                className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-blue-50/70"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-gray-900 group-hover:text-[var(--brand-primary)]">
                    {service.name}
                  </span>
                  <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                    {service.description}
                  </span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-[var(--brand-primary)]"
                  aria-hidden
                />
              </Link>
            );
          }

          return (
            <Link
              key={service.href}
              to={service.href}
              className="group block rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <span className="shrink-0 text-xl leading-none" aria-hidden>
                  {service.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium leading-snug text-gray-900 transition-colors group-hover:text-blue-700">
                    {service.name}
                  </h4>
                  <p className="mt-0.5 text-xs leading-snug text-gray-600 sm:text-sm">
                    {service.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
