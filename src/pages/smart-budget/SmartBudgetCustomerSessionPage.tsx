import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, MessageSquare, CreditCard, Ban, Pencil, ChevronDown, CheckCircle2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { smartBudgetAPI } from '@/services/api/smartBudgetAPI';
import {
  SMART_BUDGET_DEFAULTS,
  SMART_BUDGET_POLL_INTERVAL_MS,
  canSmartBudgetCancel,
  canSmartBudgetChat,
  canSmartBudgetPayUnlock,
  isSmartBudgetAwaitingFee,
  isSmartBudgetTerminal,
  smartBudgetMinBudgetFromWebsiteFare,
  type SmartBudgetSession,
} from '@/types/smartBudget';
import { SmartBudgetCountdown } from '@/components/smart-budget/SmartBudgetCountdown';
import { SmartBudgetContactsReveal } from '@/components/smart-budget/SmartBudgetContactsReveal';
import { SmartBudgetFeeGate } from '@/components/smart-budget/SmartBudgetFeeGate';
import { DateTimePicker } from '@/components/DateTimePicker';
import { LocationInput } from '@/components/LocationInput';
import { validateSmartBudgetSpecialRequests } from '@/lib/smartBudgetChatGuard';
import { loadCabTypes } from '@/lib/cabData';
import type { Location } from '@/lib/locationData';
import { convertToApiLocation } from '@/lib/locationUtils';
import type { TripType } from '@/lib/tripTypes';
import { cn } from '@/lib/utils';
import {
  parseVehicleOptionsFromSpecialRequests,
  type SearchResultVehicleOption,
} from '@/utils/searchAlertSmartBudget';

function locationLabel(loc: Location | null): string {
  if (!loc) return '';
  return (loc.address || loc.name || '').trim();
}

function locationFromLabel(label: string): Location | null {
  const text = label.trim();
  if (!text) return null;
  return {
    id: `prefill_${text.slice(0, 48)}`,
    name: text,
    address: text,
    lat: 0,
    lng: 0,
    city: '',
    state: '',
    type: 'other',
    popularityScore: 50,
  };
}

function inferSessionTripType(special: string | null | undefined): TripType {
  const t = (special || '').toLowerCase();
  if (t.includes('custom itinerary')) return 'custom';
  if (t.includes('tour') || t.includes('package:')) return 'tour';
  if (t.includes('airport')) return 'airport';
  if (t.includes('local') || t.includes('hourly')) return 'local';
  return 'outstation';
}

function waitingCopy(status: SmartBudgetSession['status']): string {
  switch (status) {
    case 'link_sent':
      return 'Review your trip, enter your preferred budget, and we\'ll review your request.';
    case 'budget_submitted':
    case 'admin_priority':
      return 'Thanks! We\'re reviewing your offer now. This usually takes a few minutes.';
    case 'marketplace':
      return 'Your offer is being matched with available partners. We\'ll update you soon.';
    case 'admin_assigned':
    case 'vendor_claimed':
    case 'chat_open':
      return 'Great news — your trip was accepted. Open chat to coordinate, then pay the booking fee.';
    case 'fee_paid':
    case 'completed':
      return 'Booking fee paid. Your contact details are unlocked.';
    case 'expired':
      return 'This offer link has expired. Please contact Vizag Taxi Hub for a new quote.';
    case 'cancelled':
      return 'This request was cancelled.';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function toDatetimeLocalValue(iso: string): Date | undefined {
  try {
    const d = parseISO(iso.includes('T') ? iso : iso.replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

/** Leftovers after auto trip-meta is removed (e.g. "104 km one way)"). */
const SYSTEM_META_FRAGMENT_RE =
  /^(?:round\s*trip|one\s*way|\(?\s*~?\d+(?:\.\d+)?\s*km(?:\s+one\s+way)?\)?|\d+(?:\.\d+)?\s*km(?:\s+one\s+way)?\)?)$/i;

const SYSTEM_META_LABELS =
  'Trip|Mode|Distance|Search results|Website fare|Source|Package|Return|Itinerary';

/**
 * Remove auto-generated trip meta from special_requests.
 * Handles Distance lines that contain an inner " · " inside parentheses.
 */
function stripSystemTripMeta(special: string | null | undefined): string {
  if (!special) return '';
  let text = special.trim();

  // Search-alert links are fully system-generated — keep the notes box empty.
  if (/Source:\s*Search alert/i.test(text)) {
    return '';
  }

  text = text.replace(/Distance\s*:\s*~?[\d.]+\s*km(?:\s*\([^)]*\))?/gi, '');
  text = text.replace(
    new RegExp(
      `(?:^|\\s·\\s)?(?:${SYSTEM_META_LABELS})\\s*:\\s*.*?(?=\\s*(?:${SYSTEM_META_LABELS})\\s*:|$)`,
      'gi'
    ),
    ''
  );

  return text
    .split(/\s*·\s*/)
    .map((p) => p.trim())
    .filter((part) => part.length > 0 && !SYSTEM_META_FRAGMENT_RE.test(part))
    .join(' · ')
    .replace(/^[·\s]+|[·\s]+$/g, '')
    .trim();
}

function extractSystemTripMeta(special: string | null | undefined): string {
  if (!special) return '';
  const text = special.trim();
  const parts: string[] = [];

  const distance = text.match(/Distance\s*:\s*~?[\d.]+\s*km(?:\s*\([^)]*\))?/i);
  if (distance?.[0]) parts.push(distance[0].trim());

  const labeled = text.match(
    new RegExp(`(?:${SYSTEM_META_LABELS})\\s*:\\s*.*?(?=\\s*(?:${SYSTEM_META_LABELS})\\s*:|$)`, 'gi')
  );
  if (labeled) {
    for (const m of labeled) {
      const cleaned = m.trim();
      if (cleaned && !/^Distance\s*:/i.test(cleaned)) parts.push(cleaned);
    }
  }

  return parts.join(' · ');
}

/** Friendly trip type + distance for the customer Trip Summary card. */
function parseTripSummaryMeta(special: string | null | undefined): {
  tripType: string | null;
  kilometers: string | null;
} {
  if (!special?.trim()) return { tripType: null, kilometers: null };
  const text = special.trim();

  let tripType: string | null = null;
  const tripMatch = text.match(/Trip\s*:\s*(.+?)(?=\s*·\s*(?:Mode|Distance|Search results|Website fare|Source|Package|Return|Itinerary)\s*:|$)/i);
  if (tripMatch?.[1]) {
    tripType = tripMatch[1].trim().replace(/\s*·\s*/g, ' · ');
  } else {
    const modeMatch = text.match(/Mode\s*:\s*(.+?)(?=\s*·\s*(?:Trip|Distance|Search results|Website fare|Source|Package|Return|Itinerary)\s*:|$)/i);
    if (modeMatch?.[1]) {
      const mode = modeMatch[1].trim().toLowerCase();
      if (mode.includes('round')) tripType = 'Round trip';
      else if (mode.includes('one')) tripType = 'One way';
      else tripType = modeMatch[1].trim();
    }
  }

  let kilometers: string | null = null;
  const distMatch = text.match(
    /Distance\s*:\s*(~?[\d.]+)\s*km(?:\s*\(([^)]*)\))?/i
  );
  if (distMatch) {
    const km = distMatch[1].replace(/^~/, '');
    const detail = (distMatch[2] || '').trim();
    if (/round\s*trip/i.test(detail)) {
      kilometers = `~${km} km (round trip)`;
    } else if (detail) {
      kilometers = `~${km} km`;
    } else {
      kilometers = `~${km} km`;
    }
  }

  return { tripType, kilometers };
}

export default function SmartBudgetCustomerSessionPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SmartBudgetSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [editingTrip, setEditingTrip] = useState(false);
  const [budget, setBudget] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropLocation, setDropLocation] = useState<Location | null>(null);
  const [tripDate, setTripDate] = useState<Date | undefined>(undefined);
  const [vehicleType, setVehicleType] = useState('');
  const [quotedFare, setQuotedFare] = useState<number | null>(null);
  const [vehicleOptions, setVehicleOptions] = useState<SearchResultVehicleOption[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [passengers, setPassengers] = useState('4');
  const [cancelling, setCancelling] = useState(false);
  const [budgetMinPercent, setBudgetMinPercent] = useState(
    SMART_BUDGET_DEFAULTS.budgetMinOfWebsiteFarePercent
  );
  /** After first hydrate, polls must not wipe in-progress name/phone/vehicle edits. */
  const formHydratedRef = useRef(false);

  const applySessionFields = useCallback(
    (data: SmartBudgetSession, opts?: { syncForm?: boolean }) => {
      setSession(data);
      setError(null);

      // Keep local edits while guest is still filling the pre-submit form.
      const stillEditingBudget =
        data.status === 'link_sent' || data.customer_budget == null;
      const syncForm =
        opts?.syncForm === true ||
        (opts?.syncForm !== false &&
          (!formHydratedRef.current || !stillEditingBudget));

      if (!syncForm) return;

      if (data.customer_name && data.customer_name.trim().toLowerCase() !== 'guest') {
        setName(data.customer_name);
      } else {
        setName('');
      }
      if (data.customer_phone) setPhone(data.customer_phone);
      setNotes(stripSystemTripMeta(data.special_requests));
      if (data.customer_budget != null) setBudget(String(data.customer_budget));
      const pickupText = data.pickup || '';
      const dropText = data.drop_location || '';
      setPickup(pickupText);
      setDrop(dropText);
      setPickupLocation(locationFromLabel(pickupText));
      setDropLocation(locationFromLabel(dropText));
      setTripDate(toDatetimeLocalValue(data.trip_datetime));
      setVehicleType(data.vehicle_type || '');
      setQuotedFare(
        data.quoted_fare != null && Number.isFinite(Number(data.quoted_fare))
          ? Number(data.quoted_fare)
          : null
      );
      setPassengers(String(data.passengers || 4));
      formHydratedRef.current = true;
    },
    []
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await smartBudgetAPI.public.getSessionByToken(token);
      // Polls / focus: update status timers only; do not reset the form.
      applySessionFields(data, {
        syncForm: !formHydratedRef.current,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [token, applySessionFields]);

  useEffect(() => {
    formHydratedRef.current = false;
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    void smartBudgetAPI.public
      .getConfig()
      .then((cfg) => {
        if (!cancelled && cfg.budget_min_of_website_fare_percent > 0) {
          setBudgetMinPercent(cfg.budget_min_of_website_fare_percent);
        }
      })
      .catch(() => {
        /* keep default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Vehicle dropdown: search-result cars + seating capacity from website fleet.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    const run = async () => {
      setVehiclesLoading(true);
      const fromSearch = parseVehicleOptionsFromSpecialRequests(session.special_requests);
      let capacityByName = new Map<string, number>();
      let fleet: SearchResultVehicleOption[] = [];
      try {
        const cabs = await loadCabTypes(false, true);
        if (cancelled) return;
        capacityByName = new Map(
          cabs
            .filter((c) => c.isActive !== false && c.name?.trim())
            .map((c) => [c.name.trim().toLowerCase(), c.capacity > 0 ? c.capacity : 4])
        );
        fleet = cabs
          .filter((c) => c.isActive !== false && c.name?.trim())
          .map((c) => ({
            name: c.name.trim(),
            fareText: '—',
            fareAmount: null,
            capacity: c.capacity > 0 ? c.capacity : 4,
          }));
      } catch {
        /* keep empty fleet */
      }

      if (cancelled) return;

      if (fromSearch.length > 0) {
        setVehicleOptions(
          fromSearch.map((v) => ({
            ...v,
            capacity: capacityByName.get(v.name.toLowerCase()) ?? 4,
          }))
        );
      } else {
        setVehicleOptions(fleet);
      }
      setVehiclesLoading(false);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [session?.id, session?.special_requests]);

  const vehicleSelectOptions = useMemo(() => {
    const list = [...vehicleOptions];
    const current = vehicleType.trim();
    if (
      current &&
      !list.some((v) => v.name.toLowerCase() === current.toLowerCase())
    ) {
      list.unshift({
        name: current,
        fareText: quotedFare != null ? `₹${quotedFare}` : '—',
        fareAmount: quotedFare,
        capacity: Math.max(1, Number(passengers) || 4),
      });
    }
    return list;
  }, [vehicleOptions, vehicleType, quotedFare, passengers]);

  const selectedVehicleCapacity = useMemo(() => {
    const opt = vehicleSelectOptions.find(
      (v) => v.name.toLowerCase() === vehicleType.trim().toLowerCase()
    );
    return opt?.capacity && opt.capacity > 0 ? opt.capacity : null;
  }, [vehicleSelectOptions, vehicleType]);

  const handlePickupLocationChange = (loc: Location) => {
    setPickupLocation(loc);
    setPickup(locationLabel(loc));
  };

  const handleDropLocationChange = (loc: Location) => {
    setDropLocation(loc);
    setDrop(locationLabel(loc));
  };

  const handleVehicleSelect = (name: string) => {
    setVehicleType(name);
    const opt = vehicleSelectOptions.find(
      (v) => v.name.toLowerCase() === name.toLowerCase()
    );
    if (opt?.fareAmount != null) {
      setQuotedFare(opt.fareAmount);
    }
    if (opt?.capacity && opt.capacity > 0) {
      setPassengers(String(opt.capacity));
    }
  };

  const locationTripType = inferSessionTripType(session?.special_requests);

  useEffect(() => {
    if (!session || isSmartBudgetTerminal(session.status)) return;
    const id = window.setInterval(() => void refresh(), SMART_BUDGET_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [session, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [refresh]);

  const validateBudgetForm = (): boolean => {
    const amount = Number(budget);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid budget');
      return false;
    }
    const specialBlob = `${session?.special_requests || ''} ${notes}`.toLowerCase();
    const isCustom = specialBlob.includes('custom itinerary');
    const minBudget = smartBudgetMinBudgetFromWebsiteFare(quotedFare ?? session?.quoted_fare, {
      isCustomItinerary: isCustom,
      minPercent: budgetMinPercent,
    });
    if (minBudget != null && amount < minBudget) {
      toast.error(`Budget must be at least ₹${minBudget.toLocaleString('en-IN')}`);
      return false;
    }
    if (!name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').slice(-10).length < 10) {
      toast.error('Enter a valid 10-digit WhatsApp number');
      return false;
    }
    if (!pickup.trim() || !drop.trim()) {
      toast.error('Pickup and drop are required');
      return false;
    }
    if (!tripDate) {
      toast.error('Pick trip date & time');
      return false;
    }
    if (!vehicleType.trim()) {
      toast.error('Vehicle is required');
      return false;
    }
    const pax = Math.max(1, Number(passengers) || 1);
    if (selectedVehicleCapacity != null && pax > selectedVehicleCapacity) {
      toast.error(
        `${vehicleType} seats up to ${selectedVehicleCapacity} passengers`
      );
      return false;
    }
    const cleanNotes = stripSystemTripMeta(notes);
    const notesGuard = validateSmartBudgetSpecialRequests(cleanNotes);
    if (!notesGuard.ok) {
      toast.error(notesGuard.reason);
      return false;
    }
    return true;
  };

  const sendOtp = async () => {
    if (!validateBudgetForm()) return false;
    setSendingOtp(true);
    try {
      const result = await smartBudgetAPI.public.sendSubmitOtp(token, phone.trim());
      setOtpStep(true);
      setOtp('');
      if (result.dev_otp) {
        toast.message(`Dev OTP: ${result.dev_otp}`);
      } else {
        toast.success(result.message || 'OTP sent to WhatsApp');
      }
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send OTP');
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    await sendOtp();
  };

  const handleConfirmWithOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateBudgetForm()) return;
    if (otp.trim().length !== 6) {
      toast.error('Enter the 6-digit OTP');
      return;
    }
    setSubmitting(true);
    try {
      const systemMeta = extractSystemTripMeta(session?.special_requests);
      const cleanNotes = stripSystemTripMeta(notes);
      const mergedNotes = [systemMeta, cleanNotes].filter(Boolean).join(' · ');
      const updated = await smartBudgetAPI.public.submitBudget({
        token,
        customer_budget: Number(budget),
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        otp: otp.trim(),
        special_requests: mergedNotes || undefined,
        pickup: pickup.trim(),
        drop_location: drop.trim(),
        trip_datetime: format(tripDate!, "yyyy-MM-dd'T'HH:mm"),
        vehicle_type: vehicleType.trim(),
        passengers: Math.max(1, Number(passengers) || 1),
      });
      applySessionFields(updated);
      setOtpStep(false);
      setEditingTrip(false);
      toast.success('Offer received — we\'re reviewing your request');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!session || !canSmartBudgetCancel(session.status)) return;
    const ok = window.confirm('Cancel this ride request? This cannot be undone.');
    if (!ok) return;
    setCancelling(true);
    try {
      const result = await smartBudgetAPI.public.cancelSession(token);
      setSession(result.session);
      toast.success('Ride cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8f6]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Offer unavailable</AlertTitle>
          <AlertDescription>{error || 'This link is invalid or has expired.'}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={() => void refresh()}>
          Try again
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link to="/smart-budget/customer">My trips</Link>
        </Button>
      </div>
    );
  }

  const needsBudget = session.status === 'link_sent' || session.customer_budget == null;
  const canEditTrip = needsBudget && !isSmartBudgetTerminal(session.status);
  const chatReady = canSmartBudgetChat(session.status);
  const sessionIsCustom = (session.special_requests || '').toLowerCase().includes('custom itinerary');
  const displayFare = quotedFare ?? session.quoted_fare;
  const sessionMinBudget = smartBudgetMinBudgetFromWebsiteFare(displayFare, {
    isCustomItinerary: sessionIsCustom,
    minPercent: budgetMinPercent,
  });
  const displayPickup = pickup || session.pickup;
  const displayDrop = drop || session.drop_location;
  const displayWhen = tripDate
    ? format(tripDate, "d MMM yyyy, h:mm a")
    : (() => {
        try {
          return new Date(session.trip_datetime).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {
          return session.trip_datetime;
        }
      })();
  const displayVehicle = vehicleType || session.vehicle_type;
  const displayPax = Math.max(1, Number(passengers) || session.passengers);
  const { tripType: displayTripType, kilometers: displayKilometers } = parseTripSummaryMeta(
    session.special_requests
  );
  const showOfferTimer =
    !isSmartBudgetAwaitingFee(session) &&
    !['fee_paid', 'completed', 'expired', 'cancelled'].includes(session.status);

  const trustItems = [
    'No payment required now',
    'Reviewed within 5–15 minutes',
    'Edit your trip before submitting',
    'Confirmation via WhatsApp',
  ];

  const howSteps = [
    'Review your trip',
    'Enter your budget',
    'We review your request',
    'If accepted, you\'ll get a WhatsApp message',
    'Pay the advance booking fee',
    'Contact details are shared',
  ];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f7f5_0%,#ffffff_42%,#eef7f1_100%)] pb-28 sm:pb-10">
      <header className="border-b border-emerald-100/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-3 px-4 py-5 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
              Vizag Taxi Hub
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-emerald-900 sm:text-[1.75rem]">
              Offer Your Price
            </h1>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
              Found the fare a little high? Tell us your preferred budget and we&apos;ll review your
              request.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 border-sky-200 text-xs text-sky-800 hover:bg-sky-50"
            >
              <Link to="/smart-budget/customer">My trips</Link>
            </Button>
            {isSmartBudgetAwaitingFee(session) && session.fee_due_at ? (
              <SmartBudgetCountdown
                expiresAt={session.fee_due_at}
                label="Pay fee by"
                variant="offer"
                onExpire={() => void refresh()}
              />
            ) : showOfferTimer ? (
              <SmartBudgetCountdown
                expiresAt={session.link_expires_at}
                label="Offer expires in"
                variant="offer"
                onExpire={() => void refresh()}
              />
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {/* Trip summary / edit */}
        <section className="rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6">
          {editingTrip && canEditTrip ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-base font-semibold text-slate-900">Edit Trip Details</p>
                  <p className="text-xs text-slate-500">Update pickup, drop, time or vehicle</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-full"
                  onClick={() => setEditingTrip(false)}
                >
                  Done
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 sm:col-span-2">
                  <LocationInput
                    id="sb-pickup"
                    label="Pickup"
                    placeholder="Search pickup on Google Maps"
                    value={
                      pickupLocation ? convertToApiLocation(pickupLocation) : undefined
                    }
                    onLocationChange={handlePickupLocationChange}
                    isPickupLocation
                    tripType={locationTripType}
                    variant="infield"
                    className="px-3 py-2"
                    required
                  />
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 sm:col-span-2">
                  <LocationInput
                    id="sb-drop"
                    label="Drop"
                    placeholder="Search drop on Google Maps"
                    value={dropLocation ? convertToApiLocation(dropLocation) : undefined}
                    onLocationChange={handleDropLocationChange}
                    isPickupLocation={false}
                    tripType={locationTripType}
                    variant="infield"
                    className="px-3 py-2"
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <DateTimePicker
                    label="Date & Time"
                    date={tripDate}
                    onDateChange={setTripDate}
                    minDate={new Date()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sb-vehicle">Vehicle</Label>
                  <div className="relative">
                    <select
                      id="sb-vehicle"
                      className={cn(
                        'flex h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
                        'disabled:cursor-not-allowed disabled:opacity-50'
                      )}
                      value={vehicleType}
                      onChange={(e) => handleVehicleSelect(e.target.value)}
                      required
                      disabled={vehiclesLoading && vehicleSelectOptions.length === 0}
                    >
                      <option value="">
                        {vehiclesLoading
                          ? 'Loading vehicles…'
                          : vehicleSelectOptions.length > 0
                            ? 'Select vehicle'
                            : 'No vehicles available'}
                      </option>
                      {vehicleSelectOptions.map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.fareAmount != null
                            ? `${v.name} · ₹${v.fareAmount.toLocaleString('en-IN')}`
                            : v.name}
                          {v.capacity ? ` · ${v.capacity} seats` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sb-pax">
                    Passengers
                    {selectedVehicleCapacity ? ` (max ${selectedVehicleCapacity})` : ''}
                  </Label>
                  <Input
                    id="sb-pax"
                    type="number"
                    min={1}
                    max={selectedVehicleCapacity ?? undefined}
                    className="h-11 rounded-xl"
                    value={passengers}
                    onChange={(e) => {
                      const next = e.target.value;
                      const n = Number(next);
                      if (
                        selectedVehicleCapacity != null &&
                        Number.isFinite(n) &&
                        n > selectedVehicleCapacity
                      ) {
                        setPassengers(String(selectedVehicleCapacity));
                        return;
                      }
                      setPassengers(next);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">Trip Summary</h2>
                {canEditTrip ? (
                  <button
                    type="button"
                    onClick={() => setEditingTrip(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 text-emerald-800 transition hover:bg-emerald-50"
                    aria-label="Edit trip details"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Pickup
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium leading-snug text-slate-900">
                    {displayPickup}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Drop
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium leading-snug text-slate-900">
                    {displayDrop}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Date &amp; Time
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium text-slate-900">{displayWhen}</dd>
                </div>
                {displayTripType ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Trip Type
                    </dt>
                    <dd className="mt-1 text-[15px] font-medium text-slate-900">
                      {displayTripType}
                    </dd>
                  </div>
                ) : null}
                {displayKilometers ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Kilometers
                    </dt>
                    <dd className="mt-1 text-[15px] font-medium text-slate-900">
                      {displayKilometers}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Vehicle
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium text-slate-900">{displayVehicle}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Passengers
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium text-slate-900">{displayPax}</dd>
                </div>
              </dl>

              {displayFare != null && Number(displayFare) > 0 ? (
                <div className="rounded-2xl bg-emerald-50/90 px-4 py-4 ring-1 ring-emerald-100">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-700/80">
                    Website Fare
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-emerald-800">
                    ₹{Number(displayFare).toLocaleString('en-IN')}
                  </p>
                  <p className="mt-3 rounded-xl bg-white/80 px-3 py-2.5 text-sm leading-relaxed text-slate-600 ring-1 ring-emerald-100/80">
                    You&apos;re free to offer a lower budget.
                    <br />
                    We&apos;ll review your request before confirming.
                  </p>
                </div>
              ) : null}

              {canEditTrip ? (
                <button
                  type="button"
                  onClick={() => setEditingTrip(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-3 text-left transition hover:bg-emerald-50"
                >
                  <Pencil className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-700">
                      Need to make changes?
                    </span>
                    <span className="block text-sm font-semibold text-emerald-800">
                      Edit Trip Details
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </section>

        {/* Progress / status */}
        {needsBudget && !isSmartBudgetTerminal(session.status) ? (
          <section className="flex gap-3 rounded-[1.25rem] border border-sky-100 bg-sky-50/70 p-4 shadow-sm sm:p-5">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">You&apos;re almost done!</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Review your trip,
                <br className="sm:hidden" /> enter your preferred budget,
                <br className="hidden sm:block" />
                and we&apos;ll review your request.
              </p>
            </div>
          </section>
        ) : (
          <Alert className="rounded-[1.25rem] border-slate-200 bg-white shadow-sm">
            <AlertTitle className="text-slate-900">Update</AlertTitle>
            <AlertDescription className="text-slate-600">
              {waitingCopy(session.status)}
            </AlertDescription>
          </Alert>
        )}

        {session.status === 'admin_priority' && (
          <SmartBudgetCountdown
            expiresAt={session.admin_priority_ends_at}
            label="We're reviewing"
            variant="offer"
            onExpire={() => void refresh()}
          />
        )}
        {session.status === 'marketplace' && (
          <SmartBudgetCountdown
            expiresAt={session.marketplace_expires_at || session.link_expires_at}
            label="Matching partners"
            variant="offer"
            onExpire={() => void refresh()}
          />
        )}

        {needsBudget && !isSmartBudgetTerminal(session.status) && (
          <form
            onSubmit={(e) => void (otpStep ? handleConfirmWithOtp(e) : handleRequestOtp(e))}
            className="space-y-5 rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] sm:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">What&apos;s your budget?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Share the amount you&apos;re comfortable paying for this trip.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget" className="text-slate-700">
                Your Preferred Budget <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                  ₹
                </span>
                <Input
                  id="budget"
                  type="number"
                  min={sessionMinBudget ?? 1}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  required
                  placeholder="Enter your budget"
                  disabled={otpStep}
                  className="h-12 rounded-xl pl-8 text-base font-semibold"
                />
              </div>
              {sessionMinBudget != null ? (
                <p className="text-sm text-slate-500">
                  Minimum Offer:{' '}
                  <span className="font-semibold text-emerald-800">
                    ₹{sessionMinBudget.toLocaleString('en-IN')}
                  </span>
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cname" className="text-slate-700">
                  Your Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={otpStep}
                  placeholder="Enter your name"
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cphone" className="text-slate-700">
                  WhatsApp Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cphone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={otpStep}
                  placeholder="10-digit mobile number"
                  className="h-11 rounded-xl"
                />
                <p className="text-xs leading-relaxed text-slate-500">
                  We&apos;ll only use this for trip updates and confirmation.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-700">
                Anything you&apos;d like us to know?
              </Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={otpStep}
                placeholder="Child seat, extra luggage, multiple stops, etc."
                className="rounded-xl"
              />
            </div>

            {/* Trust strip */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-emerald-50/70 p-3 ring-1 ring-emerald-100 sm:grid-cols-4 sm:gap-3 sm:p-4">
              {trustItems.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-xs font-medium leading-snug text-slate-700 sm:text-[13px]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {otpStep ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <p className="text-sm text-emerald-950">
                  Enter the 6-digit code sent to WhatsApp <strong>{phone}</strong>
                </p>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="h-12 rounded-xl text-center text-lg font-semibold tracking-[0.4em]"
                  autoFocus
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 flex-1 rounded-xl bg-emerald-600 text-base font-semibold hover:bg-emerald-700"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Confirm my offer
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    disabled={sendingOtp || submitting}
                    onClick={() => setOtpStep(false)}
                  >
                    Edit details
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 rounded-xl"
                    disabled={sendingOtp || submitting}
                    onClick={() => void sendOtp()}
                  >
                    {sendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Resend code
                  </Button>
                </div>
              </div>
            ) : (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-emerald-100 bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <div className="mx-auto max-w-2xl sm:max-w-none">
                  <Button
                    type="submit"
                    disabled={sendingOtp}
                    className="h-12 w-full rounded-xl bg-emerald-600 text-base font-semibold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 sm:shadow-md"
                  >
                    {sendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Continue with WhatsApp
                  </Button>
                </div>
              </div>
            )}
          </form>
        )}

        {needsBudget && !isSmartBudgetTerminal(session.status) && !otpStep ? (
          <section className="rounded-[1.25rem] border border-slate-200/70 bg-white/80 p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-semibold text-slate-900">How it works</h2>
            {/* Mobile stacked */}
            <ol className="mt-4 space-y-0 sm:hidden">
              {howSteps.map((step, i) => (
                <li key={step} className="flex flex-col items-center text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800">
                    {i + 1}
                  </div>
                  <p className="mt-2 max-w-[14rem] text-sm font-medium text-slate-700">{step}</p>
                  {i < howSteps.length - 1 ? (
                    <span className="my-2 text-emerald-400" aria-hidden>
                      ↓
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
            {/* Desktop: 2×3 grid */}
            <ol className="mt-5 hidden sm:grid sm:grid-cols-3 sm:gap-x-3 sm:gap-y-6">
              {howSteps.map((step, i) => (
                <li key={step} className="relative flex flex-col items-center px-2 text-center">
                  {i % 3 !== 2 && i < howSteps.length - 1 ? (
                    <span
                      className="absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-5 h-px bg-emerald-200"
                      aria-hidden
                    />
                  ) : null}
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 ring-4 ring-white">
                    {i + 1}
                  </div>
                  <p className="mt-3 text-sm font-medium leading-snug text-slate-700">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {chatReady && (
          <>
            <SmartBudgetContactsReveal session={session} perspective="customer" />
            <SmartBudgetFeeGate
              session={session}
              onPay={() => navigate(`/smart-budget/s/${token}/pay`)}
            />
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                <Link to={`/smart-budget/s/${token}/chat`}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Open chat
                </Link>
              </Button>
              {canSmartBudgetPayUnlock(session) && (
                <Button asChild variant="outline" className="rounded-xl">
                  <Link to={`/smart-budget/s/${token}/pay`}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay booking fee
                  </Link>
                </Button>
              )}
              {canSmartBudgetCancel(session.status) && (
                <Button
                  type="button"
                  variant="destructive"
                  className="rounded-xl"
                  disabled={cancelling}
                  onClick={() => void handleCancel()}
                >
                  {cancelling ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  Cancel ride
                </Button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

