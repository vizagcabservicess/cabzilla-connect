import { useCallback, useEffect, useState, type FormEvent } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Megaphone, Plus, RefreshCw, Rocket, Ban, Pencil, Pause, Play } from 'lucide-react';
import { LocationInput } from '@/components/LocationInput';
import GoogleMapComponent from '@/components/GoogleMapComponent';
import type { Location } from '@/lib/locationData';
import { offerCampaignAPI } from '@/services/api/offerCampaignAPI';
import { vehicleAPI } from '@/services/api/vehicleAPI';
import { tourManagementAPI } from '@/services/api/tourManagementAPI';
import type { Vehicle } from '@/types/vehicle';
import type { TourData } from '@/types/api';
import {
  OFFER_CAMPAIGN_CATEGORIES,
  OFFER_CAMPAIGN_TYPE_LABELS,
  OFFER_CATEGORY_LABELS,
  formatOfferTravelDateRange,
  formatOfferTravelTimeFrom,
  formatOfferRouteScope,
  campaignShowsRoute,
  type CreateOfferCampaignInput,
  type OfferCampaign,
  type OfferCampaignCategory,
  type OfferCampaignDashboard,
  type OfferCampaignParticipant,
  type OfferCampaignOfferType,
  type OfferCampaignPriority,
  type OfferCampaignType,
  type OfferAbsorbBy,
} from '@/types/offerCampaign';

const CAMPAIGN_TYPES = Object.keys(OFFER_CAMPAIGN_TYPE_LABELS) as OfferCampaignType[];

function statusBadge(status: string) {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    scheduled: 'outline',
    draft: 'secondary',
    paused: 'outline',
    expired: 'secondary',
    cancelled: 'destructive',
  };
  return (
    <Badge
      variant={map[status] || 'secondary'}
      className={status === 'paused' ? 'capitalize border-amber-400 text-amber-800' : 'capitalize'}
    >
      {status}
    </Badge>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse API datetime into datetime-local value. */
function apiDateToLocalInput(value: string): string {
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return toLocalInputValue(new Date());
  return toLocalInputValue(d);
}

function campaignToForm(c: OfferCampaign): CreateOfferCampaignInput {
  const category: OfferCampaignCategory =
    c.category === 'outstation' ? 'outstation_one_way' : c.category;
  return {
    name: c.name,
    campaign_type: c.campaign_type as OfferCampaignType,
    category,
    offer_type: c.offer_type,
    offer_value: c.offer_value,
    coupon_mode: 'manual',
    coupon_code: c.coupon_code,
    eligible_own_fleet: c.eligible_own_fleet,
    eligible_attached_fleet: c.eligible_attached_fleet,
    absorb_own: c.absorb_own === 'owner' ? 'owner' : 'company',
    absorb_attached: c.absorb_attached === 'owner' ? 'owner' : 'company',
    starts_at: apiDateToLocalInput(c.starts_at),
    ends_at: apiDateToLocalInput(c.ends_at),
    travel_date_from: c.travel_date_from ? c.travel_date_from.slice(0, 10) : '',
    travel_date_to: c.travel_date_to ? c.travel_date_to.slice(0, 10) : '',
    travel_time_from: c.travel_time_from ? c.travel_time_from.slice(0, 5) : '',
    travel_time_to: c.travel_time_to ? c.travel_time_to.slice(0, 5) : '',
    max_redemptions: c.max_redemptions,
    max_per_customer: c.max_per_customer,
    popup_enabled: c.popup_enabled,
    priority: c.priority,
    publish: false,
    target_vehicle_ids: c.target_vehicle_ids ?? [],
    target_tour_ids: c.target_tour_ids ?? [],
    pickup_location: c.pickup_location ?? '',
    drop_location: c.drop_location ?? '',
    pickup_lat: c.pickup_lat ?? null,
    pickup_lng: c.pickup_lng ?? null,
    drop_lat: c.drop_lat ?? null,
    drop_lng: c.drop_lng ?? null,
  };
}

function emptyForm(): CreateOfferCampaignInput {
  const start = new Date();
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return {
    name: '',
    campaign_type: 'flash_sale',
    category: 'airport',
    offer_type: 'flat',
    offer_value: 200,
    coupon_mode: 'auto',
    coupon_code: '',
    eligible_own_fleet: true,
    eligible_attached_fleet: true,
    absorb_own: 'company',
    absorb_attached: 'company',
    starts_at: toLocalInputValue(start),
    ends_at: toLocalInputValue(end),
    travel_date_from: '',
    travel_date_to: '',
    travel_time_from: '',
    travel_time_to: '',
    max_redemptions: null,
    max_per_customer: 1,
    popup_enabled: true,
    priority: 'high',
    publish: true,
    target_vehicle_ids: [],
    target_tour_ids: [],
    pickup_location: '',
    drop_location: '',
    pickup_lat: null,
    pickup_lng: null,
    drop_lat: null,
    drop_lng: null,
  };
}

function campaignPlaceToLocation(
  name?: string | null,
  lat?: number | null,
  lng?: number | null
): Location | undefined {
  const n = (name || '').trim();
  if (!n) return undefined;
  return {
    id: n,
    name: n,
    address: n,
    city: '',
    state: '',
    lat: typeof lat === 'number' ? lat : 0,
    lng: typeof lng === 'number' ? lng : 0,
    type: 'other',
    popularityScore: 50,
  };
}

function hasOfferMapCoords(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

export default function OfferCampaignsAdminPage() {
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<OfferCampaignDashboard | null>(null);
  const [campaigns, setCampaigns] = useState<OfferCampaign[]>([]);
  const [history, setHistory] = useState<OfferCampaign[]>([]);
  const [participants, setParticipants] = useState<OfferCampaignParticipant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateOfferCampaignInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [graceMins, setGraceMins] = useState(15);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingCoupon, setEditingCoupon] = useState('');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tours, setTours] = useState<TourData[]>([]);

  const loadDashboard = useCallback(async () => {
    const data = await offerCampaignAPI.admin.dashboard();
    setDashboard(data);
  }, []);

  const loadCampaigns = useCallback(async () => {
    const list = await offerCampaignAPI.admin.listCampaigns();
    setCampaigns(list);
  }, []);

  const loadHistory = useCallback(async () => {
    const list = await offerCampaignAPI.admin.listHistory();
    setHistory(list);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDashboard(), loadCampaigns(), loadHistory()]);
      const settings = await offerCampaignAPI.admin.getSettings();
      setGraceMins(settings.grace_window_minutes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [loadDashboard, loadCampaigns, loadHistory]);

  useEffect(() => {
    void loadAll();
    void vehicleAPI.getVehicles().then((res) => setVehicles(res.vehicles || []));
    void tourManagementAPI.getTours().then(setTours).catch(() => setTours([]));
  }, [loadAll]);

  const loadParticipants = async (campaignId: number) => {
    setSelectedId(campaignId);
    try {
      const list = await offerCampaignAPI.admin.listParticipants(campaignId);
      setParticipants(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load participants');
    }
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setEditingCoupon('');
    setForm(emptyForm());
  };

  const openCreate = () => {
    setEditingId(null);
    setEditingCoupon('');
    setForm(emptyForm());
    setShowCreate(true);
    setTab('campaigns');
  };

  const openEdit = (c: OfferCampaign) => {
    if (c.status === 'cancelled') {
      toast.error('Cannot edit a cancelled campaign');
      return;
    }
    setEditingId(c.id);
    setEditingCoupon(c.coupon_code);
    setForm(campaignToForm(c));
    setShowCreate(true);
    setTab('campaigns');
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Campaign name required');
      return;
    }
    setSaving(true);
    try {
      const startsAt = form.starts_at.replace('T', ' ') + ':00';
      const endsAt = form.ends_at.replace('T', ' ') + ':00';
      const travelFrom = form.travel_date_from?.trim() || null;
      const travelTo = form.travel_date_to?.trim() || null;
      const travelTimeFrom = form.travel_time_from?.trim() || null;
      const travelTimeTo = form.travel_time_to?.trim() || null;
      const pickupLocation = campaignShowsRoute(form.category)
        ? form.pickup_location?.trim() || null
        : null;
      const dropLocation = campaignShowsRoute(form.category)
        ? form.drop_location?.trim() || null
        : null;
      const pickupLat = campaignShowsRoute(form.category) ? form.pickup_lat ?? null : null;
      const pickupLng = campaignShowsRoute(form.category) ? form.pickup_lng ?? null : null;
      const dropLat = campaignShowsRoute(form.category) ? form.drop_lat ?? null : null;
      const dropLng = campaignShowsRoute(form.category) ? form.drop_lng ?? null : null;
      if (campaignShowsRoute(form.category)) {
        if (!pickupLocation || !dropLocation) {
          toast.error('Select pickup and destination from Google Maps');
          setSaving(false);
          return;
        }
        if (!hasOfferMapCoords(pickupLat, pickupLng) || !hasOfferMapCoords(dropLat, dropLng)) {
          toast.error('Choose each place from the Google Maps suggestions list');
          setSaving(false);
          return;
        }
      }
      if (travelFrom && travelTo && travelTo < travelFrom) {
        toast.error('Travel end date must be on or after travel start date');
        setSaving(false);
        return;
      }
      if (travelTimeFrom && travelTimeTo && travelTimeTo < travelTimeFrom) {
        toast.error('End pickup time must be at or after earliest pickup time');
        setSaving(false);
        return;
      }

      if (editingId) {
        await offerCampaignAPI.admin.updateCampaign({
          campaign_id: editingId,
          name: form.name.trim(),
          campaign_type: form.campaign_type,
          category: form.category,
          offer_type: form.offer_type,
          offer_value: form.offer_value,
          eligible_own_fleet: form.eligible_own_fleet,
          eligible_attached_fleet: form.eligible_attached_fleet,
          absorb_own: form.absorb_own,
          absorb_attached: form.absorb_attached,
          starts_at: startsAt,
          ends_at: endsAt,
          travel_date_from: travelFrom,
          travel_date_to: travelTo,
          travel_time_from: travelTimeFrom,
          travel_time_to: travelTimeTo,
          pickup_location: pickupLocation,
          drop_location: dropLocation,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          drop_lat: dropLat,
          drop_lng: dropLng,
          max_redemptions: form.max_redemptions || null,
          max_per_customer: form.max_per_customer,
          popup_enabled: form.popup_enabled,
          priority: form.priority,
          target_vehicle_ids: form.target_vehicle_ids ?? [],
          target_tour_ids: form.target_tour_ids ?? [],
        });
        toast.success(
          campaigns.find((c) => c.id === editingId)?.status === 'expired' &&
            new Date(endsAt.replace(' ', 'T')).getTime() > Date.now()
            ? 'Campaign updated and live again'
            : 'Campaign updated'
        );
      } else {
        const created = await offerCampaignAPI.admin.createCampaign({
          ...form,
          starts_at: startsAt,
          ends_at: endsAt,
          travel_date_from: travelFrom,
          travel_date_to: travelTo,
          travel_time_from: travelTimeFrom,
          travel_time_to: travelTimeTo,
          pickup_location: pickupLocation,
          drop_location: dropLocation,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          drop_lat: dropLat,
          drop_lng: dropLng,
          max_redemptions: form.max_redemptions || null,
        });
        toast.success(
          created.status === 'active'
            ? 'Campaign published (previous active in this category auto-expired)'
            : 'Campaign saved'
        );
      }
      closeForm();
      await loadAll();
      setTab('campaigns');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : editingId ? 'Update failed' : 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const publish = async (id: number) => {
    try {
      await offerCampaignAPI.admin.publishCampaign(id);
      toast.success('Live on the website — popup can show now');
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed');
    }
  };

  const pause = async (id: number) => {
    try {
      await offerCampaignAPI.admin.pauseCampaign(id);
      toast.success('Campaign paused — hidden from website & vendors');
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Pause failed');
    }
  };

  const resume = async (id: number) => {
    try {
      await offerCampaignAPI.admin.resumeCampaign(id);
      toast.success('Campaign resumed');
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resume failed');
    }
  };

  const cancel = async (id: number) => {
    try {
      await offerCampaignAPI.admin.cancelCampaign(id);
      toast.success('Cancelled');
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    }
  };

  const saveSettings = async () => {
    try {
      const s = await offerCampaignAPI.admin.updateSettings(graceMins);
      setGraceMins(s.grace_window_minutes);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <AdminLayout activeTab="campaigns">
      <div className="space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-700" />
              Campaign Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Airport, Local, Tour, Outstation — category-wide or vehicle/tour-specific campaigns.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadAll()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Refresh</span>
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800"
              onClick={openCreate}
            >
              <Plus className="mr-1 h-4 w-4" />
              New campaign
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4 mt-4">
            {dashboard && (
              <>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ['Active', dashboard.totals.active_campaigns],
                    ['Vehicles', dashboard.totals.participating_vehicles],
                    ['Bookings', dashboard.totals.campaign_bookings],
                    ['Revenue', `₹${dashboard.totals.campaign_revenue.toLocaleString('en-IN')}`],
                    ['Conversion', `${dashboard.totals.conversion_rate}%`],
                  ].map(([label, value]) => (
                    <Card key={String(label)} className="shadow-none">
                      <CardContent className="p-3">
                        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
                        <p className="text-lg font-semibold">{value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {dashboard.category_cards.map((card) => (
                    <Card key={card.category} className="shadow-none overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-800 to-slate-800 px-4 py-3 text-white">
                        <p className="text-xs uppercase tracking-wide opacity-80">
                          {OFFER_CATEGORY_LABELS[card.category] || card.category}
                        </p>
                        <p className="font-semibold">
                          {card.campaign?.name || 'No active campaign'}
                        </p>
                      </div>
                      <CardContent className="p-4 text-sm space-y-1">
                        {card.campaign ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status</span>
                              {statusBadge(card.campaign.status)}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Vehicles</span>
                              <span>{card.campaign.participating_vehicles ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Bookings</span>
                              <span>{card.campaign.bookings ?? 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Revenue</span>
                              <span>
                                ₹{(card.campaign.revenue ?? 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground pt-1">
                              Coupon {card.campaign.coupon_code} · ends{' '}
                              {new Date(card.campaign.ends_at).toLocaleString()}
                            </p>
                            {formatOfferRouteScope(card.campaign) ? (
                              <p className="text-[11px] text-sky-800">
                                {formatOfferRouteScope(card.campaign)}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-muted-foreground text-xs">
                            Publish a campaign in Campaigns tab to go live.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="campaigns" className="space-y-4 mt-4">
            {showCreate && (
              <Card className="shadow-none border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-base">
                    {editingId ? 'Edit campaign' : 'Create campaign'}
                  </CardTitle>
                  <CardDescription>
                    {editingId
                      ? campaigns.find((c) => c.id === editingId)?.status === 'expired'
                        ? 'Extend Offer live until to put this campaign back on the website. Coupon code stays the same.'
                        : 'Coupon code cannot be changed after create. Category can be updated — publishing still allows only one active campaign per category.'
                      : 'Publishing auto-deactivates any other active campaign in the same category. Discount absorb-by is required for Own and Attached fleets.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => void handleCreate(e)} className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Campaign name *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Airport Flash Sale"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <select
                        className="flex h-9 w-full rounded-md border px-3 text-sm"
                        value={form.campaign_type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            campaign_type: e.target.value as OfferCampaignType,
                          }))
                        }
                      >
                        {CAMPAIGN_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {OFFER_CAMPAIGN_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Category</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
                        value={form.category}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            category: e.target.value as OfferCampaignCategory,
                          }))
                        }
                      >
                        {OFFER_CAMPAIGN_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {OFFER_CATEGORY_LABELS[cat]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Offer type</Label>
                      <select
                        className="flex h-9 w-full rounded-md border px-3 text-sm"
                        value={form.offer_type}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            offer_type: e.target.value as OfferCampaignOfferType,
                          }))
                        }
                      >
                        <option value="flat">Flat discount (₹)</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed_fare">Fixed fare (₹)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>Offer value</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.offer_value}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, offer_value: Number(e.target.value) || 0 }))
                        }
                      />
                    </div>
                    {editingId ? (
                      <div className="space-y-1 sm:col-span-2">
                        <Label>Coupon code</Label>
                        <Input className="font-mono uppercase" value={editingCoupon} readOnly disabled />
                        <p className="text-[11px] text-muted-foreground">
                          Coupon cannot be changed on an existing campaign.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <Label>Coupon</Label>
                          <select
                            className="flex h-9 w-full rounded-md border px-3 text-sm"
                            value={form.coupon_mode}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                coupon_mode: e.target.value as 'auto' | 'manual',
                              }))
                            }
                          >
                            <option value="auto">Auto generate</option>
                            <option value="manual">Manual</option>
                          </select>
                        </div>
                        {form.coupon_mode === 'manual' && (
                          <div className="space-y-1">
                            <Label>Coupon code</Label>
                            <Input
                              className="uppercase"
                              value={form.coupon_code}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  coupon_code: e.target.value.toUpperCase(),
                                }))
                              }
                            />
                          </div>
                        )}
                      </>
                    )}
                    {campaignShowsRoute(form.category) && (
                      <div className="space-y-1 sm:col-span-2 rounded-md border border-sky-200 bg-sky-50/50 p-3">
                        <p className="text-xs font-medium text-sky-900">Pickup to destination</p>
                        <p className="text-[11px] text-muted-foreground mb-2">
                          Search and select both places from Google Maps. If destination is
                          Visakhapatnam, the coupon applies to every drop in the city (35 km). Pickup
                          still must match (for example the airport).
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <LocationInput
                            id="oc-campaign-pickup"
                            label="Pickup location"
                            placeholder="Search pickup on Google Maps"
                            variant="desktop"
                            tripType="outstation"
                            location={campaignPlaceToLocation(
                              form.pickup_location,
                              form.pickup_lat,
                              form.pickup_lng
                            )}
                            onLocationChange={(loc) => {
                              const name = (loc.name || loc.address || '').trim();
                              const ok = hasOfferMapCoords(loc.lat, loc.lng);
                              setForm((f) => ({
                                ...f,
                                pickup_location: name,
                                pickup_lat: ok ? loc.lat : null,
                                pickup_lng: ok ? loc.lng : null,
                              }));
                            }}
                          />
                          <LocationInput
                            id="oc-campaign-drop"
                            label="Destination location"
                            placeholder="Search destination on Google Maps"
                            variant="desktop"
                            tripType="outstation"
                            location={campaignPlaceToLocation(
                              form.drop_location,
                              form.drop_lat,
                              form.drop_lng
                            )}
                            onLocationChange={(loc) => {
                              const name = (loc.name || loc.address || '').trim();
                              const ok = hasOfferMapCoords(loc.lat, loc.lng);
                              setForm((f) => ({
                                ...f,
                                drop_location: name,
                                drop_lat: ok ? loc.lat : null,
                                drop_lng: ok ? loc.lng : null,
                              }));
                            }}
                          />
                        </div>
                        {campaignPlaceToLocation(
                          form.pickup_location,
                          form.pickup_lat,
                          form.pickup_lng
                        ) &&
                          campaignPlaceToLocation(
                            form.drop_location,
                            form.drop_lat,
                            form.drop_lng
                          ) &&
                          hasOfferMapCoords(form.pickup_lat, form.pickup_lng) &&
                          hasOfferMapCoords(form.drop_lat, form.drop_lng) && (
                            <div className="mt-3 overflow-hidden rounded-md border bg-white">
                              <GoogleMapComponent
                                pickupLocation={
                                  campaignPlaceToLocation(
                                    form.pickup_location,
                                    form.pickup_lat,
                                    form.pickup_lng
                                  )!
                                }
                                dropLocation={
                                  campaignPlaceToLocation(
                                    form.drop_location,
                                    form.drop_lat,
                                    form.drop_lng
                                  )!
                                }
                                tripType="outstation"
                                mapHeight="220px"
                              />
                            </div>
                          )}
                      </div>
                    )}
                    <div className="space-y-1 sm:col-span-2 rounded-md border border-dashed border-slate-200 bg-slate-50/80 p-3">
                      <p className="text-xs font-medium text-slate-800">When customers can book this offer</p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Live window for the website popup &amp; coupon (usually today / this week).
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Offer live from</Label>
                          <Input
                            type="datetime-local"
                            value={form.starts_at}
                            onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Offer live until</Label>
                          <Input
                            type="datetime-local"
                            value={form.ends_at}
                            onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 sm:col-span-2 rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                      <p className="text-xs font-medium text-emerald-900">
                        Valid travel / trip dates (dull market)
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Coupon applies only when the customer&apos;s pickup date falls in this range.
                        Set earliest and end pickup time if vehicles reach later (e.g. 08:00–20:00 at the airport).
                        Leave dates or time blank for any travel date or time.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label>Travel from</Label>
                          <Input
                            type="date"
                            value={form.travel_date_from || ''}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, travel_date_from: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Travel to</Label>
                          <Input
                            type="date"
                            value={form.travel_date_to || ''}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, travel_date_to: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Earliest pickup time</Label>
                          <Input
                            type="time"
                            value={form.travel_time_from || ''}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, travel_time_from: e.target.value }))
                            }
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Coupon works only if pickup is at or after this time. Leave blank for any
                            start time.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <Label>End pickup time</Label>
                          <Input
                            type="time"
                            value={form.travel_time_to || ''}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, travel_time_to: e.target.value }))
                            }
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Coupon works only if pickup is at or before this time. Leave blank for no
                            end time.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Max redemptions (blank = unlimited)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.max_redemptions ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            max_redemptions: e.target.value ? Number(e.target.value) : null,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Max per customer (phone)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.max_per_customer ?? 1}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            max_per_customer: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Priority</Label>
                      <select
                        className="flex h-9 w-full rounded-md border px-3 text-sm"
                        value={form.priority}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            priority: e.target.value as OfferCampaignPriority,
                          }))
                        }
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50/40 p-3 sm:col-span-2">
                      <p className="text-xs font-medium text-violet-900">Limit to specific vehicles / tours</p>
                      <p className="text-[11px] text-muted-foreground">
                        Leave all unchecked to run on every vehicle or tour in this category. When
                        selected, the coupon only works for those choices.
                      </p>
                      <div className="space-y-2">
                        <Label className="text-xs">Vehicles (optional)</Label>
                        <div className="max-h-36 overflow-y-auto rounded-md border bg-white p-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                          {vehicles.map((v) => {
                            const vid = (v.vehicle_id || v.id).toLowerCase();
                            const checked = (form.target_vehicle_ids ?? []).includes(vid);
                            return (
                              <label key={vid} className="flex items-center gap-2 text-xs py-1 px-1">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setForm((f) => {
                                      const current = f.target_vehicle_ids ?? [];
                                      const next = e.target.checked
                                        ? [...current, vid]
                                        : current.filter((id) => id !== vid);
                                      return { ...f, target_vehicle_ids: next };
                                    });
                                  }}
                                />
                                <span>{v.name}</span>
                              </label>
                            );
                          })}
                          {vehicles.length === 0 && (
                            <p className="text-[11px] text-muted-foreground px-1">No vehicles loaded</p>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Tour packages (optional)</Label>
                        <div className="max-h-36 overflow-y-auto rounded-md border bg-white p-2 grid grid-cols-1 gap-1">
                          {tours.map((t) => {
                            const tid = String(t.tourId || t.id || '').toLowerCase();
                            if (!tid) return null;
                            const checked = (form.target_tour_ids ?? []).includes(tid);
                            return (
                              <label key={tid} className="flex items-center gap-2 text-xs py-1 px-1">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setForm((f) => {
                                      const current = f.target_tour_ids ?? [];
                                      const next = e.target.checked
                                        ? [...current, tid]
                                        : current.filter((id) => id !== tid);
                                      return { ...f, target_tour_ids: next };
                                    });
                                  }}
                                />
                                <span>{t.name || t.tourName || tid}</span>
                              </label>
                            );
                          })}
                          {tours.length === 0 && (
                            <p className="text-[11px] text-muted-foreground px-1">No tours loaded</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2 rounded-md border p-3 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Eligible fleet &amp; who absorbs discount
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.eligible_own_fleet}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, eligible_own_fleet: e.target.checked }))
                            }
                          />
                          Own fleet
                        </label>
                        <div className="space-y-1">
                          <Label className="text-xs">Own fleet discount absorbed by</Label>
                          <select
                            className="flex h-9 w-full rounded-md border px-3 text-sm"
                            value={form.absorb_own}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                absorb_own: e.target.value as OfferAbsorbBy,
                              }))
                            }
                          >
                            <option value="company">Company (default)</option>
                            <option value="owner">Owner</option>
                          </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.eligible_attached_fleet}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                eligible_attached_fleet: e.target.checked,
                              }))
                            }
                          />
                          Attached fleet
                        </label>
                        <div className="space-y-1">
                          <Label className="text-xs">Attached fleet discount absorbed by</Label>
                          <select
                            className="flex h-9 w-full rounded-md border px-3 text-sm"
                            value={form.absorb_attached}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                absorb_attached: e.target.value as OfferAbsorbBy,
                              }))
                            }
                          >
                            <option value="company">Company (default)</option>
                            <option value="owner">Owner (reduces payout)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                      <div>
                        <p className="text-sm font-medium">Enable website popup</p>
                        <p className="text-[11px] text-muted-foreground">
                          Once per browser session when customer searches this category
                        </p>
                      </div>
                      <Switch
                        checked={Boolean(form.popup_enabled)}
                        onCheckedChange={(v) => setForm((f) => ({ ...f, popup_enabled: v }))}
                      />
                    </div>
                    {!editingId && (
                      <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
                        <div>
                          <p className="text-sm font-medium">Publish now</p>
                          <p className="text-[11px] text-muted-foreground">
                            Scheduled if start is in the future; otherwise Active
                          </p>
                        </div>
                        <Switch
                          checked={Boolean(form.publish)}
                          onCheckedChange={(v) => setForm((f) => ({ ...f, publish: v }))}
                        />
                      </div>
                    )}
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="submit" disabled={saving} className="bg-emerald-700 hover:bg-emerald-800">
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : editingId ? (
                          <Pencil className="mr-2 h-4 w-4" />
                        ) : (
                          <Rocket className="mr-2 h-4 w-4" />
                        )}
                        {editingId
                          ? 'Save changes'
                          : form.publish
                            ? 'Publish campaign'
                            : 'Save draft'}
                      </Button>
                      <Button type="button" variant="outline" onClick={closeForm}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No campaigns yet.</p>
              ) : (
                campaigns.map((c) => (
                  <Card key={c.id} className="shadow-none">
                    <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{c.name}</p>
                          {statusBadge(c.status)}
                          <Badge variant="outline">{OFFER_CATEGORY_LABELS[c.category]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {OFFER_CAMPAIGN_TYPE_LABELS[c.campaign_type] || c.campaign_type} ·{' '}
                          {c.offer_type === 'percentage'
                            ? `${c.offer_value}% off`
                            : c.offer_type === 'fixed_fare'
                              ? `Fixed ₹${c.offer_value}`
                              : `Flat ₹${c.offer_value} off`}{' '}
                          · Coupon <span className="font-mono">{c.coupon_code}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(c.starts_at).toLocaleString()} →{' '}
                          {new Date(c.ends_at).toLocaleString()} ·{' '}
                          {(c.target_vehicle_count ?? 0) > 0 || (c.target_tour_count ?? 0) > 0
                            ? `${c.target_vehicle_count ?? 0} targeted vehicles · ${c.target_tour_count ?? 0} targeted tours`
                            : `${c.participating_vehicles ?? 0} vendor vehicles`}{' '}
                          · {c.redemption_count} redemptions
                        </p>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Analytics: {c.popup_close_count ?? 0} closed popup · {c.copy_count ?? 0}{' '}
                          copied code · {c.apply_count ?? 0} applied at booking
                          {(c.popup_view_count ?? 0) > 0
                            ? ` · ${c.popup_view_count} popup views`
                            : ''}
                        </p>
                        {formatOfferRouteScope(c) && (
                          <p className="text-[11px] text-sky-800 mt-0.5">
                            Route: {formatOfferRouteScope(c)}
                          </p>
                        )}
                        {formatOfferTravelDateRange(c.travel_date_from, c.travel_date_to) && (
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Travel dates:{' '}
                            {formatOfferTravelDateRange(c.travel_date_from, c.travel_date_to)}
                          </p>
                        )}
                        {formatOfferTravelTimeFrom(c.travel_time_from, c.travel_time_to) && (
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Pickup time: {formatOfferTravelTimeFrom(c.travel_time_from, c.travel_time_to)}
                          </p>
                        )}
                        {c.status === 'scheduled' && Boolean(c.popup_enabled) && (
                          <p className="text-[11px] text-amber-800 mt-0.5">
                            Website popup starts after this goes Active — click Go live now.
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTab('participants');
                            void loadParticipants(c.id);
                          }}
                        >
                          Participants
                        </Button>
                        {c.status !== 'cancelled' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(c)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                        {(c.status === 'active' || c.status === 'scheduled') && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-amber-300 text-amber-900 hover:bg-amber-50"
                            onClick={() => void pause(c.id)}
                          >
                            <Pause className="mr-1 h-3.5 w-3.5" />
                            Pause
                          </Button>
                        )}
                        {c.status === 'paused' && (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-emerald-700 hover:bg-emerald-800"
                            onClick={() => void resume(c.id)}
                          >
                            <Play className="mr-1 h-3.5 w-3.5" />
                            Resume
                          </Button>
                        )}
                        {c.status !== 'active' &&
                          c.status !== 'paused' &&
                          c.status !== 'cancelled' && (
                            <Button type="button" size="sm" onClick={() => void publish(c.id)}>
                              {c.status === 'scheduled' ? 'Go live now' : 'Publish'}
                            </Button>
                          )}
                        {c.status !== 'cancelled' && c.status !== 'expired' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => void cancel(c.id)}
                          >
                            <Ban className="mr-1 h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Select a campaign from the Campaigns tab, or pick one below.
            </p>
            <div className="flex flex-wrap gap-2">
              {campaigns
                .filter(
                  (c) =>
                    c.status === 'active' || c.status === 'scheduled' || c.status === 'paused'
                )
                .map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    size="sm"
                    variant={selectedId === c.id ? 'default' : 'outline'}
                    onClick={() => void loadParticipants(c.id)}
                  >
                    {c.name}
                  </Button>
                ))}
            </div>
            {selectedId == null ? (
              <p className="text-sm text-muted-foreground py-6">No campaign selected.</p>
            ) : participants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6">No participants yet.</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {p.participant_label || p.vehicle_number || `Participant #${p.id}`}
                      </p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {p.fleet_type} · {p.participation_status} · vehicle {p.vehicle_status}
                        {p.vendor_id ? ` · vendor #${p.vendor_id}` : ''}
                      </p>
                    </div>
                    {p.participation_status === 'joined' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await offerCampaignAPI.admin.removeParticipant(p.id);
                            toast.success('Removed');
                            void loadParticipants(selectedId);
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Remove failed');
                          }
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No history yet.</p>
            ) : (
              history.map((c) => (
                <Card key={c.id} className="shadow-none">
                  <CardContent className="p-3 flex justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {OFFER_CATEGORY_LABELS[c.category]} · {c.coupon_code}
                      </p>
                    </div>
                    {statusBadge(c.status)}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card className="shadow-none max-w-md">
              <CardHeader>
                <CardTitle className="text-base">Payment grace window</CardTitle>
                <CardDescription>
                  If a campaign expires after coupon apply, honor the offer if payment completes
                  within this many minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Minutes</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={graceMins}
                    onChange={(e) => setGraceMins(Math.max(1, Number(e.target.value) || 15))}
                  />
                </div>
                <Button type="button" onClick={() => void saveSettings()}>
                  Save settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
