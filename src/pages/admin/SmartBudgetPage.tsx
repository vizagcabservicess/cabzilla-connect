import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Send,
  X,
  MessageSquare,
  Wallet,
  Ban,
} from 'lucide-react';
import { fleetAPI } from '@/services/api/fleetAPI';
import type { FleetVehicle } from '@/types/cab';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LocationInput } from '@/components/LocationInput';
import { DateTimePicker } from '@/components/DateTimePicker';
import { TabTripSelector, type TripSelectorTab } from '@/components/TabTripSelector';
import type { Location } from '@/lib/locationData';
import { convertToApiLocation } from '@/lib/locationUtils';
import { TripMode, ensureCustomerTripType } from '@/lib/tripTypes';
import { AVAILABLE_TOUR_ROUTES } from '@/lib/availableTours';
import { loadCabTypes } from '@/lib/cabData';
import { calculateDistanceMatrix } from '@/lib/distanceService';
import { buildVehicleFareLinesForGuestTrack } from '@/lib/guestSearchFareLines';
import type { CabType } from '@/types/cab';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import {
  SMART_BUDGET_DEFAULTS,
  SMART_BUDGET_POLL_INTERVAL_MS,
  canSmartBudgetCancel,
  formatSmartBudgetFeeLabel,
  formatSmartBudgetStatus,
  isSmartBudgetAwaitingFee,
  isSmartBudgetTerminal,
  type SmartBudgetMessage,
  type SmartBudgetSession,
} from '@/types/smartBudget';
import { SmartBudgetCountdown } from '@/components/smart-budget/SmartBudgetCountdown';
import { SmartBudgetTripSummary } from '@/components/smart-budget/SmartBudgetTripSummary';
import { SmartBudgetChatThread } from '@/components/smart-budget/SmartBudgetChatThread';
import { SmartBudgetContactsReveal } from '@/components/smart-budget/SmartBudgetContactsReveal';
import { SmartBudgetVendorsAdmin } from '@/components/smart-budget/SmartBudgetVendorsAdmin';
import { SmartBudgetCustomersAdmin } from '@/components/smart-budget/SmartBudgetCustomersAdmin';

const HOURLY_PACKAGE_OPTIONS = [
  { value: '8hrs-80km', label: '8 Hours / 80 KM' },
  { value: '10hrs-100km', label: '10 Hours / 100 KM' },
];

/** Native select — avoids Radix RemoveScroll locking the page scrollbar. */
const SB_NATIVE_SELECT =
  'flex h-10 w-full rounded-md border border-input bg-white px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

type VehicleFareOption = {
  id: string;
  name: string;
  capacity: number;
  fare: number | null;
  fareText: string;
};

function locationLabel(loc: Location | null): string {
  if (!loc) return '';
  return (loc.address || loc.name || '').trim();
}

function parseFareText(fareText: string): number | null {
  const digits = fareText.replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function tripTabLabel(type: TripSelectorTab): string {
  switch (type) {
    case 'outstation':
      return 'Outstation';
    case 'local':
      return 'Local';
    case 'airport':
      return 'Airport';
    case 'tour':
      return 'Tour';
    case 'custom':
      return 'Custom Itinerary';
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Map UI tab → fare engine trip type (custom uses outstation rate cards). */
function fareTripTypeForTab(tab: TripSelectorTab): 'outstation' | 'local' | 'airport' | 'tour' {
  if (tab === 'custom') return 'outstation';
  return tab;
}

function locationInputTripType(tab: TripSelectorTab): 'outstation' | 'local' | 'airport' | 'tour' {
  if (tab === 'custom') return 'outstation';
  return ensureCustomerTripType(tab);
}

function customerSessionUrl(token: string): string {
  if (typeof window === 'undefined') return `/smart-budget/s/${token}`;
  return `${window.location.origin}/smart-budget/s/${token}`;
}

function whatsappShareUrl(session: SmartBudgetSession): string {
  const url = session.customer_url || customerSessionUrl(session.token);
  const text = encodeURIComponent(
    `Hi! Here is your Vizag Taxi Hub Smart Budget link (valid for a short time):\n${url}`
  );
  const phone = (session.customer_phone || '').replace(/\D/g, '');
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export default function SmartBudgetPage() {
  const [pageTab, setPageTab] = useState<'negotiations' | 'vendors' | 'customers' | 'settings'>(
    'negotiations'
  );
  const [sessions, setSessions] = useState<SmartBudgetSession[]>([]);
  const [selected, setSelected] = useState<SmartBudgetSession | null>(null);
  const [messages, setMessages] = useState<SmartBudgetMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [unreadVendorAlerts, setUnreadVendorAlerts] = useState(0);
  const [driverName, setDriverName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [tripDate, setTripDate] = useState<Date | undefined>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [tripType, setTripType] = useState<TripSelectorTab>('outstation');
  const [tripMode, setTripMode] = useState<TripMode>('one-way');
  const [hourlyPackage, setHourlyPackage] = useState(HOURLY_PACKAGE_OPTIONS[0].value);
  const [tourPackage, setTourPackage] = useState<string>(AVAILABLE_TOUR_ROUTES[0].slug);
  const [customItinerary, setCustomItinerary] = useState('');
  const [estimatedKm, setEstimatedKm] = useState('');
  const [websiteVehicles, setWebsiteVehicles] = useState<CabType[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<VehicleFareOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [websiteFareHint, setWebsiteFareHint] = useState<string | null>(null);
  const [faresLoading, setFaresLoading] = useState(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState(0);

  const [form, setForm] = useState({
    vehicle_type: '',
    passengers: '4',
    quoted_fare: '',
    customer_name: '',
    customer_phone: '',
    special_requests: '',
  });
  const [budgetMinPercent, setBudgetMinPercent] = useState(
    SMART_BUDGET_DEFAULTS.budgetMinOfWebsiteFarePercent
  );
  const [settingsSaving, setSettingsSaving] = useState(false);

  const isCustom = tripType === 'custom';
  const needsDrop = tripType === 'outstation' || tripType === 'airport';
  const showOptionalDrop = isCustom;
  const needsReturn = tripMode === 'round-trip' && tripType !== 'local';
  const selectedTourLabel =
    AVAILABLE_TOUR_ROUTES.find((t) => t.slug === tourPackage)?.label || tourPackage;

  const handleTabChange = (type: TripSelectorTab) => {
    setTripType(type);
    if (type === 'local' || type === 'tour') {
      setDropLocation(null);
    }
    if (type === 'local') {
      setTripMode('one-way');
      setReturnDate(undefined);
    }
    if (type !== 'custom') {
      setCustomItinerary('');
      setEstimatedKm('');
    }
  };

  const loadSessions = useCallback(async () => {
    try {
      const list = await smartBudgetAPI.admin.listSessions({ limit: 50 });
      setSessions(list);
      setSetupError(null);
      setSelected((prev) => {
        if (!prev) return prev;
        return list.find((s) => s.id === prev.id) ?? prev;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load sessions';
      setSetupError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: number) => {
    try {
      const msgs = await smartBudgetAPI.admin.getMessages(sessionId);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    let cancelled = false;
    setFleetLoading(true);
    void fleetAPI
      .getVehicles(false)
      .then((result) => {
        if (cancelled) return;
        const list = Array.isArray(result?.vehicles) ? result.vehicles : [];
        setFleetVehicles(
          list.filter((v) => {
            const num = (v.vehicleNumber || '').trim();
            const status = String(v.status || 'Active').toLowerCase();
            return num !== '' && status !== 'inactive' && status !== 'maintenance';
          })
        );
      })
      .catch(() => {
        if (!cancelled) setFleetVehicles([]);
      })
      .finally(() => {
        if (!cancelled) setFleetLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Clear assignment fields when switching sessions.
    setDriverName('');
    setVehicleNumber('');
  }, [selected?.id]);

  useEffect(() => {
    let cancelled = false;
    void smartBudgetAPI.admin
      .getSettings()
      .then((cfg) => {
        if (!cancelled && cfg.budget_min_of_website_fare_percent > 0) {
          setBudgetMinPercent(cfg.budget_min_of_website_fare_percent);
        }
      })
      .catch(() => {
        /* keep default until settings API deployed */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const seen = new Set<number>();
    const pollAlerts = async () => {
      try {
        const alerts = await smartBudgetAPI.admin.listAlerts({ unread_only: true, limit: 20 });
        if (cancelled) return;
        // Only count actionable vendor verification alerts
        const vendorAlerts = alerts.filter(
          (a) =>
            a.alert_type === 'vendor_docs_submitted' ||
            a.alert_type === 'vendor_signup' ||
            a.alert_type === 'vendor_docs_resubmitted' ||
            a.alert_type === 'customer_trip_posted' ||
            a.alert_type === 'marketplace_opened' ||
            a.alert_type === 'trip_accepted' ||
            a.alert_type === 'unlock_paid'
        );
        setUnreadVendorAlerts(vendorAlerts.length);
        for (const alert of vendorAlerts) {
          if (seen.has(alert.id)) continue;
          seen.add(alert.id);
          const isTrip =
            alert.alert_type === 'customer_trip_posted' ||
            alert.alert_type === 'marketplace_opened' ||
            alert.alert_type === 'trip_accepted' ||
            alert.alert_type === 'unlock_paid';
          toast.message(alert.title, {
            description: alert.body || (isTrip ? 'Open Negotiations to review' : 'Open Vendors tab to review'),
            action: {
              label: isTrip ? 'Negotiations' : 'Vendors',
              onClick: () => setPageTab(isTrip ? 'negotiations' : 'vendors'),
            },
          });
        }
      } catch {
        /* alerts optional until PHP redeployed */
      }
    };
    void pollAlerts();
    const id = window.setInterval(() => void pollAlerts(), SMART_BUDGET_POLL_INTERVAL_MS);
    const onAlertsChanged = () => void pollAlerts();
    window.addEventListener('sb-vendor-alerts-changed', onAlertsChanged);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('sb-vendor-alerts-changed', onAlertsChanged);
    };
  }, []);

  useEffect(() => {
    const hasActive = sessions.some((s) => !isSmartBudgetTerminal(s.status));
    if (!hasActive) return;
    const id = window.setInterval(() => void loadSessions(), SMART_BUDGET_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [sessions, loadSessions]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    void loadMessages(selected.id);
    if (isSmartBudgetTerminal(selected.status)) return;
    const id = window.setInterval(() => void loadMessages(selected.id), SMART_BUDGET_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [selected, loadMessages]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const vehicles = await loadCabTypes(false, true);
        if (cancelled) return;
        const active = vehicles.filter((v) => v.isActive !== false && v.name);
        setWebsiteVehicles(active);
      } catch {
        if (!cancelled) {
          setWebsiteVehicles([]);
          toast.error('Could not load website vehicles');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (websiteVehicles.length === 0) {
      setVehicleOptions([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      setFaresLoading(true);
      let distanceKm = 0;

      const manualKm = Number(estimatedKm);
      if (isCustom && Number.isFinite(manualKm) && manualKm > 0) {
        distanceKm = manualKm;
      } else if ((needsDrop || showOptionalDrop) && pickupLocation && dropLocation) {
        try {
          const result = await calculateDistanceMatrix(pickupLocation, dropLocation);
          distanceKm = result?.distance ?? 0;
        } catch {
          distanceKm = 0;
        }
      }

      if (cancelled) return;
      setRouteDistanceKm(distanceKm);

      try {
        const lines = await buildVehicleFareLinesForGuestTrack(websiteVehicles, {
          tripType: fareTripTypeForTab(tripType),
          tripMode,
          hourlyPackage,
          distance: distanceKm,
          pickupDate: tripDate || new Date(),
          returnDate: needsReturn ? returnDate : undefined,
        });

        if (cancelled) return;

        setVehicleOptions(
          websiteVehicles.map((cab, index) => {
            const line = lines[index];
            const fareText = line?.fareText || 'Fare n/a';
            return {
              id: cab.id,
              name: cab.name,
              capacity: cab.capacity || 4,
              fare: parseFareText(fareText),
              fareText,
            };
          })
        );
      } catch {
        if (!cancelled) {
          setVehicleOptions(
            websiteVehicles.map((cab) => ({
              id: cab.id,
              name: cab.name,
              capacity: cab.capacity || 4,
              fare: null,
              fareText: 'Fare n/a',
            }))
          );
        }
      } finally {
        if (!cancelled) setFaresLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    websiteVehicles,
    tripType,
    tripMode,
    hourlyPackage,
    tripDate,
    returnDate,
    pickupLocation,
    dropLocation,
    needsDrop,
    needsReturn,
    isCustom,
    showOptionalDrop,
    estimatedKm,
  ]);

  useEffect(() => {
    if (!selectedVehicleId) {
      setWebsiteFareHint(null);
      return;
    }
    const opt = vehicleOptions.find((o) => o.id === selectedVehicleId);
    if (!opt) return;
    setWebsiteFareHint(
      opt.fare != null ? opt.fareText : 'Website fare not available for this route yet'
    );
    setForm((f) => ({
      ...f,
      vehicle_type: opt.name,
      quoted_fare: opt.fare != null ? String(opt.fare) : '',
      passengers: String(opt.capacity || Number(f.passengers) || 4),
    }));
  }, [selectedVehicleId, vehicleOptions]);

  const handleVehicleSelect = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    if (!vehicleId) {
      setWebsiteFareHint(null);
      setForm((f) => ({ ...f, vehicle_type: '', quoted_fare: '' }));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pickup = locationLabel(pickupLocation);
    let drop = '';
    if (needsDrop) {
      drop = locationLabel(dropLocation);
    } else if (isCustom) {
      drop = locationLabel(dropLocation) || 'Custom itinerary';
    } else if (tripType === 'local') {
      drop = HOURLY_PACKAGE_OPTIONS.find((o) => o.value === hourlyPackage)?.label || hourlyPackage;
    } else if (tripType === 'tour') {
      drop = selectedTourLabel;
    }

    if (!pickup || !tripDate) {
      toast.error('Select pickup and departure date/time');
      return;
    }
    if (needsDrop && !drop) {
      toast.error('Select a drop location from suggestions');
      return;
    }
    if (tripType === 'tour' && !tourPackage) {
      toast.error('Select a tour package');
      return;
    }
    if (isCustom && !customItinerary.trim()) {
      toast.error('Describe the custom itinerary (stops, days, sightseeing)');
      return;
    }
    if (needsReturn && !returnDate) {
      toast.error('Select a return date/time for round trip');
      return;
    }
    if (!form.vehicle_type.trim()) {
      toast.error('Select a vehicle');
      return;
    }
    if (!form.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    const tripMeta = [
      `Trip: ${tripTabLabel(tripType)}`,
      tripType !== 'local' ? (tripMode === 'round-trip' ? 'Round Trip' : 'One Way') : null,
      tripType === 'local'
        ? `Package: ${HOURLY_PACKAGE_OPTIONS.find((o) => o.value === hourlyPackage)?.label || hourlyPackage}`
        : null,
      tripType === 'tour' ? `Tour package: ${selectedTourLabel}` : null,
      isCustom && customItinerary.trim() ? `Itinerary: ${customItinerary.trim()}` : null,
      isCustom && routeDistanceKm > 0 ? `Est. distance: ${Math.round(routeDistanceKm)} km` : null,
      websiteFareHint && !websiteFareHint.startsWith('Website fare not')
        ? `Website fare: ${websiteFareHint}`
        : null,
      needsReturn && returnDate ? `Return: ${format(returnDate, 'd MMM yyyy, h:mm a')}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const notes = [tripMeta, form.special_requests.trim()].filter(Boolean).join('\n');

    setIsCreating(true);
    try {
      const session = await smartBudgetAPI.admin.createSession({
        pickup,
        drop_location: drop,
        trip_datetime: format(tripDate, "yyyy-MM-dd'T'HH:mm"),
        vehicle_type: form.vehicle_type,
        passengers: Number(form.passengers) || 1,
        quoted_fare: form.quoted_fare ? Number(form.quoted_fare) : null,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        special_requests: notes || null,
        link_ttl_minutes: SMART_BUDGET_DEFAULTS.linkTtlMinutes,
        admin_priority_minutes: SMART_BUDGET_DEFAULTS.adminPriorityMinutes,
      });
      toast.success('Smart Budget link created');
      setSelected(session);
      setPickupLocation(null);
      setDropLocation(null);
      setTripDate(new Date());
      setReturnDate(undefined);
      setSelectedVehicleId('');
      setWebsiteFareHint(null);
      setCustomItinerary('');
      setEstimatedKm('');
      setForm({
        vehicle_type: '',
        passengers: '4',
        quoted_fare: '',
        customer_name: '',
        customer_phone: '',
        special_requests: '',
      });
      await loadSessions();
      const url = session.customer_url || customerSessionUrl(session.token);
      try {
        await navigator.clipboard.writeText(url);
        toast.message('Customer link copied');
      } catch {
        /* ignore */
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    } finally {
      setIsCreating(false);
    }
  };

  const handleAcceptOwn = async () => {
    if (!selected) return;
    const driver = driverName.trim();
    const vehicle = vehicleNumber.trim();
    if (!driver) {
      toast.error('Enter the fleet driver name');
      return;
    }
    if (!vehicle) {
      toast.error('Select or enter the fleet vehicle number');
      return;
    }
    setIsActing(true);
    try {
      const updated = await smartBudgetAPI.admin.acceptOwn(selected.id, {
        driver_name: driver,
        vehicle_number: vehicle,
      });
      setSelected(updated);
      setDriverName('');
      setVehicleNumber('');
      toast.success('Accepted with your fleet — vendors will not see this request');
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Accept failed');
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setIsActing(true);
    try {
      const updated = await smartBudgetAPI.admin.rejectToMarketplace(selected.id);
      setSelected(updated);
      toast.success('Pushed to vendor marketplace');
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Reject failed');
    } finally {
      setIsActing(false);
    }
  };

  const handleCancelRide = async () => {
    if (!selected || !canSmartBudgetCancel(selected.status)) return;
    const ok = window.confirm(`Cancel ride #${selected.id}? Customer and vendor will see it as cancelled.`);
    if (!ok) return;
    setIsActing(true);
    try {
      const result = await smartBudgetAPI.admin.cancelSession(selected.id);
      setSelected(result.session);
      toast.success('Ride cancelled');
      await loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cancel failed');
    } finally {
      setIsActing(false);
    }
  };

  const prioritySessions = sessions.filter((s) => s.status === 'admin_priority');
  const openMarketplaceSessions = sessions.filter((s) => s.status === 'marketplace');
  const awaitingFeeSessions = sessions.filter((s) => isSmartBudgetAwaitingFee(s));
  const marketplaceSessions = sessions.filter((s) =>
    ['marketplace', 'vendor_claimed', 'chat_open', 'fee_paid'].includes(s.status)
  );

  return (
    <AdminLayout activeTab="smart-budget">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Smart Budget Marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Timed negotiation links, admin first-right, vendor broadcast, 10% unlock fee
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              switch (pageTab) {
                case 'negotiations':
                  void loadSessions();
                  break;
                case 'vendors':
                  window.dispatchEvent(new Event('sb-admin-refresh-vendors'));
                  break;
                case 'customers':
                  window.dispatchEvent(new Event('sb-admin-refresh-customers'));
                  break;
                case 'settings':
                  void (async () => {
                    try {
                      const cfg = await smartBudgetAPI.admin.getSettings();
                      if (cfg.budget_min_of_website_fare_percent != null) {
                        setBudgetMinPercent(cfg.budget_min_of_website_fare_percent);
                      }
                      toast.success('Settings refreshed');
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to refresh settings');
                    }
                  })();
                  break;
                default: {
                  const _exhaustive: never = pageTab;
                  void _exhaustive;
                  break;
                }
              }
            }}
            disabled={isLoading && pageTab === 'negotiations'}
          >
            {isLoading && pageTab === 'negotiations' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>

        {setupError && (
          <Alert variant="destructive">
            <AlertTitle>API unavailable</AlertTitle>
            <AlertDescription>
              {setupError}. Deploy <code>sql/smart_budget_migration.sql</code> and{' '}
              <code>/api/smart-budget/*.php</code> on the server.
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={pageTab}
          onValueChange={(v) =>
            setPageTab(v as 'negotiations' | 'vendors' | 'customers' | 'settings')
          }
        >
          <TabsList>
            <TabsTrigger value="negotiations">Negotiations</TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1.5">
              Vendors
              {unreadVendorAlerts > 0 && (
                <Badge className="h-5 min-w-5 rounded-full bg-amber-500 px-1.5 text-[10px] hover:bg-amber-500">
                  {unreadVendorAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors" className="mt-4">
            {unreadVendorAlerts > 0 && (
              <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-950">
                <AlertTitle>Vendor verification queue</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  <span>
                    {unreadVendorAlerts} unread signup/document alert
                    {unreadVendorAlerts === 1 ? '' : 's'} still pending review.
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      void smartBudgetAPI.admin.markAlertRead().then(() => {
                        setUnreadVendorAlerts(0);
                        window.dispatchEvent(new Event('sb-vendor-alerts-changed'));
                      });
                    }}
                  >
                    Mark alerts read
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <SmartBudgetVendorsAdmin />
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <SmartBudgetCustomersAdmin />
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card className="max-w-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Budget floor</CardTitle>
                <CardDescription className="text-xs">
                  Customer budgets (non-custom trips) must be at least this percentage of the website
                  original fare. Custom itinerary posts are not restricted.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sb-budget-min-pct">Minimum % of website fare</Label>
                  <Input
                    id="sb-budget-min-pct"
                    type="number"
                    min={1}
                    max={100}
                    className="h-10 max-w-[10rem] text-sm"
                    value={budgetMinPercent}
                    onChange={(e) => setBudgetMinPercent(Number(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Example: website fare ₹2,400 at {budgetMinPercent || 0}% → min budget ₹
                    {budgetMinPercent > 0
                      ? Math.ceil((2400 * Math.min(100, Math.max(1, budgetMinPercent))) / 100).toLocaleString(
                          'en-IN'
                        )
                      : '—'}
                    .
                  </p>
                </div>
                <Button
                  type="button"
                  disabled={settingsSaving || budgetMinPercent < 1 || budgetMinPercent > 100}
                  onClick={() => {
                    void (async () => {
                      setSettingsSaving(true);
                      try {
                        const cfg = await smartBudgetAPI.admin.updateSettings({
                          budget_min_of_website_fare_percent: budgetMinPercent,
                        });
                        setBudgetMinPercent(cfg.budget_min_of_website_fare_percent);
                        toast.success('Settings saved');
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Could not save settings');
                      } finally {
                        setSettingsSaving(false);
                      }
                    })();
                  }}
                >
                  {settingsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="negotiations" className="mt-4 space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Create negotiation link</CardTitle>
              <CardDescription className="text-xs">
                Link expires in ~{SMART_BUDGET_DEFAULTS.linkTtlMinutes} minutes. Admin priority window:{' '}
                {SMART_BUDGET_DEFAULTS.adminPriorityMinutes} minutes after budget submit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-3 sm:grid-cols-2 text-sm [&_label]:text-xs [&_label]:font-medium [&_label]:text-slate-600"
                onSubmit={handleCreate}
              >
                <div className="sm:col-span-2 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                  <TabTripSelector
                    selectedTab={tripType}
                    tripMode={tripMode}
                    onTabChange={handleTabChange}
                    onTripModeChange={setTripMode}
                    onClearLocations={() => {
                      setPickupLocation(null);
                      setDropLocation(null);
                    }}
                    visibleTabs={['outstation', 'local', 'airport', 'tour', 'custom']}
                    showTripModeToggle
                    hideUrbaniaPromo
                    hidePromoSlider
                  />

                  {/* Always stack in this card — half-width admin column + sm:2-col was truncating Custom fields on mobile */}
                  <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-slate-50/80 p-3 [&_input]:!text-sm [&_input]:!font-medium [&_button]:!text-sm [&_button]:!font-medium [&_span]:!text-sm">
                    {isCustom && (
                      <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900">
                        For requests that do not match website packages — describe the full plan below.
                        Website vehicle fares use outstation rates × estimated or mapped distance.
                      </div>
                    )}

                    {tripType === 'tour' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-tour">Tour package</Label>
                        <select
                          id="sb-tour"
                          className={SB_NATIVE_SELECT}
                          value={tourPackage}
                          onChange={(e) => setTourPackage(e.target.value)}
                        >
                          {AVAILABLE_TOUR_ROUTES.map((tour) => (
                            <option key={tour.slug} value={tour.slug}>
                              {tour.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <LocationInput
                        id="sb-pickup"
                        label="Pickup"
                        placeholder="Search pickup"
                        value={pickupLocation ? convertToApiLocation(pickupLocation) : undefined}
                        onLocationChange={setPickupLocation}
                        isPickupLocation
                        tripType={locationInputTripType(tripType)}
                        variant="desktop"
                        required
                      />
                    </div>

                    {(needsDrop || showOptionalDrop) && (
                      <div>
                        <LocationInput
                          id="sb-drop"
                          label={isCustom ? 'Final drop (optional)' : 'Drop'}
                          placeholder={isCustom ? 'Search final drop if known' : 'Search drop'}
                          value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
                          onLocationChange={setDropLocation}
                          isPickupLocation={false}
                          tripType={locationInputTripType(tripType)}
                          variant="desktop"
                          required={needsDrop}
                          onRequestOutstationSwitch={() => handleTabChange('outstation')}
                        />
                      </div>
                    )}

                    {tripType === 'local' && (
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-local-pkg">Local package</Label>
                        <select
                          id="sb-local-pkg"
                          className={SB_NATIVE_SELECT}
                          value={hourlyPackage}
                          onChange={(e) => setHourlyPackage(e.target.value)}
                        >
                          {HOURLY_PACKAGE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {isCustom && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="sb-itinerary">Custom itinerary</Label>
                          <Textarea
                            id="sb-itinerary"
                            className="bg-white text-sm"
                            rows={3}
                            value={customItinerary}
                            onChange={(e) => setCustomItinerary(e.target.value)}
                            placeholder="e.g. Day 1: Vizag → Araku via Borra Caves · Day 2: Lambasingi overnight · Day 3: return Vizag with temple stops"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="sb-est-km">Estimated total km (optional)</Label>
                          <Input
                            id="sb-est-km"
                            type="number"
                            min={1}
                            className="h-10 bg-white text-sm"
                            value={estimatedKm}
                            onChange={(e) => setEstimatedKm(e.target.value)}
                            placeholder="Overrides map distance for website fare"
                          />
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            Use total multi-stop km when pickup→drop alone understates the trip.
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <DateTimePicker
                        label="Departure"
                        date={tripDate}
                        onDateChange={setTripDate}
                        minDate={new Date()}
                        variant="desktop"
                        className="w-full"
                      />
                    </div>

                    {needsReturn && (
                      <div>
                        <DateTimePicker
                          label="Return"
                          date={returnDate}
                          onDateChange={setReturnDate}
                          minDate={tripDate || new Date()}
                          variant="desktop"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sb-vehicle">Vehicle</Label>
                  <select
                    id="sb-vehicle"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedVehicleId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    disabled={faresLoading && vehicleOptions.length === 0}
                  >
                    <option value="">
                      {faresLoading ? 'Loading website vehicles…' : 'Select website vehicle'}
                    </option>
                    {vehicleOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} — {v.fareText}
                      </option>
                    ))}
                  </select>
                  {((needsDrop || showOptionalDrop) && routeDistanceKm > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {isCustom && Number(estimatedKm) > 0 ? 'Estimated' : 'Route'} ~
                      {Math.round(routeDistanceKm)} km (website fares)
                    </p>
                  )}
                  {needsDrop && pickupLocation && !dropLocation && (
                    <p className="text-xs text-muted-foreground">
                      Add drop location to calculate website fares
                    </p>
                  )}
                  {isCustom && !estimatedKm && pickupLocation && !dropLocation && (
                    <p className="text-xs text-muted-foreground">
                      Add final drop or estimated km to calculate website fares
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sb-pax">Passengers</Label>
                  <Input
                    id="sb-pax"
                    type="number"
                    min={1}
                    className="h-10 text-sm"
                    value={form.passengers}
                    onChange={(e) => setForm((f) => ({ ...f, passengers: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sb-fare">Quoted fare (₹)</Label>
                  <Input
                    id="sb-fare"
                    type="number"
                    min={0}
                    className="h-10 text-sm"
                    value={form.quoted_fare}
                    onChange={(e) => setForm((f) => ({ ...f, quoted_fare: e.target.value }))}
                    placeholder="e.g. 3200"
                  />
                  {websiteFareHint && (
                    <p className="text-xs text-muted-foreground">
                      Website original fare: {websiteFareHint}
                      {faresLoading ? ' (updating…)' : ''}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sb-cname">
                    Customer name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="sb-cname"
                    className="h-10 text-sm"
                    value={form.customer_name}
                    onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2 sm:max-w-[50%]">
                  <Label htmlFor="sb-cphone">Customer phone</Label>
                  <Input
                    id="sb-cphone"
                    className="h-10 text-sm"
                    value={form.customer_phone}
                    onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="sb-notes">Special requests</Label>
                  <Textarea
                    id="sb-notes"
                    className="text-sm"
                    value={form.special_requests}
                    onChange={(e) => setForm((f) => ({ ...f, special_requests: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={isCreating} className="w-full sm:w-auto">
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Create & copy link
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live queue</CardTitle>
              <CardDescription>
                Admin priority first. Ignore auto-pushes to marketplace when the timer ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="priority">
                <TabsList className="mb-3 flex h-auto flex-wrap gap-1">
                  <TabsTrigger value="priority">
                    Priority ({prioritySessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="awaiting">
                    Awaiting fee ({awaitingFeeSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="market">
                    Marketplace ({openMarketplaceSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="active">
                    Active ({marketplaceSessions.length})
                  </TabsTrigger>
                  <TabsTrigger value="all">All ({sessions.length})</TabsTrigger>
                </TabsList>
                {(['priority', 'awaiting', 'market', 'active', 'all'] as const).map((tab) => {
                  const list =
                    tab === 'priority'
                      ? prioritySessions
                      : tab === 'awaiting'
                        ? awaitingFeeSessions
                        : tab === 'market'
                          ? openMarketplaceSessions
                          : tab === 'active'
                            ? marketplaceSessions
                            : sessions;
                  return (
                    <TabsContent key={tab} value={tab} className="mt-0 space-y-2 max-h-[420px] overflow-y-auto">
                      {list.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          {tab === 'awaiting'
                            ? 'No accepted trips waiting on customer fee'
                            : 'No sessions'}
                        </p>
                      ) : (
                        list.map((s) => {
                          const awaiting = isSmartBudgetAwaitingFee(s);
                          return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setSelected(s)}
                            className={`w-full rounded-lg border p-3 text-left transition hover:border-emerald-400 ${
                              selected?.id === s.id
                                ? 'border-emerald-600 bg-emerald-50/50'
                                : awaiting
                                  ? 'border-amber-200 bg-amber-50/40'
                                  : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm line-clamp-1">
                                  {s.pickup} → {s.drop_location}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {s.customer_budget != null
                                    ? `Budget ₹${Number(s.customer_budget).toLocaleString('en-IN')}`
                                    : 'Awaiting budget'}
                                  {s.vendor_name ? ` · ${s.vendor_name}` : ''}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                  {formatSmartBudgetStatus(s.status)}
                                </Badge>
                                {(awaiting || s.contacts_unlocked || s.status === 'fee_paid') && (
                                  <Badge
                                    className={`shrink-0 text-[10px] ${
                                      awaiting
                                        ? 'bg-amber-100 text-amber-950 hover:bg-amber-100'
                                        : 'bg-emerald-100 text-emerald-900 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {formatSmartBudgetFeeLabel(s)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {s.status === 'admin_priority' && s.admin_priority_ends_at && (
                              <div className="mt-2">
                                <SmartBudgetCountdown
                                  expiresAt={s.admin_priority_ends_at}
                                  label="Priority"
                                  onExpire={() => void loadSessions()}
                                />
                              </div>
                            )}
                          </button>
                          );
                        })
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {selected && (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Session #{selected.id}</CardTitle>
                <CardDescription className="mt-1 font-mono text-xs break-all">
                  {selected.customer_url || customerSessionUrl(selected.token)}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const url = selected.customer_url || customerSessionUrl(selected.token);
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied');
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy link
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={whatsappShareUrl(selected)} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                {(selected.status === 'admin_priority' || selected.status === 'budget_submitted') && (
                  <div className="space-y-3 rounded-lg border-2 border-emerald-600 bg-emerald-50/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-emerald-950">Accept with Vizag Taxi Hub fleet</p>
                        <p className="text-xs text-emerald-900/80">
                          Add driver + vehicle number, then Accept. Or skip to send this trip to all vendors.
                        </p>
                      </div>
                      {selected.admin_priority_ends_at && (
                        <SmartBudgetCountdown
                          expiresAt={selected.admin_priority_ends_at}
                          label="Priority left"
                          onExpire={() => void loadSessions()}
                        />
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-accept-driver">Driver name *</Label>
                        <Input
                          id="sb-accept-driver"
                          placeholder="e.g. Ramesh"
                          value={driverName}
                          onChange={(e) => setDriverName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-accept-vehicle">Fleet vehicle *</Label>
                        {fleetVehicles.length > 0 ? (
                          <Select
                            value={vehicleNumber || undefined}
                            onValueChange={(v) => setVehicleNumber(v)}
                          >
                            <SelectTrigger id="sb-accept-vehicle">
                              <SelectValue
                                placeholder={fleetLoading ? 'Loading fleet…' : 'Select vehicle number'}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {fleetVehicles.map((v) => {
                                const num = (v.vehicleNumber || '').trim();
                                const label = [num, v.make, v.model].filter(Boolean).join(' · ');
                                return (
                                  <SelectItem key={v.id || num} value={num}>
                                    {label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            id="sb-accept-vehicle"
                            placeholder={fleetLoading ? 'Loading fleet…' : 'e.g. AP31AB1234'}
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                          />
                        )}
                      </div>
                    </div>
                    {fleetVehicles.length > 0 && (
                      <div className="space-y-1.5">
                        <Label htmlFor="sb-accept-vehicle-manual">Or type vehicle number</Label>
                        <Input
                          id="sb-accept-vehicle-manual"
                          placeholder="Override / manual entry"
                          value={vehicleNumber}
                          onChange={(e) => setVehicleNumber(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="bg-emerald-700 hover:bg-emerald-800"
                        onClick={() => void handleAcceptOwn()}
                        disabled={isActing || !driverName.trim() || !vehicleNumber.trim()}
                      >
                        {isActing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        Accept (own fleet)
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void handleReject()}
                        disabled={isActing}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Skip → vendors
                      </Button>
                    </div>
                  </div>
                )}
                <SmartBudgetTripSummary session={selected} />
                {isSmartBudgetAwaitingFee(selected) && (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                    <Wallet className="h-4 w-4" />
                    <AlertTitle>Awaiting 10% unlock fee</AlertTitle>
                    <AlertDescription>
                      {selected.vendor_name || 'Vendor'} has accepted. Customer has not paid yet —
                      contacts stay masked until fee payment clears
                      {selected.booking_fee_amount != null
                        ? ` (₹${Number(selected.booking_fee_amount).toLocaleString('en-IN')})`
                        : ''}
                      .
                    </AlertDescription>
                  </Alert>
                )}
                {isSmartBudgetAwaitingFee(selected) ? (
                  selected.fee_due_at ? (
                    <SmartBudgetCountdown
                      expiresAt={selected.fee_due_at}
                      label="Fee payment window"
                      onExpire={() => void loadSessions()}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Invite link TTL no longer applies — waiting on customer unlock fee.
                    </p>
                  )
                ) : selected.status !== 'admin_priority' && selected.status !== 'budget_submitted' ? (
                  <SmartBudgetCountdown expiresAt={selected.link_expires_at} label="Invite link TTL" />
                ) : null}
                <SmartBudgetContactsReveal session={selected} perspective="admin" />
                {(selected.payment_status || selected.booking_fee_amount != null) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    Payment: {selected.payment_status || '—'}
                    {selected.booking_fee_amount != null &&
                      ` · ₹${Number(selected.booking_fee_amount).toLocaleString('en-IN')}`}
                  </div>
                )}
                {canSmartBudgetCancel(selected.status) && (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={isActing}
                    onClick={() => void handleCancelRide()}
                  >
                    {isActing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
                    Cancel ride
                  </Button>
                )}
                {selected.status === 'cancelled' && (
                  <Alert>
                    <AlertTitle>Cancelled</AlertTitle>
                    <AlertDescription>
                      Cancelled by {selected.cancelled_by || 'unknown'}
                      {selected.cancelled_at
                        ? ` · ${new Date(selected.cancelled_at).toLocaleString('en-IN')}`
                        : ''}
                      {selected.cancel_reason ? ` · ${selected.cancel_reason}` : ''}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </div>
                <SmartBudgetChatThread
                  messages={messages}
                  currentRole="admin"
                  disabled={isSmartBudgetTerminal(selected.status)}
                  onSend={async (body) => {
                    const msg = await smartBudgetAPI.admin.sendMessage(selected.id, body);
                    setMessages((prev) => [...prev, msg]);
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
