import { useMemo, useState } from 'react';
import { BadgePercent, Check, Loader2, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { OfferCampaignPublic } from '@/types/offerCampaign';
import {
  isOfferCampaignCategory,
  isOfferTravelDateEligible,
  isOfferTravelTimeEligible,
  toOfferTravelDateYmd,
  toOfferTravelTimeHm,
  formatOfferRouteScope,
  normalizeOfferTargetId,
  isOfferRouteEligible,
  isOfferSelectionEligible,
  offerCouponNotValidForTripMessage,
  offerCouponNotValidForSelectionMessage,
  type OfferTripRoute,
} from '@/types/offerCampaign';
import { computeOfferPricing } from '@/components/offers/OfferCampaignPopup';
import { offerCampaignAPI } from '@/services/api/offerCampaignAPI';

/**
 * Always-visible coupon entry for Airport / Local booking (Zomato-style).
 * Shows suggested APPLY when a campaign is loaded; input is always available.
 */
export function BookingCouponSection({
  category,
  websiteFare,
  suggestedCampaign,
  applied,
  appliedCampaign,
  onApply,
  onRemove,
  travelDate,
  vehicleId,
  tourId,
  tripRoute,
  className = '',
}: {
  category: string;
  websiteFare: number;
  suggestedCampaign: OfferCampaignPublic | null;
  applied: boolean;
  appliedCampaign: OfferCampaignPublic | null;
  onApply: (campaign: OfferCampaignPublic) => void;
  onRemove: () => void;
  /** Trip pickup date — required when campaign has a travel window. */
  travelDate?: Date | string | null;
  /** Selected cab slug/id — required when campaign is vehicle-specific. */
  vehicleId?: string | null;
  /** Selected tour id — required when campaign is tour-specific. */
  tourId?: string | null;
  tripRoute?: OfferTripRoute | null;
  className?: string;
}) {
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const eligible = isOfferCampaignCategory(category);
  const fare = Math.max(0, websiteFare);
  const travelYmd = toOfferTravelDateYmd(travelDate ?? null);
  const travelHm = toOfferTravelTimeHm(travelDate ?? null);
  const vehicleTargetId = normalizeOfferTargetId(vehicleId);
  const tourTargetId = normalizeOfferTargetId(tourId);

  const suggestedPricing = useMemo(() => {
    if (!suggestedCampaign || fare <= 0) return null;
    if (!isOfferTravelDateEligible(suggestedCampaign, travelYmd)) return null;
    if (!isOfferTravelTimeEligible(suggestedCampaign, travelHm, true)) return null;
    if (!isOfferRouteEligible(suggestedCampaign, tripRoute, true)) return null;
    if (!isOfferSelectionEligible(suggestedCampaign, vehicleTargetId, tourTargetId)) return null;
    if (category !== 'tour' && !vehicleTargetId) return null;
    if (category === 'tour' && !tourTargetId) return null;
    return computeOfferPricing(suggestedCampaign, fare);
  }, [suggestedCampaign, fare, travelYmd, travelHm, tripRoute, vehicleTargetId, tourTargetId, category]);

  if (!eligible) return null;

  const resolveAndApply = async (raw: string) => {
    const code = raw.trim().toUpperCase();
    setError(null);
    if (!code) {
      setError('Enter a coupon code');
      return;
    }
    if (fare <= 0) {
      setError('Fare is still loading — try Apply again in a moment');
      return;
    }
    if (category !== 'tour' && !vehicleTargetId) {
      setError('Select a vehicle to apply this coupon');
      return;
    }
    if (category === 'tour' && !tourTargetId) {
      setError('Select a tour to apply this coupon');
      return;
    }
    setApplying(true);
    try {
      let campaign = suggestedCampaign;
      if (!campaign || campaign.coupon_code.toUpperCase() !== code) {
        const looked = await offerCampaignAPI.public.lookupCoupon(
          code,
          fare,
          vehicleTargetId,
          tourTargetId
        );
        if (!looked.campaign || !looked.live) {
          setError('Invalid or expired coupon for this trip');
          return;
        }
        campaign = looked.campaign;
      }
      if (!isOfferTravelDateEligible(campaign, travelYmd) || !isOfferTravelTimeEligible(campaign, travelHm, true)) {
        setError(offerCouponNotValidForTripMessage(campaign));
        return;
      }
      if (!isOfferRouteEligible(campaign, tripRoute, true)) {
        const route = formatOfferRouteScope(campaign);
        setError(
          route
            ? `This offer is only valid from ${route}`
            : 'This offer is only valid for the campaign pickup and destination'
        );
        return;
      }
      if (!isOfferSelectionEligible(campaign, vehicleTargetId, tourTargetId)) {
        setError(offerCouponNotValidForSelectionMessage(campaign.category));
        return;
      }
      const preview = await offerCampaignAPI.public.previewFare(
        category,
        fare,
        travelYmd,
        vehicleTargetId,
        tourTargetId,
        tripRoute,
        travelHm
      );
      if (!preview.campaign || preview.campaign.id !== campaign.id) {
        setError(offerCouponNotValidForSelectionMessage(campaign.category));
        return;
      }
      const pricing =
        preview.pricing && preview.pricing.website_fare > 0
          ? preview.pricing
          : computeOfferPricing(campaign, fare);
      if (pricing.savings <= 0 && campaign.offer_type !== 'fixed_fare') {
        setError('This coupon does not reduce the current fare');
        return;
      }
      onApply({ ...campaign, pricing });
      void offerCampaignAPI.public.logEvent('apply', campaign.id, campaign.category);
      setManualCode('');
    } catch {
      setError('Could not verify coupon. Try again.');
    } finally {
      setApplying(false);
    }
  };

  if (applied && appliedCampaign) {
    return (
      <div
        id="booking-coupon"
        className={`flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 ${className}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
            <Check className="h-3.5 w-3.5" />
          </div>
          <p className="truncate text-sm font-semibold text-emerald-900">
            Coupon &apos;{appliedCampaign.coupon_code}&apos; applied
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-xs font-semibold text-emerald-800 underline-offset-2 hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }

  const hasSuggestion =
    Boolean(suggestedCampaign && suggestedPricing && suggestedPricing.savings > 0);
  const suggestedRoute = suggestedCampaign
    ? formatOfferRouteScope(suggestedCampaign)
    : null;

  return (
    <div id="booking-coupon" className={`space-y-2 ${className}`}>
      {hasSuggestion && suggestedCampaign && suggestedPricing && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <BadgePercent className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Save ₹{suggestedPricing.savings.toLocaleString('en-IN')} with &apos;
                {suggestedCampaign.coupon_code}&apos;
              </p>
              <p className="text-xs text-slate-500">{suggestedCampaign.name}</p>
              {suggestedRoute ? (
                <p className="text-[11px] text-slate-500">Valid only on {suggestedRoute}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={applying}
              className="shrink-0 font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => void resolveAndApply(suggestedCampaign.coupon_code)}
            >
              APPLY
            </Button>
          </div>
        </div>
      )}

      {/* Always-visible enter field */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="mb-2 text-xs font-semibold text-slate-700">Have a coupon code?</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void resolveAndApply(manualCode);
                }
              }}
              placeholder="Enter coupon code"
              className="h-10 border-slate-300 bg-white pl-8 font-mono uppercase tracking-wide"
              autoCapitalize="characters"
              disabled={applying}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-10 min-w-[4.5rem] bg-rose-600 hover:bg-rose-700"
            disabled={applying}
            onClick={() => void resolveAndApply(manualCode)}
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>
        {error && (
          <p className="mt-1.5 flex items-start gap-1 text-xs leading-snug text-red-600">
            <X className="mt-0.5 h-3 w-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/** Sticky strip above mobile Book Now — like Zomato unlock bar. */
export function BookingOfferStickyBanner({
  campaign,
  websiteFare,
  applied,
  onApply,
  onFocusCoupon,
}: {
  campaign: OfferCampaignPublic | null;
  websiteFare: number;
  applied: boolean;
  onApply: (campaign: OfferCampaignPublic) => void;
  onFocusCoupon?: () => void;
}) {
  if (applied || websiteFare <= 0) return null;

  if (campaign) {
    const pricing = computeOfferPricing(campaign, websiteFare);
    if (pricing.savings > 0) {
      return (
        <button
          type="button"
          onClick={() => onApply({ ...campaign, pricing })}
          className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-left shadow-sm"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white ring-2 ring-sky-200">
            <BadgePercent className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-sky-900">
              Unlock ₹{pricing.savings.toLocaleString('en-IN')} OFF
            </p>
            <p className="text-xs text-sky-800/80">
              Tap to apply &apos;{campaign.coupon_code}&apos;
            </p>
          </div>
          <span className="text-xs font-bold text-sky-700">APPLY</span>
        </button>
      );
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        onFocusCoupon?.();
        document.getElementById('booking-coupon')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }}
      className="mb-2 flex w-full items-center gap-2.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-left shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white ring-2 ring-sky-200">
        <BadgePercent className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-sky-900">Have a coupon code?</p>
        <p className="text-xs text-sky-800/80">Tap to enter &amp; apply your offer</p>
      </div>
      <span className="text-xs font-bold text-sky-700">ENTER</span>
    </button>
  );
}
