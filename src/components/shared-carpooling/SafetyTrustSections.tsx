import { CreditCard, MapPin, ShieldCheck, Siren } from 'lucide-react';
import { BRAND_GREEN, BRAND_GREEN_LIGHT } from './constants';

const SAFETY_ITEMS = [
  { Icon: ShieldCheck, title: 'Verified Drivers', desc: 'Background-checked & rated' },
  { Icon: MapPin, title: 'Live Tracking', desc: 'Share trip with family' },
  { Icon: Siren, title: 'SOS Support', desc: '24/7 emergency helpline' },
  { Icon: CreditCard, title: 'Secure Payments', desc: 'Pay only after ride' },
] as const;

const TRUST_STATS = [
  { value: '10K+', label: 'Happy Commuters' },
  { value: '500+', label: 'Daily Shared Rides' },
  { value: '95%', label: 'On-time Rides' },
  { value: '4.8/5', label: 'Customer Rating' },
] as const;

export function SafetyTrustSections() {
  return (
    <>
      <section style={{ backgroundColor: BRAND_GREEN_LIGHT }} className="py-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-bold text-gray-900">Your Safety, Our Priority</h2>
          <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {SAFETY_ITEMS.map(({ Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                  <Icon className="h-6 w-6" style={{ color: BRAND_GREEN }} />
                </div>
                <p className="mt-3 text-sm font-bold text-gray-900">{title}</p>
                <p className="mt-1 text-xs text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-bold text-gray-900">
            Why thousands trust Vizag Taxi Hub?
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-6 lg:grid-cols-4">
            {TRUST_STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold" style={{ color: BRAND_GREEN }}>
                  {value}
                </p>
                <p className="mt-1 text-sm text-gray-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
