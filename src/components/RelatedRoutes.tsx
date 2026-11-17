import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin } from 'lucide-react';
import { popularRoutes } from '@/lib/routeData';
import { slugify } from '@/lib/utils';

interface RelatedRoutesProps {
  currentRoute?: {
    from: string;
    to: string;
  };
  limit?: number;
}

export const RelatedRoutes: React.FC<RelatedRoutesProps> = ({ 
  currentRoute, 
  limit = 4 
}) => {
  // Get routes from the same origin or popular routes
  const getRelatedRoutes = () => {
    if (!currentRoute) {
      // Show most popular routes
      return popularRoutes.slice(0, limit);
    }

    // Get routes from the same origin
    const sameOriginRoutes = popularRoutes.filter(
      route => route.from === currentRoute.from && route.to !== currentRoute.to
    );

    // If not enough same origin routes, add other popular routes
    if (sameOriginRoutes.length < limit) {
      const otherRoutes = popularRoutes.filter(
        route => route.from !== currentRoute.from
      );
      return [...sameOriginRoutes, ...otherRoutes].slice(0, limit);
    }

    return sameOriginRoutes.slice(0, limit);
  };

  const relatedRoutes = getRelatedRoutes();

  if (relatedRoutes.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            {currentRoute ? `Other Routes from ${currentRoute.from}` : 'Popular Outstation Routes'}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Explore more one-way and round-trip highway routes from Vizag
          </p>
        </div>
        <Link
          to="/outstation-taxi"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline sm:text-sm"
        >
          All outstation cabs
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {relatedRoutes.map((route, index) => {
          const routeSlug = `${slugify(route.from)}-to-${slugify(route.to)}`;
          return (
            <Link
              key={index}
              to={`/outstation-taxi/${routeSlug}`}
              className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 transition-all duration-200 hover:border-blue-300 hover:bg-white hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 transition-colors group-hover:text-[var(--brand-primary)] sm:text-base">
                    {route.from} → {route.to}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      {route.distance}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                      {route.time}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[var(--brand-primary)]">
                  From ₹{route.fares.sedan.replace('₹', '')}
                </span>
              </div>
              <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                {route.description}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

