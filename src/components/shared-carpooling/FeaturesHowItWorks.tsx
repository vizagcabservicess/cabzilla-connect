import {
  BookOpen,
  IndianRupee,
  MousePointerClick,
  Search,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { BRAND_GREEN, FOOTER_BG } from './constants';

const FEATURES = [
  { Icon: IndianRupee, label: 'Save Money' },
  { Icon: ShieldCheck, label: 'Verified Drivers' },
  { Icon: ShieldCheck, label: 'Safe & Reliable' },
  { Icon: Ticket, label: 'Monthly Pass' },
  { Icon: BookOpen, label: 'Student Friendly' },
] as const;

const STEPS = [
  { Icon: Search, title: 'Search', description: 'Find your route & time' },
  { Icon: MousePointerClick, title: 'Choose Ride', description: 'Select a ride with available seats' },
  { Icon: Ticket, title: 'Book Seat', description: 'Confirm your seat on WhatsApp' },
  { Icon: Users, title: 'Travel Together', description: 'Reach on time, save daily' },
] as const;

export function FeaturesHowItWorks() {
  return (
    <section className="bg-gray-50 py-12">
      {/* Features bar */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {FEATURES.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Icon className="h-5 w-5" style={{ color: BRAND_GREEN }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div id="how-it-works" className="mx-auto mt-12 max-w-[1400px] scroll-mt-24 px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-gray-900">How It Works</h2>
        <p className="mt-2 text-center text-sm text-gray-500">
          Book your shared ride in 4 simple steps
        </p>

        <div className="relative mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Dotted connector line (desktop) */}
          <div
            className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden h-px border-t-2 border-dashed border-gray-300 lg:block"
            aria-hidden
          />

          {STEPS.map(({ Icon, title, description }, idx) => (
            <div key={title} className="relative flex flex-col items-center text-center">
              <div
                className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md"
              >
                <Icon className="h-7 w-7" style={{ color: BRAND_GREEN }} />
                <span
                  className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: FOOTER_BG }}
                >
                  {idx + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-gray-900">{title}</h3>
              <p className="mt-1 max-w-[180px] text-sm text-gray-500">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
