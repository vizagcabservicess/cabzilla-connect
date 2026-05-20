import { MapPin } from 'lucide-react';
import { BRAND_GREEN, POPULAR_ROUTES } from './constants';

const DEMAND_STYLES = {
  high: { label: 'High Demand', bg: '#e6f5ec', color: BRAND_GREEN },
  medium: { label: 'Medium Demand', bg: '#fff7ed', color: '#ea580c' },
  low: { label: 'Low Demand', bg: '#eff6ff', color: '#2563eb' },
} as const;

export function PopularRoutesDemand() {
  return (
    <section className="overflow-x-hidden border-t border-gray-100 bg-gray-50 py-12">
      <div className="mx-auto min-w-0 max-w-[1400px] overflow-x-hidden px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold text-gray-900">Popular Routes</h2>
        <p className="mt-1 text-sm text-gray-500">These routes have active shared rides today</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_ROUTES.map((route) => {
            const demand = DEMAND_STYLES[route.demand];
            return (
              <div
                key={`${route.from}-${route.to}`}
                className="min-w-0 overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_GREEN }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {route.from} → {route.to}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{route.ridesToday} rides today</p>
                  </div>
                </div>
                <span
                  className="mt-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: demand.bg, color: demand.color }}
                >
                  {demand.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
