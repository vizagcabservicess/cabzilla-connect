import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { popularRoutes } from '@/lib/routeData';
import { slugify } from '@/lib/utils';

interface PopularDestinationsProps {
  title?: string;
  limit?: number;
  showFares?: boolean;
  showViewAll?: boolean;
}

export const PopularDestinations: React.FC<PopularDestinationsProps> = ({
  title = 'Popular Destinations from Visakhapatnam',
  limit = 8,
  showFares = true,
  showViewAll = false,
}) => {
  const popularDestinations = popularRoutes.slice(0, limit);

  return (
    <div className="rounded-2xl border border-[var(--home-card-border)] bg-white p-5 shadow-[var(--home-card-shadow)] xl:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            One-way &amp; round-trip highway routes with distance and travel time
          </p>
        </div>
        {showViewAll && (
          <Link
            to="/outstation-taxi"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline sm:text-sm"
          >
            View All Routes
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {popularDestinations.map((route, index) => {
          const routeSlug = `${slugify(route.from)}-to-${slugify(route.to)}`;
          return (
            <Link
              key={index}
              to={`/outstation-taxi/${routeSlug}`}
              className="group flex min-w-0 flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 transition-all duration-200 hover:border-blue-300 hover:bg-white hover:shadow-md"
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-[var(--brand-primary)] sm:text-base">
                  Vizag → {route.to}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    {route.distance}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    {route.time}
                  </span>
                </div>
              </div>
              {showFares && (
                <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-xs">
                  <span className="font-semibold text-[var(--brand-primary)]">
                    From ₹{route.fares.sedan.replace('₹', '')}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-medium text-slate-500 transition-colors group-hover:text-[var(--brand-primary)]">
                    Book
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
