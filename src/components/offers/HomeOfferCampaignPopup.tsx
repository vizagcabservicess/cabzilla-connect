import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { OfferCampaignOfferType, OfferCampaignPublic } from '@/types/offerCampaign';
import { OFFER_CATEGORY_LABELS } from '@/types/offerCampaign';
import {
  loadHomeOfferCampaigns,
  markHomeOfferPopupSeen,
  markOfferPopupSeen,
  saveHomePendingOffer,
} from '@/components/offers/OfferCampaignPopup';
import { offerCampaignAPI } from '@/services/api/offerCampaignAPI';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Building2,
  Car,
  Clock3,
  Copy,
  Check,
  Headphones,
  Map,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
} from 'lucide-react';

const OPEN_DELAY_MS = 700;

function countdownParts(endsAt: string): { h: number; m: number; s: number } {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const totalSec = Math.floor(ms / 1000);
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

function parseYmd(ymd: string): Date | null {
  const d = new Date(ymd.includes('T') ? ymd : `${ymd}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayOrdinal(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (k >= 11 && k <= 13) return `${day}th`;
  if (j === 1) return `${day}st`;
  if (j === 2) return `${day}nd`;
  if (j === 3) return `${day}rd`;
  return `${day}th`;
}

/** Three-line travel window for the offer badge (beside % off). */
function travelDateLines(
  from?: string | null,
  to?: string | null
): { label: string; days: string; monthYear: string } | null {
  if (!from && !to) return null;
  const start = parseYmd(from || to || '');
  const end = parseYmd(to || from || '');
  if (!start || !end) return null;

  const startDay = start.getDate();
  const endDay = end.getDate();
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const monthYear = start.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  if (from && to && from === to) {
    return {
      label: 'Travel Dates',
      days: dayOrdinal(startDay),
      monthYear,
    };
  }

  if (sameMonth) {
    return {
      label: 'Travel Dates',
      days: `${dayOrdinal(startDay)} – ${dayOrdinal(endDay)}`,
      monthYear,
    };
  }

  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return {
    label: 'Travel Dates',
    days: `${startLabel} – ${endLabel}`,
    monthYear: String(end.getFullYear()),
  };
}

function offerDisplay(
  offerType: OfferCampaignOfferType,
  offerValue: number,
  categoryLabel: string
): { primary: string; secondary: string } {
  const value = Math.max(0, Number(offerValue) || 0);
  switch (offerType) {
    case 'flat':
      return {
        primary: `₹${value.toLocaleString('en-IN')} OFF`,
        secondary: `ON ${categoryLabel.toUpperCase()}`,
      };
    case 'percentage':
      return {
        primary: `${Math.min(100, value)}% OFF`,
        secondary: `ON ${categoryLabel.toUpperCase()}`,
      };
    case 'fixed_fare':
      return {
        primary: `₹${value.toLocaleString('en-IN')}`,
        secondary: `FIXED ${categoryLabel.toUpperCase()} FARE`,
      };
    default: {
      const _exhaustive: never = offerType;
      return _exhaustive;
    }
  }
}

function categoryIcon(category: string) {
  switch (category) {
    case 'airport':
      return Plane;
    case 'local':
      return Building2;
    case 'tour':
      return Map;
    case 'outstation_one_way':
    case 'outstation_round_trip':
    case 'outstation':
      return Car;
    default:
      return Tag;
  }
}

/**
 * Homepage offers dialog — lists every active category campaign (not only Airport).
 * Typographic promo layout (no vehicle imagery).
 */
export function HomeOfferCampaignPopup({ enabled = true }: { enabled?: boolean }) {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<OfferCampaignPublic[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: number | undefined;

    void (async () => {
      const result = await loadHomeOfferCampaigns();
      if (cancelled || !result.shouldShowPopup || result.campaigns.length === 0) return;
      setCampaigns(result.campaigns);
      setSelectedId(result.campaigns[0].id);
      timer = window.setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, OPEN_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabled]);

  useEffect(() => {
    if (!open || campaigns.length === 0) return;
    markHomeOfferPopupSeen();
    for (const c of campaigns) {
      markOfferPopupSeen(c.category, c.id);
      void offerCampaignAPI.public.logEvent('popup_view', c.id, c.category);
    }
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [open, campaigns]);

  const selected = campaigns.find((c) => c.id === selectedId) ?? campaigns[0];
  const categoryLabel = selected
    ? OFFER_CATEGORY_LABELS[selected.category] ?? selected.category
    : '';
  const offer = selected
    ? offerDisplay(selected.offer_type, selected.offer_value, categoryLabel)
    : { primary: '', secondary: '' };
  const travelLines = selected
    ? travelDateLines(selected.travel_date_from, selected.travel_date_to)
    : null;
  const clock = selected ? countdownParts(selected.ends_at) : { h: 0, m: 0, s: 0 };
  const CategoryIcon = selected ? categoryIcon(selected.category) : Tag;

  const trustItems = useMemo(
    () => [
      { icon: ShieldCheck, title: 'No hidden charges', sub: 'Transparent pricing' },
      { icon: Tag, title: 'Best price guarantee', sub: 'Get the best deals' },
      { icon: Headphones, title: '24/7 support', sub: "We're here to help" },
    ],
    []
  );

  if (!enabled || campaigns.length === 0 || !selected) return null;

  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(selected.coupon_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const applySelected = () => {
    void offerCampaignAPI.public.logEvent('click', selected.id, selected.category);
    saveHomePendingOffer(selected);
    toast({
      title: 'Coupon ready',
      description: `${selected.coupon_code} saved for your next ${categoryLabel.toLowerCase()} booking.`,
      duration: 4000,
    });
    setOpen(false);
    window.setTimeout(() => {
      document
        .querySelector('[data-booking-widget], #booking-widget, .hero-booking')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) markHomeOfferPopupSeen();
        setOpen(next);
      }}
    >
      <DialogContent
        className={cn(
          'home-offer-popup flex w-[calc(100%-1.25rem)] max-w-md flex-col gap-0 overflow-hidden rounded-xl border-0 p-0 shadow-2xl',
          'max-h-[calc(100dvh-1rem)] sm:w-full',
          '[&>button]:right-2.5 [&>button]:top-2.5 [&>button]:z-20',
          '[&>button]:rounded-full [&>button]:bg-white/20 [&>button]:p-1',
          '[&>button]:text-white [&>button]:opacity-100 [&>button]:hover:bg-white/30'
        )}
      >
        <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(145deg,#0f3d2e_0%,#166534_48%,#0f172a_100%)] px-3.5 pb-3 pt-8 text-white sm:px-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 18% 10%, #fbbf24 0%, transparent 42%), radial-gradient(circle at 90% 20%, #34d399 0%, transparent 38%)',
            }}
          />
          <div className="relative">
            <p className="text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-amber-300">
              — Vizag Taxi Hub —
            </p>
            <DialogTitle className="mt-1 flex items-center justify-center gap-1.5 text-center font-serif text-[1.2rem] font-bold leading-tight text-white sm:text-[1.35rem]">
              <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
              <span>
                Today&apos;s <span className="text-amber-300">Exclusive</span> Offers
              </span>
              <Sparkles className="h-3 w-3 shrink-0 text-amber-300" />
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-center text-[11px] text-emerald-50/80">
              Limited time deals on your favorite rides
            </DialogDescription>

            <div className="mt-2.5 flex items-center gap-2">
              <div className="w-fit rounded-lg border border-dashed border-white/50 bg-white/5 px-2.5 py-2">
                <div className="flex items-start gap-0">
                  <div className="shrink-0 pr-2.5 text-left leading-tight">
                    <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/70">
                      Limited time offer
                    </p>
                    <p className="mt-0.5 text-xl font-bold leading-none tracking-tight text-amber-300 sm:text-2xl">
                      {offer.primary}
                    </p>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-white/75">
                      {offer.secondary}
                    </p>
                  </div>
                  {travelLines && (
                    <>
                      <div
                        className="w-px shrink-0 self-stretch border-l border-dashed border-white/45"
                        aria-hidden
                      />
                      <div className="shrink-0 pl-2.5 text-left leading-tight">
                        <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/70">
                          {travelLines.label}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold leading-none text-amber-200">
                          {travelLines.days}
                        </p>
                        <p className="mt-1 text-[10px] font-medium text-amber-100/90">
                          {travelLines.monthYear}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="ml-auto flex shrink-0 flex-col items-center justify-center px-1">
                <div className="flex items-center gap-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-emerald-100/85">
                  <Clock3 className="h-3 w-3 text-amber-300" />
                  Offer ends in
                </div>
                <div className="mt-1 flex items-end gap-0.5 font-mono text-xl font-bold tabular-nums leading-none text-white sm:text-2xl">
                  {clock.h > 0 && (
                    <>
                      <span>{String(clock.h).padStart(2, '0')}</span>
                      <span className="pb-px text-sm text-amber-300">:</span>
                    </>
                  )}
                  <span>{String(clock.m).padStart(2, '0')}</span>
                  <span className="pb-px text-sm text-amber-300">:</span>
                  <span>{String(clock.s).padStart(2, '0')}</span>
                </div>
                <div
                  className={cn(
                    'mt-0.5 grid w-full text-center text-[7px] font-semibold uppercase tracking-wider text-emerald-100/65',
                    clock.h > 0 ? 'grid-cols-3' : 'grid-cols-2'
                  )}
                >
                  {clock.h > 0 && <span>Hrs</span>}
                  <span>Min</span>
                  <span>Sec</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-white px-3.5 py-2.5 sm:px-4">
          {campaigns.length > 1 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <div className="h-px flex-1 bg-slate-200" />
                <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Choose a category
                </p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="flex justify-center gap-1.5 overflow-x-auto">
                {campaigns.map((c) => {
                  const label = OFFER_CATEGORY_LABELS[c.category] ?? c.category;
                  const active = c.id === selected.id;
                  const Icon = categoryIcon(c.category);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(c.id);
                        setCopied(false);
                      }}
                      className={cn(
                        'flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all',
                        active
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-3 w-3',
                          active ? 'text-emerald-700' : 'text-slate-400'
                        )}
                      />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-lg bg-emerald-50/90 p-2 sm:p-2.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <CategoryIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{selected.name}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-emerald-700">
                    {categoryLabel} · {offer.primary.toLowerCase()}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    Use this coupon when you book {categoryLabel.toLowerCase()} trips. Applies at
                    checkout.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void copyCoupon()}
                className="w-full shrink-0 rounded-md border border-dashed border-emerald-600/60 bg-white px-2 py-1.5 text-center transition-colors hover:bg-emerald-50/50 sm:w-[10rem]"
                aria-label={`Copy coupon ${selected.coupon_code}`}
              >
                <span className="flex items-center justify-center gap-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-emerald-800/80">
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                  Your coupon code
                  <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                </span>
                <span className="mt-0.5 block font-mono text-base font-bold tracking-[0.14em] text-emerald-900">
                  {selected.coupon_code}
                </span>
                <span className="mt-0.5 inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700">
                  {copied ? (
                    <>
                      <Check className="h-2.5 w-2.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-2.5 w-2.5" /> Tap to copy
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 border-y border-slate-100 py-1.5">
            {trustItems.map((item) => (
              <div key={item.title} className="text-center">
                <item.icon className="mx-auto h-3.5 w-3.5 text-emerald-700" />
                <p className="mt-0.5 text-[9px] font-bold leading-tight text-slate-800">
                  {item.title}
                </p>
                <p className="text-[8px] text-slate-500">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Button
              type="button"
              className="h-9 w-full bg-emerald-800 text-xs font-bold tracking-wide hover:bg-emerald-900"
              onClick={applySelected}
            >
              Apply coupon &amp; book now
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              className="mx-auto block text-[11px] font-medium text-sky-700 underline underline-offset-2"
              onClick={() => setOpen(false)}
            >
              Maybe later
            </button>
          </div>
        </div>

        {/* Footer — matches reference: stars rating + claimed tag */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-emerald-100 bg-emerald-50 px-3 py-2 sm:px-3.5">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[9px] font-medium text-emerald-900/85">
              <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-700" />
              <span className="truncate">Trusted by 5,000+ travelers in Vizag</span>
            </p>
            <div className="mt-0.5 flex items-center gap-1 pl-4">
              <div className="flex items-center gap-px" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-2.5 w-2.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <span className="text-[9px] font-semibold text-slate-600">4.9/5 Rating</span>
            </div>
          </div>
          <p className="flex shrink-0 items-center gap-1 text-[9px] font-medium text-emerald-800">
            <Tag className="h-3 w-3 text-emerald-700" />
            48 people claimed this offer today
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
