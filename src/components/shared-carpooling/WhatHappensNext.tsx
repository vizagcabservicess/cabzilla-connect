import { Bell, Car, ClipboardList, Users } from 'lucide-react';
import { BRAND_GREEN } from './constants';

const STEPS = [
  { Icon: ClipboardList, title: 'We review your request', desc: 'Our team will check your route & time' },
  { Icon: Users, title: 'We match with others', desc: 'If we find others on your route, we create a ride' },
  { Icon: Bell, title: 'You get notified', desc: "We'll notify you on WhatsApp as soon as a ride is available" },
  { Icon: Car, title: 'Book & Travel', desc: 'Confirm your seat and enjoy your ride' },
] as const;

export function WhatHappensNext() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-12">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-xl font-bold text-gray-900">What happens next?</h2>
        <div className="relative mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-8 hidden h-px border-t-2 border-dashed border-gray-300 lg:block" aria-hidden />
          {STEPS.map(({ Icon, title, desc }) => (
            <div key={title} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md">
                <Icon className="h-6 w-6" style={{ color: BRAND_GREEN }} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-gray-900">{title}</h3>
              <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
