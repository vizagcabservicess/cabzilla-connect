import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  BadgePercent,
  Check,
  Copy,
  Loader2,
  Plane,
  MapPin,
  Car,
  Route,
  ArrowRight,
  CalendarDays,
  Clock3,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { offerCampaignAPI } from '@/services/api/offerCampaignAPI';
import { applyHomeOfferBookingPrefill } from '@/lib/applyHomeOfferBookingPrefill';
import type { OfferCampaignCategory, OfferCampaignPublic } from '@/types/offerCampaign';
import {
  OFFER_CAMPAIGN_CATEGORIES,
  OFFER_CATEGORY_LABELS,
  formatOfferTravelDateRange,
  formatOfferTravelTimeFrom,
  formatOfferRouteScope,
} from '@/types/offerCampaign';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { resetPageScroll } from '@/lib/bookingWidgetScroll';

type FilterKey = 'all' | OfferCampaignCategory;

function offerHeadline(campaign: OfferCampaignPublic): string {
  const value = Math.max(0, Number(campaign.offer_value) || 0);
  switch (campaign.offer_type) {
    case 'flat':
      return `Flat ₹${value.toLocaleString('en-IN')} off`;
    case 'percentage':
      return `${Math.min(100, value)}% off`;
    case 'fixed_fare':
      return `Fixed fare ₹${value.toLocaleString('en-IN')}`;
    default: {
      const _exhaustive: never = campaign.offer_type;
      return _exhaustive;
    }
  }
}

function categoryIcon(category: string) {
  if (category === 'airport') return Plane;
  if (category === 'tour') return MapPin;
  if (category === 'outstation_round_trip') return Route;
  if (category.startsWith('outstation')) return Car;
  return MapPin;
}

function formatCountdown(endsAt: string): string {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export default function OffersPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<OfferCampaignPublic[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await offerCampaignAPI.public.listActiveOffers();
      setCampaigns(result.campaigns);
    } catch {
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resetPageScroll();
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return campaigns;
    return campaigns.filter((c) => c.category === filter);
  }, [campaigns, filter]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All offers' },
    ...OFFER_CAMPAIGN_CATEGORIES.map((cat) => ({
      key: cat as FilterKey,
      label: OFFER_CATEGORY_LABELS[cat] || cat,
    })),
  ];

  const copyCoupon = async (c: OfferCampaignPublic) => {
    try {
      await navigator.clipboard.writeText(c.coupon_code);
      setCopiedId(c.id);
      window.setTimeout(() => setCopiedId(null), 2000);
      void offerCampaignAPI.public.logEvent('copy', c.id, c.category);
      toast({
        title: 'Coupon copied',
        description: c.coupon_code,
        duration: 2500,
      });
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Select the code and copy manually.',
        variant: 'destructive',
      });
    }
  };

  const bookWithOffer = (c: OfferCampaignPublic) => {
    applyHomeOfferBookingPrefill(c, navigate);
    toast({
      title: 'Coupon ready',
      description: `${c.coupon_code} is saved. Review pickup, drop, and time — you can edit drop if you want${
        formatOfferRouteScope(c) ? ` (${formatOfferRouteScope(c)})` : ''
      }.`,
      duration: 3500,
    });
  };

  return (
    <>
      <Helmet>
        <title>Offers & Coupons - Vizag Taxi Hub | Airport, Local, Outstation & Tour Deals</title>
        <meta
          name="description"
          content="Live taxi offers in Visakhapatnam — Airport, Local, Outstation and Tour coupons from Vizag Taxi Hub. Copy your code and book for eligible travel dates."
        />
        <meta
          name="keywords"
          content="vizag taxi offers, airport taxi coupon, outstation taxi deals, local cab offers visakhapatnam"
        />
        <link rel="canonical" href="https://vizagtaxihub.com/offers" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/offers" />
        <meta property="og:title" content="Offers & Coupons - Vizag Taxi Hub" />
        <meta
          property="og:description"
          content="Live taxi offers for Airport, Local, Outstation and Tour trips in Visakhapatnam."
        />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="home-soft-page flex min-h-screen flex-col bg-[linear-gradient(180deg,#eef5ff_0%,#f7faff_28%,#ffffff_100%)]">
        <Navbar />
        <main className="flex-1">
          {/* Hero */}
          <section className="relative overflow-hidden px-4 pb-8 pt-8 md:px-6 md:pb-12 md:pt-12">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-blue-400/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 top-24 h-48 w-48 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="relative mx-auto max-w-5xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-blue-700 shadow-sm">
                <BadgePercent className="h-3.5 w-3.5" />
                Live offers · Vizag Taxi Hub
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Offers that make every trip{' '}
                <span className="text-blue-600">lighter on the pocket.</span>
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 md:text-base">
                Copy a coupon, pick your travel date, and book Airport, Local, Outstation or Tour
                rides. Offers apply only for the travel dates shown on each card.
              </p>
            </div>
          </section>

          {/* Filters + list */}
          <section className="px-4 pb-16 md:px-6">
            <div className="mx-auto max-w-5xl">
              <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                      filter === f.key
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                  <BadgePercent className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-800">No live offers right now</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Check back soon, or book at regular fare from the home page.
                  </p>
                  <Button asChild className="mt-5 bg-blue-600 hover:bg-blue-700">
                    <Link to="/">
                      Book a cab <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filtered.map((c) => {
                    const Icon = categoryIcon(c.category);
                    const travelRange = formatOfferTravelDateRange(
                      c.travel_date_from,
                      c.travel_date_to
                    );
                    const travelTimeFrom = formatOfferTravelTimeFrom(
                      c.travel_time_from,
                      c.travel_time_to
                    );
                    const route = formatOfferRouteScope(c);
                    const headline = offerHeadline(c);
                    return (
                      <article
                        key={c.id}
                        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]"
                      >
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-700 to-slate-800 px-4 py-3 text-white">
                          <Icon className="h-4 w-4 shrink-0 opacity-90" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                              {OFFER_CATEGORY_LABELS[c.category] || c.category}
                            </p>
                            <p className="truncate text-sm font-semibold">{c.name}</p>
                          </div>
                          <Badge className="ml-auto shrink-0 bg-white/15 text-[10px] text-white hover:bg-white/20">
                            {formatCountdown(c.ends_at)}
                          </Badge>
                        </div>
                        <div className="space-y-3 p-4">
                          <p className="text-sm font-semibold text-slate-900">{headline}</p>
                          {route ? (
                            <p className="flex items-start gap-1.5 text-[11px] text-slate-600">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                              Valid only on {route}
                            </p>
                          ) : null}
                          {travelRange ? (
                            <p className="flex items-start gap-1.5 text-[11px] text-slate-600">
                              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                              Valid for trips on {travelRange}
                            </p>
                          ) : (
                            <p className="text-[11px] text-slate-500">Valid for any travel date</p>
                          )}
                          {travelTimeFrom ? (
                            <p className="flex items-start gap-1.5 text-[11px] text-slate-600">
                              <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                              Pickups {travelTimeFrom}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void copyCoupon(c)}
                            className="flex w-full items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:bg-slate-100"
                          >
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Coupon code
                              </p>
                              <p className="font-mono text-base font-bold tracking-widest text-blue-800">
                                {c.coupon_code}
                              </p>
                            </div>
                            {copiedId === c.id ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => void copyCoupon(c)}
                            >
                              Copy code
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="flex-1 bg-blue-600 text-xs hover:bg-blue-700"
                              onClick={() => bookWithOffer(c)}
                            >
                              Book with offer
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <div className="mt-10 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-6 text-center md:px-8">
                <p className="text-sm font-semibold text-slate-900">Ready to ride?</p>
                <p className="mt-1 text-xs text-slate-600">
                  Apply your coupon on the booking summary for Airport &amp; Local — and matching
                  categories for Outstation &amp; Tour.
                </p>
                <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                  <Link to="/">
                    Go to booking <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
}
