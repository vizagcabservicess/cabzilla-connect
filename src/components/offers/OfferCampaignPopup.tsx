import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { OfferCampaignOfferType, OfferCampaignPricing, OfferCampaignPublic } from '@/types/offerCampaign';
import {
  OFFER_CAMPAIGN_CATEGORIES,
  OFFER_CATEGORY_LABELS,
  formatOfferTravelDateRange,
  isOfferCampaignCategory,
} from '@/types/offerCampaign';
import { offerCampaignAPI } from '@/services/api/offerCampaignAPI';
import { ArrowRight, Check, Clock3, Copy, Sparkles } from 'lucide-react';

const SESSION_KEY_PREFIX = 'oc_popup_seen_';
export const HOME_PENDING_OFFER_KEY = 'oc_home_pending_offer';

function sessionSeenKey(category: string, campaignId: number): string {
  return `${SESSION_KEY_PREFIX}${category}_${campaignId}`;
}

export function markOfferPopupSeen(category: string, campaignId: number): void {
  try {
    sessionStorage.setItem(sessionSeenKey(category, campaignId), '1');
  } catch {
    /* ignore */
  }
}

export function wasOfferPopupSeen(category: string, campaignId: number): boolean {
  try {
    return sessionStorage.getItem(sessionSeenKey(category, campaignId)) === '1';
  } catch {
    return false;
  }
}

export function saveHomePendingOffer(campaign: OfferCampaignPublic): void {
  try {
    sessionStorage.setItem(
      HOME_PENDING_OFFER_KEY,
      JSON.stringify({
        id: campaign.id,
        category: campaign.category,
        coupon_code: campaign.coupon_code,
      })
    );
  } catch {
    /* ignore */
  }
}

export function readHomePendingOffer(): {
  id: number;
  category: string;
  coupon_code: string;
} | null {
  try {
    const raw = sessionStorage.getItem(HOME_PENDING_OFFER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: number; category?: string; coupon_code?: string };
    if (!parsed?.id || !parsed.category || !parsed.coupon_code) return null;
    return {
      id: parsed.id,
      category: parsed.category,
      coupon_code: parsed.coupon_code,
    };
  } catch {
    return null;
  }
}

export function clearHomePendingOffer(): void {
  try {
    sessionStorage.removeItem(HOME_PENDING_OFFER_KEY);
  } catch {
    /* ignore */
  }
}

function formatCountdown(endsAt: string): string {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function offerHeadline(offerType: OfferCampaignOfferType, offerValue: number): string {
  const value = Math.max(0, Number(offerValue) || 0);
  switch (offerType) {
    case 'flat':
      return `Flat ₹${value.toLocaleString('en-IN')} off`;
    case 'percentage':
      return `${Math.min(100, value)}% off`;
    case 'fixed_fare':
      return `Fixed fare ₹${value.toLocaleString('en-IN')}`;
    default: {
      const _exhaustive: never = offerType;
      return _exhaustive;
    }
  }
}

function offerPrimary(offerType: OfferCampaignOfferType, offerValue: number): string {
  const value = Math.max(0, Number(offerValue) || 0);
  switch (offerType) {
    case 'flat':
      return `₹${value.toLocaleString('en-IN')} OFF`;
    case 'percentage':
      return `${Math.min(100, value)}% OFF`;
    case 'fixed_fare':
      return `₹${value.toLocaleString('en-IN')}`;
    default: {
      const _exhaustive: never = offerType;
      return _exhaustive;
    }
  }
}

function countdownParts(endsAt: string): { h: number; m: number; s: number } {
  const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const totalSec = Math.floor(ms / 1000);
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

/** Client-side fare math when API preview has no website fare yet. */
export function computeOfferPricing(
  campaign: Pick<OfferCampaignPublic, 'offer_type' | 'offer_value'>,
  websiteFare: number
): OfferCampaignPricing {
  const fare = Math.max(0, websiteFare);
  const value = Math.max(0, Number(campaign.offer_value) || 0);
  let offerFare = fare;
  let savings = 0;
  switch (campaign.offer_type) {
    case 'flat':
      savings = Math.min(value, fare);
      offerFare = Math.max(0, fare - savings);
      break;
    case 'percentage': {
      const pct = Math.min(100, value);
      savings = Math.round((fare * pct) / 100);
      offerFare = Math.max(0, fare - savings);
      break;
    }
    case 'fixed_fare':
      offerFare = value;
      savings = Math.max(0, fare - offerFare);
      break;
    default: {
      const _exhaustive: never = campaign.offer_type;
      void _exhaustive;
      break;
    }
  }
  return {
    website_fare: Math.round(fare * 100) / 100,
    offer_fare: Math.round(offerFare * 100) / 100,
    savings: Math.round(savings * 100) / 100,
  };
}

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export function OfferCampaignPopup({
  category,
  websiteFare,
  open,
  campaign,
  onOpenChange,
  onApply,
  onContinueRegular,
  mode = 'search',
}: {
  category: 'airport' | 'local' | string;
  websiteFare: number;
  open: boolean;
  campaign: OfferCampaignPublic | null;
  onOpenChange: (open: boolean) => void;
  onApply: (campaign: OfferCampaignPublic) => void;
  onContinueRegular: () => void;
  /** Homepage: emphasize coupon; search: show fare compare when available. */
  mode?: 'home' | 'search';
}) {
  const [tick, setTick] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !campaign) return;
    markOfferPopupSeen(category, campaign.id);
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [open, campaign, category]);

  const pricing = useMemo(() => {
    if (!campaign) return null;
    if (websiteFare > 0) {
      return computeOfferPricing(campaign, websiteFare);
    }
    if (campaign.pricing && campaign.pricing.website_fare > 0) {
      return campaign.pricing;
    }
    return computeOfferPricing(campaign, 0);
  }, [campaign, websiteFare]);

  if (!campaign || !pricing) return null;

  const hasWebsiteFare = pricing.website_fare > 0;
  const categoryLabel = OFFER_CATEGORY_LABELS[campaign.category] ?? campaign.category;
  const headline = offerHeadline(campaign.offer_type, campaign.offer_value);
  const primary = offerPrimary(campaign.offer_type, campaign.offer_value);
  const travelRange = formatOfferTravelDateRange(
    campaign.travel_date_from,
    campaign.travel_date_to
  );
  const clock = countdownParts(campaign.ends_at);
  void tick;

  const copyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(campaign.coupon_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[calc(100%-1.5rem)] max-h-[calc(100dvh-1.5rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 sm:w-full [&>button]:right-3 [&>button]:top-3 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-white/20 [&>button]:p-1.5 [&>button]:text-white [&>button]:opacity-100">
        <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(145deg,#0f3d2e_0%,#166534_45%,#0f172a_100%)] px-5 pb-5 pt-9 text-white sm:pt-10">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-300">
            — Vizag Taxi Hub —
          </p>
          <DialogTitle className="mt-2 text-center font-serif text-2xl font-bold text-white">
            {campaign.name}
          </DialogTitle>
          <DialogDescription className="mt-1 text-center text-sm text-emerald-50/85">
            {categoryLabel} · {headline}
            {travelRange ? ` · trips ${travelRange}` : ''}
          </DialogDescription>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 rounded-xl border border-dashed border-white/55 bg-white/5 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/75">
                Limited time offer
              </p>
              <p className="mt-0.5 font-serif text-2xl font-bold leading-none text-amber-300">
                {primary}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase text-white/80">
                On {categoryLabel}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center justify-center px-2 py-1">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-100/90">
                <Clock3 className="h-3.5 w-3.5 text-amber-300" />
                Ends in
              </div>
              <div className="mt-1.5 flex items-end gap-1 font-mono text-2xl font-bold tabular-nums text-white">
                <span>{String(clock.m + clock.h * 60).padStart(2, '0')}</span>
                <span className="text-lg text-amber-300">:</span>
                <span>{String(clock.s).padStart(2, '0')}</span>
              </div>
              <div className="mt-0.5 grid w-full grid-cols-2 text-center text-[9px] font-semibold uppercase text-emerald-100/70">
                <span>Min</span>
                <span>Sec</span>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7faf8] px-5 py-4 text-sm">
          {mode === 'search' && hasWebsiteFare ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Website fare</span>
                <span className="line-through text-muted-foreground">
                  ₹{pricing.website_fare.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="mt-1 flex justify-between text-base font-semibold text-emerald-800">
                <span>Offer fare</span>
                <span>₹{pricing.offer_fare.toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-0.5 flex justify-between text-sm text-emerald-700">
                <span>You save</span>
                <span>₹{pricing.savings.toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Use this coupon when you book {categoryLabel.toLowerCase()} trips
              {travelRange ? ` for travel on ${travelRange}` : ''}. Offer applies at checkout.
            </p>
          )}

          <button
            type="button"
            onClick={() => void copyCoupon()}
            className="w-full rounded-xl border-2 border-dashed border-emerald-600/50 bg-emerald-50/80 px-3 py-3 text-center transition-colors hover:bg-emerald-50"
            aria-label={`Copy coupon ${campaign.coupon_code}`}
          >
            <span className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800/80">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Your coupon code
              <Sparkles className="h-3 w-3 text-amber-500" />
            </span>
            <span className="mt-1 block font-mono text-xl font-bold tracking-[0.22em] text-emerald-900">
              {campaign.coupon_code}
            </span>
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Tap to copy
                </>
              )}
            </span>
          </button>

          <div className="space-y-2 pb-1 pt-1">
            <Button
              type="button"
              className="h-11 w-full bg-emerald-800 text-sm font-bold hover:bg-emerald-900"
              onClick={() => {
                void offerCampaignAPI.public.logEvent('click', campaign.id, category);
                const next = {
                  ...campaign,
                  pricing: hasWebsiteFare
                    ? pricing
                    : campaign.pricing ?? computeOfferPricing(campaign, websiteFare),
                };
                onApply(next);
                onOpenChange(false);
              }}
            >
              {mode === 'home' ? 'Book with this offer' : 'Apply offer'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <button
              type="button"
              className="mx-auto block w-full pb-1 text-sm font-medium text-sky-700 underline underline-offset-2"
              onClick={() => {
                onContinueRegular();
                onOpenChange(false);
              }}
            >
              {mode === 'home' ? 'Maybe later' : 'Continue regular fare'}
            </button>
          </div>
          <p className="pb-1 text-center text-[10px] text-slate-400">
            Ends in {formatCountdown(campaign.ends_at)}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Fetch active offer for category; popup once per browser session if enabled. */
export async function loadOfferCampaignForSearch(
  category: string,
  websiteFare: number,
  travelDate?: string | null
): Promise<{
  campaign: OfferCampaignPublic | null;
  shouldShowPopup: boolean;
  grace_window_minutes: number;
}> {
  if (!isOfferCampaignCategory(category)) {
    return { campaign: null, shouldShowPopup: false, grace_window_minutes: 15 };
  }
  try {
    const result = await offerCampaignAPI.public.getActiveOffer(
      category,
      websiteFare,
      travelDate
    );
    let campaign = result.campaign;
    // Legacy fallback: bare "outstation" campaign for one-way lookups
    if (!campaign && category === 'outstation_one_way') {
      const legacy = await offerCampaignAPI.public.getActiveOffer(
        'outstation',
        websiteFare,
        travelDate
      );
      campaign = legacy.campaign;
    }
    if (!campaign) {
      return {
        campaign: null,
        shouldShowPopup: false,
        grace_window_minutes: result.grace_window_minutes,
      };
    }
    const seen = wasOfferPopupSeen(category, campaign.id);
    const shouldShowPopup = Boolean(campaign.popup_enabled) && !seen;
    return {
      campaign,
      shouldShowPopup,
      grace_window_minutes: result.grace_window_minutes,
    };
  } catch {
    return { campaign: null, shouldShowPopup: false, grace_window_minutes: 15 };
  }
}

const HOME_POPUP_SEEN_KEY = 'oc_popup_seen_home_all';

export function wasHomeOfferPopupSeen(): boolean {
  try {
    return sessionStorage.getItem(HOME_POPUP_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markHomeOfferPopupSeen(): void {
  try {
    sessionStorage.setItem(HOME_POPUP_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

function sortHomeCampaigns(campaigns: OfferCampaignPublic[]): OfferCampaignPublic[] {
  return [...campaigns].sort((a, b) => {
    const pr = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
    if (pr !== 0) return pr;
    return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
  });
}

/** Load all active popup-enabled campaigns for the homepage. */
export async function loadHomeOfferCampaigns(): Promise<{
  campaigns: OfferCampaignPublic[];
  shouldShowPopup: boolean;
}> {
  try {
    const results = await Promise.all(
      OFFER_CAMPAIGN_CATEGORIES.map((cat) => offerCampaignAPI.public.getActiveOffer(cat))
    );
    const campaigns = sortHomeCampaigns(
      results
        .map((r) => r.campaign)
        .filter((c): c is OfferCampaignPublic => Boolean(c?.popup_enabled))
    );
    if (campaigns.length === 0) {
      return { campaigns: [], shouldShowPopup: false };
    }
    return { campaigns, shouldShowPopup: !wasHomeOfferPopupSeen() };
  } catch {
    return { campaigns: [], shouldShowPopup: false };
  }
}

/** @deprecated Use loadHomeOfferCampaigns */
export async function loadHomeOfferCampaign(): Promise<{
  campaign: OfferCampaignPublic | null;
  shouldShowPopup: boolean;
}> {
  const result = await loadHomeOfferCampaigns();
  return {
    campaign: result.campaigns[0] ?? null,
    shouldShowPopup: result.shouldShowPopup,
  };
}
