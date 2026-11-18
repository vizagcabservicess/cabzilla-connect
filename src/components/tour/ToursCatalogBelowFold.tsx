import { ArrowRight, Headphones, Shield, Star, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CTA_IMAGE = 'https://vizagtaxihub.com/uploads/footer-tours-banner.jpg';

const REVIEWS = [
  {
    name: 'Priya Sharma',
    place: 'Delhi',
    text: 'Excellent service! Our Araku trip was well planned and the driver was very professional. Highly recommended!',
  },
  {
    name: 'Rohit Mehta',
    place: 'Bangalore',
    text: 'Clean vehicle, polite driver and amazing experience. Vizag Taxi Hub made our family trip hassle-free.',
  },
  {
    name: 'Anita Reddy',
    place: 'Hyderabad',
    text: 'Lambasingi trip was wonderful! Everything was well organised and the support team was very good.',
  },
];

type ToursCatalogBelowFoldProps = {
  onPlanTrip: () => void;
};

/** Same stats / reviews / CTA as before — split only so /tours first paint is lighter. */
export function ToursCatalogBelowFold({ onPlanTrip }: ToursCatalogBelowFoldProps) {
  return (
    <>
      <section className="pb-10">
        <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
          {[
            {
              value: '10,000+',
              label: 'Happy Travelers',
              Icon: Users,
              tone: 'bg-violet-100 text-violet-600',
            },
            {
              value: '10+ Years',
              label: 'Local Experience',
              Icon: Trophy,
              tone: 'bg-amber-100 text-amber-500',
            },
            {
              value: '24/7',
              label: 'Travel Support',
              Icon: Headphones,
              tone: 'bg-sky-100 text-sky-600',
            },
            {
              value: 'Verified Drivers',
              label: 'Safe & Professional',
              Icon: Shield,
              tone: 'bg-emerald-100 text-emerald-600',
            },
          ].map(({ value, label, Icon, tone }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm">
              <span className={cn('flex h-11 w-11 items-center justify-center rounded-full', tone)}>
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">{value}</p>
                <p className="text-[12px] text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            What travelers say
          </p>
          <h2 className="mt-1 max-w-md text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
            Trusted by Families, Friends & Explorers
          </h2>
          <p className="mt-1 text-sm text-slate-500">Real journeys. Real stories. Real happiness.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {REVIEWS.map((review) => (
              <article key={review.name} className="rounded-2xl border border-slate-100 bg-[#f8fafc] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                    {review.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{review.name}</p>
                    <p className="text-[11px] text-slate-500">{review.place}</p>
                  </div>
                </div>
                <div className="mb-2 flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-[13px] leading-relaxed text-slate-600">“{review.text}”</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden">
        <img
          src={CTA_IMAGE}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-14 md:flex-row md:items-end md:px-6 md:py-16">
          <div className="max-w-xl">
            <h2 className="text-2xl font-extrabold tracking-[-0.02em] text-white md:text-[1.85rem]">
              Your Next Adventure Awaits
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              Plan your perfect trip with Vizag Taxi Hub. Custom itineraries, best prices, and
              unforgettable experiences across Andhra Pradesh.
            </p>
            <Button
              type="button"
              className="mt-5 rounded-lg bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700"
              onClick={onPlanTrip}
            >
              Plan My Trip
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <p className="font-script text-[2rem] leading-tight text-white/95">
            Good Trips
            <br />
            Create
            <br />
            Great Stories
          </p>
        </div>
      </section>
    </>
  );
}
