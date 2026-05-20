import { Bell, Car, IndianRupee, Users } from 'lucide-react';
import { BRAND_GREEN } from './constants';

const HIGHLIGHTS = [
  { Icon: Users, text: "We'll match you with riders on your route" },
  { Icon: Bell, text: "You'll get notified when a ride is available" },
  { Icon: Car, text: 'Safe, reliable & verified rides always' },
  { Icon: IndianRupee, text: 'Affordable rides that fit your budget' },
] as const;

export function NoRidesHero() {
  return (
    <section className="border-b border-gray-100 bg-white">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-12">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            No Shared Rides Available Right Now 😔
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-600 sm:text-base">
            We couldn&apos;t find any rides matching your route and preferences right now — but
            don&apos;t worry! Post your commute request and we&apos;ll notify you as soon as a matching
            ride becomes available.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map(({ Icon, text }) => (
              <div key={text} className="flex items-start gap-2.5">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#e6f5ec' }}
                >
                  <Icon className="h-4 w-4" style={{ color: BRAND_GREEN }} />
                </div>
                <p className="text-xs leading-snug text-gray-700 sm:text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-sm">
            <div
              className="flex aspect-[4/3] items-end justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-6"
            >
              <img
                src="https://vizagtaxihub.com/uploads/toyota-glanza-vizagtaxihub.png"
                alt="Searching for rides"
                className="h-32 w-auto object-contain drop-shadow-lg sm:h-40"
              />
              <div
                className="absolute left-8 top-8 flex h-10 w-10 items-center justify-center rounded-full shadow-md"
                style={{ backgroundColor: BRAND_GREEN }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor" aria-hidden>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <div className="absolute right-10 top-6 flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white/90 shadow-lg">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3-3" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
