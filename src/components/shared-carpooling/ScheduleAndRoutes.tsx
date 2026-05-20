import { ArrowLeftRight } from 'lucide-react';
import { BRAND_GREEN, POPULAR_ROUTES, SCHEDULE_STOPS } from './constants';

export function ScheduleAndRoutes() {
  return (
    <section className="mx-auto grid min-w-0 max-w-[1400px] gap-6 overflow-x-hidden px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
      {/* Daily Pickup Schedule */}
      <div id="schedule" className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-gray-900">Daily Pickup Schedule</h2>
        <p className="mt-1 text-sm text-gray-500">Morning shift · NAD to IT SEZ corridor</p>

        <div className="mt-5 -mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-0 table-fixed text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
                <th className="w-[34%] pb-3 pr-2">Stop</th>
                <th className="w-[38%] pb-3 pr-2">Area</th>
                <th className="w-[28%] pb-3 text-right">
                  <span className="sm:hidden">ETA</span>
                  <span className="hidden sm:inline">ETA (Morning)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {SCHEDULE_STOPS.map((row) => (
                <tr key={row.stop} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-2 font-medium text-gray-800">{row.stop}</td>
                  <td className="py-2.5 pr-2 text-gray-500">{row.area}</td>
                  <td className="py-2.5 text-right font-semibold whitespace-nowrap" style={{ color: BRAND_GREEN }}>
                    {row.eta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <a
          href="#schedule"
          className="mt-4 inline-block text-sm font-semibold hover:underline"
          style={{ color: BRAND_GREEN }}
        >
          View Full Schedule →
        </a>
      </div>

      {/* Popular Routes */}
      <div id="routes" className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <h2 className="min-w-0 truncate text-xl font-bold text-gray-900">Popular Routes</h2>
          <a href="#routes" className="shrink-0 text-sm font-semibold hover:underline" style={{ color: BRAND_GREEN }}>
            View all
          </a>
        </div>

        <ul className="mt-5 space-y-3">
          {POPULAR_ROUTES.map((route) => (
            <li
              key={`${route.from}-${route.to}`}
              className="flex min-w-0 items-center rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-3 sm:px-4"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#e6f5ec' }}
                >
                  <ArrowLeftRight className="h-4 w-4" style={{ color: BRAND_GREEN }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {route.from} → {route.to}
                  </p>
                  <p className="text-xs text-gray-500">{route.ridesToday} rides today</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
