import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plane, MapPin, Car, Route, IndianRupee, Info } from 'lucide-react';
import { toast } from 'sonner';
import { offerCampaignAPI } from '@/services/api/offerCampaignAPI';
import type { OfferCampaignForParticipant, OfferCampaignOfferType } from '@/types/offerCampaign';
import { OFFER_CATEGORY_LABELS } from '@/types/offerCampaign';
import type { SmartBudgetVendor } from '@/types/smartBudget';

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function formatOfferDiscount(
  offerType?: OfferCampaignOfferType | string,
  offerValue?: number
): string | null {
  if (offerType == null || offerValue == null || Number.isNaN(Number(offerValue))) return null;
  const value = Math.max(0, Number(offerValue));
  switch (offerType) {
    case 'flat':
      return `₹${value.toLocaleString('en-IN')} off customer fare`;
    case 'percentage':
      return `${Math.min(100, value)}% off customer fare`;
    case 'fixed_fare':
      return `Customer pays fixed ₹${value.toLocaleString('en-IN')}`;
    default:
      return null;
  }
}

function payoutCopy(c: OfferCampaignForParticipant): {
  title: string;
  body: string;
  tone: 'company' | 'owner';
} {
  const discount = formatOfferDiscount(c.offer_type, c.offer_value);
  if (c.absorb_attached === 'company') {
    return {
      title: 'Your payout: full trip fare',
      body: discount
        ? `Company covers the customer discount (${discount}). You still receive the normal website fare for the trip.`
        : 'Company covers the customer discount. You still receive the normal website fare for the trip.',
      tone: 'company',
    };
  }
  return {
    title: 'Your payout: reduced by the discount',
    body: discount
      ? `You absorb the customer discount (${discount}). Your settlement is website fare minus that discount.`
      : 'You absorb the customer discount. Your settlement is website fare minus the discount.',
    tone: 'owner',
  };
}

/**
 * Attached-fleet campaign cards.
 * No coupon code. Clear payout / absorb messaging so vendors know what they earn.
 */
export function VendorCampaignsSection({ vendor }: { vendor: SmartBudgetVendor | null }) {
  const [campaigns, setCampaigns] = useState<OfferCampaignForParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await offerCampaignAPI.vendor.listEligible();
      setCampaigns(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const join = async (c: OfferCampaignForParticipant) => {
    const payout = payoutCopy(c);
    if (!window.confirm(`${payout.title}\n\n${payout.body}\n\nJoin this campaign?`)) return;

    setActingId(c.id);
    try {
      await offerCampaignAPI.vendor.join({
        campaign_id: c.id,
        vehicle_status: 'available',
        vehicle_number: vendor?.primary_vehicle_number || undefined,
        vehicle_type: vendor?.primary_vehicle_type || undefined,
        participant_label: vendor?.name || undefined,
      });
      toast.success('Joined campaign');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Join failed');
    } finally {
      setActingId(null);
    }
  };

  const leave = async (c: OfferCampaignForParticipant) => {
    setActingId(c.id);
    try {
      await offerCampaignAPI.vendor.leave(c.id);
      toast.success('Left campaign');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Leave failed');
    } finally {
      setActingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Campaigns</h2>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Join to get campaign bookings when Available. Each card shows who pays the discount and
          your payout. Exact trip amounts appear under My Bookings / Earnings.
        </p>
      </div>
      {campaigns.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No active campaigns for your fleet right now.
          </CardContent>
        </Card>
      ) : (
        campaigns.map((c) => {
          const joined = c.participation?.status === 'joined';
          const payout = payoutCopy(c);
          const Icon =
            c.category === 'airport'
              ? Plane
              : c.category === 'tour'
                ? MapPin
                : c.category === 'outstation_round_trip'
                  ? Route
                  : c.category.startsWith('outstation')
                    ? Car
                    : MapPin;
          return (
            <Card key={c.id} className="shadow-none overflow-hidden">
              <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-800 to-slate-800 px-4 py-2.5 text-white">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] uppercase tracking-wide opacity-80">
                    {OFFER_CATEGORY_LABELS[c.category] || c.category}
                  </p>
                  <p className="truncate text-xs font-medium">{c.name}</p>
                </div>
              </div>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-sm flex flex-wrap items-center gap-2 font-medium">
                  {joined ? (
                    <Badge className="text-[10px]">Joined</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Not joined
                    </Badge>
                  )}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {formatCountdown(c.seconds_left)}
                  </span>
                </CardTitle>
                <div
                  className={
                    payout.tone === 'company'
                      ? 'mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] leading-snug text-emerald-950'
                      : 'mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-950'
                  }
                >
                  <p className="flex items-center gap-1 font-medium">
                    <IndianRupee className="h-3 w-3 shrink-0" />
                    {payout.title}
                  </p>
                  <p className="mt-0.5 opacity-90">{payout.body}</p>
                  <p className="mt-1 flex items-start gap-1 text-[10px] opacity-75">
                    <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                    Coupon not shown here. Trip amount appears on the booking after a customer
                    books you.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {joined ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={actingId === c.id}
                    onClick={() => void leave(c)}
                  >
                    {actingId === c.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Leave campaign
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-700 text-xs hover:bg-emerald-800"
                    disabled={actingId === c.id}
                    onClick={() => void join(c)}
                  >
                    {actingId === c.id ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Join campaign
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
