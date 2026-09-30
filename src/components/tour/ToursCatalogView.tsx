import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronDown,
  Compass,
  Headphones,
  Landmark,
  MapPin,
  Mountain,
  Palmtree,
  Shield,
  Star,
  Trophy,
  Users,
  Waves,
  X,
} from 'lucide-react';
import '@/lib/fonts-tours';
import { DateTimePicker } from '@/components/DateTimePicker';
import { TourCatalogCard } from '@/components/tour/TourCatalogCard';
import { Button } from '@/components/ui/button';
import { useTourCart } from '@/hooks/useTourCart';
import {
  openTourListPanel,
  unselectTourFromBookingWidget,
} from '@/lib/addTourToBookingWidget';
import { resolveSmartBudgetMediaUrl } from '@/lib/smartBudgetUpload';
import { cn } from '@/lib/utils';
import type { TourListItem } from '@/types/tour';

const HERO_IMAGE = 'https://vizagtaxihub.com/uploads/banner-tours.jpg';
const CTA_IMAGE = 'https://vizagtaxihub.com/uploads/footer-tours-banner.jpg';

const POPULAR_CHIPS = [
  'Araku Valley',
  'Lambasingi',
  'Vizag City Tour',
  'Temple Tours',
  'Maredumilli',
] as const;
type PopularChip = (typeof POPULAR_CHIPS)[number];

type TourCategory = 'hills' | 'temple' | 'nature' | 'city' | 'weekend' | 'custom';

const CATEGORIES: {
  id: TourCategory;
  label: string;
  Icon: typeof Mountain;
  tone: string;
}[] = [
  { id: 'hills', label: 'Hill Stations', Icon: Mountain, tone: 'bg-emerald-100 text-emerald-600' },
  { id: 'temple', label: 'Temple Tours', Icon: Landmark, tone: 'bg-orange-100 text-orange-500' },
  { id: 'nature', label: 'Nature & Waterfalls', Icon: Waves, tone: 'bg-sky-100 text-sky-500' },
  { id: 'city', label: 'City Tours', Icon: Building2, tone: 'bg-violet-100 text-violet-500' },
  { id: 'weekend', label: 'Weekend Getaways', Icon: Palmtree, tone: 'bg-pink-100 text-pink-500' },
  { id: 'custom', label: 'Custom Tours', Icon: Compass, tone: 'bg-amber-100 text-amber-500' },
];

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

type ToursCatalogViewProps = {
  tours: TourListItem[];
  loading: boolean;
};

function matchesChip(tour: TourListItem, selected: PopularChip): boolean {
  const name = `${tour.tourName} ${tour.description}`.toLowerCase();
  switch (selected) {
    case 'Araku Valley':
      return name.includes('araku');
    case 'Lambasingi':
      return name.includes('lambasingi');
    case 'Vizag City Tour':
      return name.includes('city') || name.includes('vizag north') || name.includes('vizag south');
    case 'Temple Tours':
      return name.includes('temple') || name.includes('srikurmam') || name.includes('arasavalli');
    case 'Maredumilli':
      return name.includes('maredumilli') || name.includes('vanajangi');
    default: {
      const _exhaustive: never = selected;
      return _exhaustive;
    }
  }
}

function matchesCategory(tour: TourListItem, selected: TourCategory): boolean {
  const name = `${tour.tourName} ${tour.description}`.toLowerCase();
  switch (selected) {
    case 'hills':
      return name.includes('araku') || name.includes('lambasingi') || name.includes('vanajangi');
    case 'temple':
      return (
        name.includes('temple') ||
        name.includes('srikurmam') ||
        name.includes('arasavalli') ||
        name.includes('annavaram')
      );
    case 'nature':
      return (
        name.includes('borra') ||
        name.includes('waterfall') ||
        name.includes('vanajangi') ||
        name.includes('nature')
      );
    case 'city':
      return name.includes('city') || name.includes('vizag');
    case 'weekend':
      return (tour.days || 0) >= 2;
    case 'custom':
      return true;
    default: {
      const _exhaustive: never = selected;
      return _exhaustive;
    }
  }
}

function destinationBlurb(tour: TourListItem): string {
  const name = tour.tourName.toLowerCase();
  if (name.includes('lambasingi')) return 'The Kashmir of Andhra';
  if (name.includes('borra')) return "Nature's wonder";
  if (name.includes('city')) return 'Beaches, museums & more';
  if (name.includes('annavaram') || name.includes('temple') || name.includes('srikurmam')) {
    return 'Divine destination';
  }
  if (name.includes('maredumilli') || name.includes('vanajangi')) return 'Into the wild';
  if (name.includes('araku')) return 'Serene hills & coffee estates';
  return 'Most loved, handpicked for you';
}

function compactDuration(tour: { days?: number }): string {
  const days = tour.days || 1;
  if (days >= 2) return `${days} Days / ${Math.max(1, days - 1)} Night`;
  return '1 Day';
}

export function ToursCatalogView({ tours, loading }: ToursCatalogViewProps) {
  const { items } = useTourCart();
  const cartCount = items.length;
  const prevCartCount = useRef(cartCount);
  const [query, setQuery] = useState('');
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [chip, setChip] = useState<PopularChip | null>(null);
  const [category, setCategory] = useState<TourCategory | null>(null);
  const [travelDate, setTravelDate] = useState<Date | undefined>(undefined);
  const [showAll, setShowAll] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const packageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!packageOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!packageMenuRef.current?.contains(event.target as Node)) {
        setPackageOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPackageOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [packageOpen]);

  const sortedTours = useMemo(
    () => [...tours].sort((a, b) => a.tourName.localeCompare(b.tourName)),
    [tours]
  );

  const filtered = useMemo(() => {
    if (selectedTourId) {
      return tours.filter((tour) => tour.tourId === selectedTourId);
    }
    const q = query.trim().toLowerCase();
    return tours.filter((tour) => {
      const haystack = `${tour.tourName} ${tour.description}`.toLowerCase();
      const queryOk = !q || haystack.includes(q);
      const chipOk = !chip || matchesChip(tour, chip);
      const categoryOk = !category || matchesCategory(tour, category);
      return queryOk && chipOk && categoryOk;
    });
  }, [tours, query, chip, category, selectedTourId]);

  const visible = showAll ? filtered : filtered.slice(0, 4);
  const hasActiveFilter = Boolean(
    selectedTourId || query.trim() || chip || (category && category !== 'custom')
  );
  const nightsTotal = items.reduce((sum, item) => sum + Math.max(0, (item.days || 1) - 1), 0);
  const daysTotal = items.reduce((sum, item) => sum + (item.days || 1), 0);

  const clearFilters = () => {
    setQuery('');
    setSelectedTourId('');
    setChip(null);
    setCategory(null);
    setShowAll(false);
  };

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setQuery('');
      setSelectedTourId('');
      setChip(null);
      setCategory(null);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  const applySearch = () => {
    setShowAll(true);
    document.getElementById('popular-tour-packages')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const tourListCard =
    items.length > 0 ? (
      <div className="w-full rounded-2xl border border-white/70 bg-white/95 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur md:w-[15.5rem]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Your Tour List</p>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">
            {items.length}
          </span>
        </div>
        <ul className="space-y-2">
          {items.slice(0, 3).map((item) => (
            <li key={item.tourId} className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                {item.imageUrl ? (
                  <img
                    src={resolveSmartBudgetMediaUrl(item.imageUrl)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-slate-800">{item.tourName}</p>
                <p className="text-[10px] text-slate-500">{compactDuration(item)}</p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${item.tourName}`}
                className="text-slate-400 hover:text-rose-500"
                onClick={() => unselectTourFromBookingWidget(item)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-slate-500">
          {`${items.length} Destination${items.length === 1 ? '' : 's'} · ${daysTotal} Day${
            daysTotal === 1 ? '' : 's'
          }${nightsTotal > 0 ? ` / ${nightsTotal} Night${nightsTotal === 1 ? '' : 's'}` : ''}`}
        </p>
        <button
          type="button"
          className="mt-2 flex h-9 w-full items-center justify-center rounded-lg bg-blue-600 text-[12px] font-semibold text-white hover:bg-blue-700"
          onClick={() => openTourListPanel()}
        >
          View Tour List
        </button>
      </div>
    ) : null;

  return (
    <div className="tours-catalog bg-[#f4f8fb] antialiased">
      <section className="relative z-20 isolate overflow-x-clip">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-cyan-900/20" />
        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-24 md:px-6 md:pb-12 md:pt-28">
          <div className="flex items-start justify-between gap-6">
            <div className="max-w-2xl">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85">
                Explore · Travel · Create memories
              </p>
              <h1 className="text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-white sm:text-[2.15rem] md:text-[2.5rem]">
                Explore Vizag.
                <span className="mt-1 block text-emerald-400">Discover Andhra.</span>
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/90">
                Curated journeys. Comfortable rides. Unforgettable experiences.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Best Prices', 'Verified Drivers', 'Customizable Tours', '24/7 Support'].map(
                  (label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>
            <div className="relative z-20 hidden shrink-0 lg:block">
              <p className="pointer-events-none absolute -top-[4.75rem] right-0 text-right font-script text-[1.7rem] leading-[1.08] text-white/95">
                Travel
                <br />
                Explore
                <br />
                Experience
                <br />
                Vizag
              </p>
              {tourListCard}
            </div>
          </div>

          <div className="relative z-10 mt-6 rounded-2xl bg-white p-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] md:p-4 lg:mr-[17.5rem]">
            <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
              <div ref={packageMenuRef} className="relative flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                <MapPin className="h-5 w-5 shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500">Tour package</p>
                  <button
                    type="button"
                    disabled={loading}
                    className="flex w-full items-center justify-between gap-2 bg-transparent text-left text-sm font-medium text-slate-900 outline-none disabled:opacity-60"
                    onClick={() => setPackageOpen((open) => !open)}
                  >
                    <span className={cn('truncate', !selectedTourId && 'text-slate-400')}>
                      {loading
                        ? 'Loading packages…'
                        : sortedTours.find((tour) => tour.tourId === selectedTourId)?.tourName ||
                          'Select a tour package'}
                    </span>
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', packageOpen && 'rotate-180')}
                    />
                  </button>
                </div>
                {packageOpen ? (
                  <ul className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                    {sortedTours.map((tour) => (
                      <li key={tour.tourId}>
                        <button
                          type="button"
                          className={cn(
                            'flex w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
                            selectedTourId === tour.tourId
                              ? 'font-semibold text-blue-700'
                              : 'font-medium text-slate-800'
                          )}
                          onClick={() => {
                            setSelectedTourId(tour.tourId);
                            setQuery(tour.tourName);
                            setChip(null);
                            setCategory(null);
                            setPackageOpen(false);
                            applySearch();
                          }}
                        >
                          {tour.tourName}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="rounded-xl bg-slate-50 px-3 py-1">
                <DateTimePicker
                  label="Travel Date"
                  date={travelDate}
                  onDateChange={(date) => {
                    setTravelDate(date);
                    if (!date) return;
                    try {
                      sessionStorage.setItem('pickupDate', JSON.stringify(date));
                    } catch {
                      /* ignore */
                    }
                  }}
                  minDate={new Date()}
                  variant="infield"
                  className="w-full"
                />
              </div>
              <Button
                type="button"
                onClick={applySearch}
                className="h-full min-h-[52px] rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Search Tours
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
              <span className="text-[11px] font-semibold text-slate-500">Popular Searches:</span>
              {POPULAR_CHIPS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={cn(
                    'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                    chip === item
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  )}
                  onClick={() => {
                    setChip((current) => (current === item ? null : item));
                    setQuery('');
                    setSelectedTourId('');
                    setCategory(null);
                    applySearch();
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 lg:hidden">{tourListCard}</div>
        </div>
      </section>

      <section className="border-b border-slate-100 bg-white py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:px-6 lg:grid-cols-6">
          {CATEGORIES.map(({ id, label, Icon, tone }) => (
            <button
              key={id}
              type="button"
              className={cn(
                'flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center transition-colors',
                category === id ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
              )}
              onClick={() => {
                setCategory((current) => (current === id ? null : id));
                setChip(null);
                setQuery('');
                setSelectedTourId('');
                applySearch();
              }}
            >
              <span className={cn('flex h-14 w-14 items-center justify-center rounded-full', tone)}>
                <Icon className="h-6 w-6" strokeWidth={2.25} />
              </span>
              <span className="text-[12px] font-semibold leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Explore Vizag & beyond
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
                Trending Destinations
              </h2>
              <p className="mt-1 text-sm text-slate-500">Most searched. Most loved. Handpicked for you.</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-800"
              onClick={applySearch}
            >
              View All Destinations →
            </button>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
            {(loading ? [] : tours.slice(0, 6)).map((tour) => (
              <button
                key={tour.tourId}
                type="button"
                className="w-[170px] shrink-0 text-left md:w-auto"
                onClick={() => {
                  setQuery(tour.tourName);
                  setSelectedTourId(tour.tourId);
                  setChip(null);
                  applySearch();
                }}
              >
                <div className="h-36 overflow-hidden rounded-2xl bg-slate-200 shadow-sm">
                  {tour.imageUrl ? (
                    <img src={tour.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <p className="mt-2 truncate text-[13px] font-bold text-slate-900">{tour.tourName}</p>
                <p className="truncate text-[11px] text-slate-500">{destinationBlurb(tour)}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="popular-tour-packages" className="pb-12">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Handpicked for you
              </p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
                Popular Tour Packages
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">
                Explore our most loved tours with detailed itineraries and transparent pricing.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {hasActiveFilter ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-blue-700"
                  onClick={clearFilters}
                >
                  <X className="h-3.5 w-3.5" />
                  Clear Filter
                </button>
              ) : null}
              <button
                type="button"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                onClick={() => setShowAll(true)}
              >
                View All Packages →
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-80 animate-pulse rounded-2xl bg-white shadow-sm" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl bg-white py-16 text-center shadow-sm">
              <p className="text-base font-semibold text-slate-800">No tours match that search</p>
              <button type="button" className="mt-3 text-sm font-semibold text-blue-600" onClick={clearFilters}>
                Show all packages
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {visible.map((tour) => (
                <TourCatalogCard key={tour.tourId} tour={tour} />
              ))}
            </div>
          )}
        </div>
      </section>

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
        <img src={CTA_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
              onClick={applySearch}
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
    </div>
  );
}
