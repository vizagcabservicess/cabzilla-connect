import '@/lib/fonts-poppins';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Helmet } from 'react-helmet-async';
import { format } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Car,
  ChevronRight,
  Clock,
  Fuel,
  Globe2,
  IndianRupee,
  Leaf,
  Lock,
  MapPin,
  Minus,
  Moon,
  Plus,
  ShieldCheck,
  Sun,
  Sunset,
  UserCheck,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { VIZAG_TAXI_HUB_PHONE_E164 } from '@/utils/whatsappPrefillMessage';

const PAGE_URL = 'https://vizagtaxihub.com/local-carpooling';

const CARPOOL_STOPS = [
  { name: 'NAD Junction', area: 'NSTL / Shanti Nagar' },
  { name: 'Marripalem', area: 'Marripalem Main Rd' },
  { name: 'Kancharapalem', area: 'Kancharapalem Jn' },
  { name: 'Akkayapalem', area: 'Akkayapalem Circle' },
  { name: 'Gurudwara', area: 'Seethammadara' },
  { name: 'Satyam Junction', area: 'Balayya Sastri Layout' },
  { name: 'Maddilapalem', area: 'Maddilapalem Main' },
  { name: 'MVP Colony', area: 'MVP Colony' },
  { name: 'Rushikonda', area: 'Beach Road' },
  { name: 'IT SEZ Madhurwada', area: 'Startup Village (final stop)' },
] as const;

/** Minutes after shift base time per stop (spec). */
const STOP_OFFSET_MINUTES = [0, 7, 14, 20, 25, 28, 32, 37, 50, 60] as const;

/** WhatsApp / brand green (mockup). */
const WA_GREEN = '#25D366';
/** Hero accent green — city line (reference banner). */
const HERO_LIME = '#39D353';
/** Dark card header green. */
const CARD_GREEN = '#0d4f3c';
const LINE_BASE = '#bbf7d0';
const DROP_TEAL = '#0f766e';

/** Monthly budget slider (₹) — shared commute comfort range. */
const COMMUTE_BUDGET_MIN = 400;
const COMMUTE_BUDGET_MAX = 12000;
/** Step 100 so max and common picks (e.g. ₹4,000) align with min ₹400. */
const COMMUTE_BUDGET_STEP = 100;
const COMMUTE_BUDGET_DEFAULT = 4000;

function clampCommuteBudget(value: number): number {
  const v = Math.min(COMMUTE_BUDGET_MAX, Math.max(COMMUTE_BUDGET_MIN, value));
  const snapped =
    COMMUTE_BUDGET_MIN +
    Math.round((v - COMMUTE_BUDGET_MIN) / COMMUTE_BUDGET_STEP) * COMMUTE_BUDGET_STEP;
  return Math.min(COMMUTE_BUDGET_MAX, Math.max(COMMUTE_BUDGET_MIN, snapped));
}

type ShiftId = 'morning' | 'general' | 'afternoon' | 'evening' | 'night';

type ShiftTabConfig = {
  id: ShiftId;
  label: string;
  shortLabel: string;
  hour: number;
  minute: number;
  Icon: LucideIcon;
  /** Icon tint when tab is inactive (reference chips). */
  iconMutedClass: string;
};

const SHIFT_TABS: readonly ShiftTabConfig[] = [
  {
    id: 'morning',
    label: 'Morning (8 AM)',
    shortLabel: 'Morning · 8 AM',
    hour: 8,
    minute: 0,
    Icon: Sun,
    iconMutedClass: 'text-amber-500',
  },
  {
    id: 'general',
    label: 'General (10 AM)',
    shortLabel: 'General · 10 AM',
    hour: 10,
    minute: 0,
    Icon: Globe2,
    iconMutedClass: 'text-sky-600',
  },
  {
    id: 'afternoon',
    label: 'Afternoon (2 PM)',
    shortLabel: 'Afternoon · 2 PM',
    hour: 14,
    minute: 0,
    Icon: Sunset,
    iconMutedClass: 'text-orange-500',
  },
  {
    id: 'evening',
    label: 'Evening (5 PM)',
    shortLabel: 'Evening · 5 PM',
    hour: 17,
    minute: 0,
    Icon: Building2,
    iconMutedClass: 'text-violet-600',
  },
  {
    id: 'night',
    label: 'Night (9 PM)',
    shortLabel: 'Night · 9 PM',
    hour: 21,
    minute: 0,
    Icon: Moon,
    iconMutedClass: 'text-slate-500',
  },
];

function shiftToTimeValue(tab: { hour: number; minute: number }): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(tab.hour)}:${p(tab.minute)}`;
}

/** Pickup dropdown options — one per shift (reference times only; keeps list short). */
const SHIFT_PICKUP_OPTIONS: { value: string; label: string }[] = SHIFT_TABS.map((t) => {
  const d = new Date();
  d.setHours(t.hour, t.minute, 0, 0);
  return { value: shiftToTimeValue(t), label: format(d, 'hh:mm a') };
});

type CommuteSchedule =
  | 'daily'
  | 'weekly'
  | 'mon-fri'
  | 'mon-sat'
  | 'three-four'
  | 'irregular'
  | 'as-needed';

type GroupPreference = 'mixed' | 'women' | 'men';

function commuteScheduleLabel(s: CommuteSchedule): string {
  switch (s) {
    case 'daily':
      return '📅 Daily';
    case 'weekly':
      return '📆 Weekly';
    case 'mon-fri':
      return '💼 Mon–Fri';
    case 'mon-sat':
      return '📋 Mon–Sat';
    case 'three-four':
      return '🗓 3–4 Days';
    case 'irregular':
      return '🔀 Irregular';
    case 'as-needed':
      return '📌 As Needed';
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

function groupPreferenceLabel(g: GroupPreference): string {
  switch (g) {
    case 'mixed':
      return '👥 Mixed Group';
    case 'women':
      return '👩 Women Only';
    case 'men':
      return '👨 Men Only';
    default: {
      const _exhaustive: never = g;
      return _exhaustive;
    }
  }
}

/** Chip labels without emoji (mockup). */
function commuteChipLabel(s: CommuteSchedule): string {
  switch (s) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'mon-fri':
      return 'Mon–Fri';
    case 'mon-sat':
      return 'Mon–Sat';
    case 'three-four':
      return '3–4 Days';
    case 'irregular':
      return 'Irregular';
    case 'as-needed':
      return 'As Needed';
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

function groupChipLabel(g: GroupPreference): string {
  switch (g) {
    case 'mixed':
      return 'Mixed Group';
    case 'women':
      return 'Women Only';
    case 'men':
      return 'Men Only';
    default: {
      const _exhaustive: never = g;
      return _exhaustive;
    }
  }
}

type DotKind = 'idle' | 'pickup' | 'drop' | 'between';

function RouteStopDot({ kind }: { kind: DotKind }) {
  const outer: CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    flexShrink: 0,
  };

  if (kind === 'idle') {
    outer.border = `2px solid ${LINE_BASE}`;
    outer.background = '#ffffff';
  } else if (kind === 'pickup') {
    outer.border = `2px solid ${WA_GREEN}`;
    outer.background = WA_GREEN;
  } else if (kind === 'drop') {
    outer.border = `2px solid ${DROP_TEAL}`;
    outer.background = DROP_TEAL;
  } else {
    outer.border = `2px solid #86efac`;
    outer.background = '#dcfce7';
  }

  return (
    <div style={outer} aria-hidden>
      {(kind === 'pickup' || kind === 'drop') && (
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#ffffff',
          }}
        />
      )}
    </div>
  );
}

function formatShiftStopTimes(
  shift: (typeof SHIFT_TABS)[number],
): { stop: string; timeLabel: string }[] {
  const base = new Date();
  base.setHours(shift.hour, shift.minute, 0, 0);
  return CARPOOL_STOPS.map((s, i) => {
    const totalMin = STOP_OFFSET_MINUTES[i] ?? 0;
    const d = new Date(base.getTime() + totalMin * 60_000);
    const timeLabel = format(d, 'h:mm a');
    return { stop: s.name, timeLabel };
  });
}

function validateIndianMobileDigits(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}

function buildCarpoolWhatsAppMessage(payload: {
  fullName: string;
  waDigits: string;
  company: string;
  seats: number;
  pickupTime: string;
  pickupStop: string;
  dropStop: string;
  shiftLabel: string;
  schedule: CommuteSchedule;
  weeklyDays: number[];
  group: GroupPreference;
  note: string;
  monthlyBudgetApprox: number;
  stopTimes: { stop: string; timeLabel: string }[];
}): string {
  const lines = [
    '*Local Carpool Enquiry — Vizag Taxi Hub*',
    '',
    `Name: ${payload.fullName}`,
    `WhatsApp: +91${payload.waDigits}`,
    `Company / Organisation: ${payload.company}`,
    `Pickup stop: ${payload.pickupStop}`,
    `Drop-off stop: ${payload.dropStop}`,
    `Shift: ${payload.shiftLabel}`,
    `Expected pickup time: ${payload.pickupTime}`,
    `Seats required: ${payload.seats}`,
    `Approx. monthly commute budget (comfort): ₹${payload.monthlyBudgetApprox.toLocaleString('en-IN')}`,
    `Commute schedule: ${commuteScheduleLabel(payload.schedule)}`,
  ];

  if (payload.schedule === 'weekly' && payload.weeklyDays.length > 0) {
    const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const picked = payload.weeklyDays
      .slice()
      .sort((a, b) => a - b)
      .map((i) => dayLetters[i])
      .join(', ');
    lines.push(`Weekly days: ${picked}`);
  }

  lines.push(`Group preference: ${groupPreferenceLabel(payload.group)}`);

  if (payload.note.trim()) {
    lines.push(`Special note: ${payload.note.trim()}`);
  }

  lines.push('', '*Reference — indicative times along route for selected shift:*');
  for (const row of payload.stopTimes) {
    lines.push(`• ${row.stop}: ${row.timeLabel}`);
  }

  lines.push('', 'I agree to join the Vizag Taxi Hub carpool WhatsApp group for updates.');

  return lines.join('\n');
}

export default function LocalCarpoolingPage() {
  const { toast } = useToast();
  const todayLabel = useMemo(() => format(new Date(), 'dd MMM yyyy'), []);

  const [shiftId, setShiftId] = useState<ShiftId>('morning');
  const shift = useMemo(() => SHIFT_TABS.find((s) => s.id === shiftId) ?? SHIFT_TABS[0], [shiftId]);

  const [pickupIndex, setPickupIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const [fullName, setFullName] = useState('');
  const [waDigits, setWaDigits] = useState('');
  const [company, setCompany] = useState('');
  const [seats, setSeats] = useState(1);
  const [pickupTime, setPickupTime] = useState('08:00');
  const [commuteSchedule, setCommuteSchedule] = useState<CommuteSchedule>('daily');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [groupPreference, setGroupPreference] = useState<GroupPreference>('mixed');
  const [specialNote, setSpecialNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [monthlyBudgetApprox, setMonthlyBudgetApprox] = useState(COMMUTE_BUDGET_DEFAULT);
  /** Raw digits while typing budget; `null` = show committed `monthlyBudgetApprox`. */
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null);

  const routeWrapRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [routeLines, setRouteLines] = useState({
    baseTop: 0,
    baseHeight: 0,
    fillTop: 0,
    fillHeight: 0,
    showFill: false,
  });

  const setRowRef = useCallback((i: number, el: HTMLLIElement | null) => {
    rowRefs.current[i] = el;
  }, []);

  const measureRouteLines = useCallback(() => {
    const wrap = routeWrapRef.current;
    if (!wrap) return;
    const first = rowRefs.current[0];
    const last = rowRefs.current[CARPOOL_STOPS.length - 1];
    if (!first || !last) return;

    const w = wrap.getBoundingClientRect();
    const fr = first.getBoundingClientRect();
    const lr = last.getBoundingClientRect();
    const firstCenterY = fr.top + fr.height / 2 - w.top;
    const lastCenterY = lr.top + lr.height / 2 - w.top;
    const baseTop = Math.min(firstCenterY, lastCenterY);
    const baseHeight = Math.max(Math.abs(lastCenterY - firstCenterY), 0);

    let fillTop = 0;
    let fillHeight = 0;
    let showFill = false;
    if (pickupIndex !== null && dropIndex !== null) {
      const pe = rowRefs.current[pickupIndex];
      const de = rowRefs.current[dropIndex];
      if (pe && de) {
        const pr = pe.getBoundingClientRect();
        const dr = de.getBoundingClientRect();
        const pc = pr.top + pr.height / 2 - w.top;
        const dc = dr.top + dr.height / 2 - w.top;
        fillTop = Math.min(pc, dc);
        fillHeight = Math.max(Math.abs(dc - pc), 0);
        showFill = true;
      }
    }

    setRouteLines((prev) => {
      if (
        prev.baseTop === baseTop &&
        prev.baseHeight === baseHeight &&
        prev.fillTop === fillTop &&
        prev.fillHeight === fillHeight &&
        prev.showFill === showFill
      ) {
        return prev;
      }
      return { baseTop, baseHeight, fillTop, fillHeight, showFill };
    });
  }, [pickupIndex, dropIndex]);

  useLayoutEffect(() => {
    measureRouteLines();
    const t = requestAnimationFrame(() => measureRouteLines());
    return () => cancelAnimationFrame(t);
  }, [measureRouteLines, pickupIndex, dropIndex]);

  useEffect(() => {
    window.addEventListener('resize', measureRouteLines);
    const el = routeWrapRef.current;
    const ro =
      el && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => measureRouteLines())
        : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener('resize', measureRouteLines);
      ro?.disconnect();
    };
  }, [measureRouteLines]);

  const pickupName = pickupIndex !== null ? CARPOOL_STOPS[pickupIndex]?.name : null;
  const dropName = dropIndex !== null ? CARPOOL_STOPS[dropIndex]?.name : null;

  const onStopClick = (index: number) => {
    if (pickupIndex === null) {
      setPickupIndex(index);
      setDropIndex(null);
      return;
    }

    if (dropIndex === null) {
      if (index === pickupIndex) {
        setPickupIndex(null);
        setDropIndex(null);
        return;
      }
      const a = pickupIndex;
      const b = index;
      const low = Math.min(a, b);
      const high = Math.max(a, b);
      setPickupIndex(low);
      setDropIndex(high);
      return;
    }

    if (index === pickupIndex) {
      setPickupIndex(null);
      setDropIndex(null);
      return;
    }
    if (index === dropIndex) {
      setDropIndex(null);
      return;
    }
    setPickupIndex(index);
    setDropIndex(null);
  };

  const resetForm = () => {
    setShiftId('morning');
    setPickupIndex(null);
    setDropIndex(null);
    setFullName('');
    setWaDigits('');
    setCompany('');
    setSeats(1);
    setPickupTime('08:00');
    setCommuteSchedule('daily');
    setWeeklyDays([]);
    setGroupPreference('mixed');
    setSpecialNote('');
    setConsent(false);
    setMonthlyBudgetApprox(COMMUTE_BUDGET_DEFAULT);
    setBudgetDraft(null);
  };

  const swapStops = () => {
    if (pickupIndex !== null && dropIndex !== null) {
      const p = pickupIndex;
      const d = dropIndex;
      setPickupIndex(d);
      setDropIndex(p);
    }
  };

  const stopStyles = useMemo(() => {
    return CARPOOL_STOPS.map((_, i) => {
      if (pickupIndex !== null && i === pickupIndex) return { dot: 'pickup' as const };
      if (dropIndex !== null && i === dropIndex) return { dot: 'drop' as const };
      if (
        pickupIndex !== null &&
        dropIndex !== null &&
        i > pickupIndex &&
        i < dropIndex
      ) {
        return { dot: 'between' as const };
      }
      return { dot: 'idle' as const };
    });
  }, [pickupIndex, dropIndex]);

  const stopTimes = useMemo(() => formatShiftStopTimes(shift), [shift]);

  const pickupTimeLabel = useMemo(() => {
    const opt = SHIFT_PICKUP_OPTIONS.find((o) => o.value === pickupTime);
    return opt?.label ?? pickupTime;
  }, [pickupTime]);

  const handleSubmit = () => {
    const missing: string[] = [];
    if (pickupIndex === null || dropIndex === null) missing.push('Pickup and drop-off stops');
    if (!fullName.trim()) missing.push('Full name');
    if (!validateIndianMobileDigits(waDigits.trim())) missing.push('Valid 10-digit WhatsApp (starts 6–9)');
    if (!company.trim()) missing.push('Company / Organisation');
    if (!pickupTime.trim()) missing.push('Pickup time');
    if (commuteSchedule === 'weekly' && weeklyDays.length === 0) {
      missing.push('At least one weekday (for Weekly schedule)');
    }
    if (!consent) missing.push('Consent to WhatsApp group');

    if (missing.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Please complete the form',
        description: missing.join(' · '),
      });
      return;
    }

    const message = buildCarpoolWhatsAppMessage({
      fullName: fullName.trim(),
      waDigits: waDigits.trim(),
      company: company.trim(),
      seats,
      pickupTime: pickupTimeLabel,
      pickupStop: CARPOOL_STOPS[pickupIndex!]!.name,
      dropStop: CARPOOL_STOPS[dropIndex!]!.name,
      shiftLabel: shift.shortLabel,
      schedule: commuteSchedule,
      weeklyDays,
      group: groupPreference,
      note: specialNote,
      monthlyBudgetApprox,
      stopTimes,
    });

    const url = `https://wa.me/${VIZAG_TAXI_HUB_PHONE_E164}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const scheduleOptions: CommuteSchedule[] = [
    'daily',
    'weekly',
    'mon-fri',
    'mon-sat',
    'three-four',
    'irregular',
    'as-needed',
  ];

  const toggleWeeklyDay = (dayIndex: number) => {
    setWeeklyDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex].sort((a, b) => a - b),
    );
  };

  return (
    <>
      <Helmet>
        <title>Local Carpooling in Visakhapatnam | NAD to IT SEZ | Vizag Taxi Hub</title>
        <meta
          name="description"
          content="Share your daily commute in Vizag — NAD to IT SEZ Madhurwada carpool route. Fixed stops, verified commuters, split fuel costs. Enquire via WhatsApp with Vizag Taxi Hub."
        />
        <link rel="canonical" href={PAGE_URL} />
        <meta property="og:url" content={PAGE_URL} />
        <meta property="og:title" content="Local Carpooling in Visakhapatnam | Vizag Taxi Hub" />
        <meta
          property="og:description"
          content="Office commute carpool along NAD → IT SEZ. Save fuel, reduce traffic, fixed pickup stops."
        />
      </Helmet>

      <div className="min-h-screen w-full max-w-full bg-[#f4f6f8] max-lg:overflow-x-hidden" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <Navbar />

        {/* Hero — extra top padding clears fixed Navbar + safe-area */}
        <section
          className="relative isolate flex min-h-[min(100dvh,28rem)] items-center overflow-hidden border-b border-white/5 pt-[max(4.75rem,env(safe-area-inset-top,0px)+3.25rem)] pb-8 max-lg:min-h-[22rem] max-lg:pb-6 md:min-h-[460px] md:pb-10 lg:min-h-[500px] lg:pb-12"
          style={{
            backgroundColor: '#0b1020',
            backgroundImage:
              'linear-gradient(92deg, rgb(11, 16, 32) 0%, rgba(11, 16, 32, 0.93) 28%, rgba(13, 18, 36, 0.68) 52%, rgba(18, 24, 42, 0.28) 76%, rgba(22, 28, 48, 0.06) 100%), url(https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=2400&q=85)',
            backgroundSize: 'cover',
            backgroundPosition: '72% center',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0b1020] via-[#0b1020]/40 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-[#080c18]/70"
            aria-hidden
          />

          <div className="relative z-[1] mx-auto w-full max-w-[1600px] px-4 pb-10 pt-2 sm:px-5 md:px-8 md:pb-14 md:pt-3 lg:pb-16 lg:pl-[clamp(2rem,11vw,7.5rem)] lg:pr-14 lg:pt-4">
            <div
              className="flex w-full max-w-[42rem] flex-col items-start text-left antialiased"
              style={{
                fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              <h1 className="m-0 p-0 tracking-[-0.025em]">
                <span className="block text-[clamp(2rem,4.8vw,3.15rem)] font-bold leading-[1.08] text-white">
                  Local Carpooling in
                </span>
                <span
                  className="mt-1 block text-[clamp(2rem,4.8vw,3.15rem)] font-bold leading-[1.08]"
                  style={{ color: HERO_LIME }}
                >
                  Visakhapatnam
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-[0.9375rem] font-normal leading-relaxed text-white md:text-[1rem]">
                Share your daily office commute, split fuel costs, reduce traffic
              </p>

              <div className="mt-8 flex w-full max-w-full flex-row flex-wrap items-stretch gap-2.5 sm:mt-10 sm:gap-3">
                {[
                  { Icon: Fuel, text: '40% Fuel Savings' },
                  { Icon: IndianRupee, text: '₹3K+ Monthly Save' },
                  { Icon: MapPin, text: '10 Pickup Stops' },
                  { Icon: Car, text: '40 min NAD → IT SEZ' },
                ].map(({ Icon, text }) => (
                  <span
                    key={text}
                    className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/18 bg-black/45 px-3.5 py-2.5 text-[13px] font-medium leading-none text-white backdrop-blur-md sm:px-4"
                  >
                    <Icon className="h-4 w-4 shrink-0 self-center text-white" strokeWidth={2} aria-hidden />
                    <span className="min-w-0 leading-tight">{text}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <main className="mx-auto w-full min-w-0 max-w-[1600px] px-4 pb-10 pt-3 max-lg:pt-4 sm:px-5 md:px-8 md:pb-14 lg:px-8 lg:pb-14 lg:pl-[clamp(2rem,11vw,7.5rem)] lg:pr-14 lg:pt-14">
          <div className="mx-auto grid min-w-0 w-full max-w-full max-lg:grid-cols-1 max-lg:gap-y-8 lg:grid-cols-2 lg:grid-rows-[auto_auto] lg:items-start lg:gap-x-12 lg:gap-y-8">
            {/* Booking card — mobile-first: form directly under hero; strip + info follow (see grid-row). */}
            <div className="min-w-0 max-w-full max-lg:row-start-1 scroll-mt-[5rem] lg:col-start-2 lg:row-start-2 lg:self-start lg:sticky lg:top-20">
              <Card
                id="carpool-booking-card"
                className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] max-lg:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.14)]"
              >
                <div className="min-w-0 w-full border-b border-slate-100 bg-[#f8fafb] px-3 py-3 lg:px-4 lg:py-4">
                  <div className="flex min-w-0 w-full max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain pb-1 [-webkit-overflow-scrolling:touch] lg:flex-wrap lg:gap-2 lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80">
                    {SHIFT_TABS.map((tab) => {
                      const Icon = tab.Icon;
                      const active = shiftId === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setShiftId(tab.id);
                            setPickupTime(shiftToTimeValue(tab));
                          }}
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-xs font-semibold transition-all sm:gap-2 sm:px-3 sm:text-sm',
                            active
                              ? 'bg-[#25D366] text-white shadow-md shadow-green-500/25'
                              : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50',
                          )}
                        >
                          <Icon
                            className={cn('h-4 w-4 shrink-0 self-center', active ? 'text-white' : tab.iconMutedClass)}
                            aria-hidden
                          />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="relative border-b border-white/10 px-4 pb-5 pt-5 text-white max-lg:px-4 sm:px-5 sm:pb-6 sm:pt-6"
                  style={{ backgroundColor: CARD_GREEN }}
                >
                  <button
                    type="button"
                    onClick={resetForm}
                    className="absolute right-3 top-3 z-[2] rounded-full p-1.5 text-white/80 hover:bg-white/10 hover:text-white sm:right-4 sm:top-4"
                    aria-label="Reset form"
                  >
                    ✕
                  </button>

                  <div className="flex flex-col gap-2.5 pr-11 sm:flex-row sm:items-center sm:gap-3 sm:pr-12">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                        <Car className="h-5 w-5 text-white" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold leading-tight tracking-tight text-white sm:text-xl md:text-2xl">
                            Local Carpool
                          </h2>
                          <Users className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
                        </div>
                        <p
                          className="mt-1 line-clamp-2 text-sm leading-snug text-white/80 sm:text-white/75"
                          title={pickupName && dropName ? `${pickupName} → ${dropName}` : undefined}
                        >
                          {pickupName && dropName ? `${pickupName} → ${dropName}` : 'Select pickup & drop-off below'}
                        </p>
                      </div>
                    </div>
                    <Badge className="w-fit shrink-0 border-0 bg-[#25D366] px-2.5 py-0.5 text-xs font-bold text-white hover:bg-[#25D366] sm:self-center">
                      ~25 km
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900">
                      {todayLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-black/20 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/15">
                      {shift.shortLabel.replace('·', '-')}
                    </span>
                  </div>

                  <div className="mt-5 flex items-stretch gap-2">
                    <div className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/15 px-3 py-2.5 backdrop-blur-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">Pickup stop</div>
                      <div
                        className={cn(
                          'mt-0.5 truncate text-sm font-semibold',
                          pickupName ? 'text-white' : 'text-white/40',
                        )}
                      >
                        {pickupName ?? 'Tap to select'}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-emerald-400/40 bg-[#25D366]/20 text-white hover:bg-[#25D366]/35 disabled:opacity-35"
                        disabled={pickupIndex === null || dropIndex === null}
                        onClick={swapStops}
                        aria-label="Swap pickup and drop-off"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-white/20 bg-black/15 px-3 py-2.5 backdrop-blur-sm">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/55">Drop-off stop</div>
                      <div
                        className={cn(
                          'mt-0.5 truncate text-sm font-semibold',
                          dropName ? 'text-white' : 'text-white/40',
                        )}
                      >
                        {dropName ?? 'Tap to select'}
                      </div>
                    </div>
                  </div>
                </div>

                <CardContent className="box-border space-y-6 bg-white px-4 pb-5 pt-6 max-lg:space-y-5 max-lg:pb-4 sm:px-6 sm:pb-6">
                  <div ref={routeWrapRef} className="relative">
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 7,
                        top: routeLines.baseTop,
                        width: 2,
                        height: routeLines.baseHeight,
                        background: LINE_BASE,
                        transform: 'translateX(-50%)',
                        pointerEvents: 'none',
                        borderRadius: 1,
                        zIndex: 0,
                      }}
                    />
                    {routeLines.showFill && (
                      <div
                        aria-hidden
                        style={{
                          position: 'absolute',
                          left: 7,
                          top: routeLines.fillTop,
                          width: 3,
                          height: Math.max(routeLines.fillHeight, 0),
                          background: WA_GREEN,
                          transform: 'translateX(-50%)',
                          pointerEvents: 'none',
                          borderRadius: 1,
                          zIndex: 0,
                          opacity: 0.92,
                        }}
                      />
                    )}
                    <ul className="relative z-[1] m-0 list-none p-0">
                      {CARPOOL_STOPS.map((stopRow, i) => {
                        const { dot } = stopStyles[i]!;
                        const isPickup = pickupIndex === i;
                        const isDrop = dropIndex === i;
                        const rowHighlight = dot === 'between' || isPickup || isDrop;
                        const isTerminus = i === CARPOOL_STOPS.length - 1;
                        return (
                          <li
                            key={stopRow.name}
                            ref={(el) => setRowRef(i, el)}
                            className="relative py-1"
                          >
                            <div
                              className="pointer-events-none absolute z-[2] flex items-center justify-center"
                              style={{
                                left: 7,
                                top: '50%',
                                width: 14,
                                height: 14,
                                transform: 'translate(-50%, -50%)',
                              }}
                              aria-hidden
                            >
                              {isTerminus && !isPickup && !isDrop ? (
                                <span className="text-base leading-none" title="IT SEZ">
                                  🏁
                                </span>
                              ) : (
                                <RouteStopDot kind={dot} />
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => onStopClick(i)}
                              className={cn(
                                'relative z-[1] flex w-full items-center gap-2 rounded-xl py-2 pl-9 pr-2 text-left transition-colors',
                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 focus-visible:ring-offset-2',
                                rowHighlight ? 'bg-emerald-50/95' : 'hover:bg-slate-50',
                              )}
                            >
                              <span
                                className={cn(
                                  'min-w-0 flex-1 text-sm font-medium',
                                  isPickup && 'text-emerald-800',
                                  isDrop && 'text-teal-900',
                                  !isPickup && !isDrop && 'text-slate-800',
                                )}
                              >
                                {stopRow.name}
                              </span>
                              {isPickup && (
                                <Badge className="flex-shrink-0 border-0 px-2 py-0 text-[10px] font-semibold text-white hover:opacity-95" style={{ backgroundColor: WA_GREEN }}>
                                  Pickup
                                </Badge>
                              )}
                              {isDrop && (
                                <Badge
                                  className="flex-shrink-0 border-0 px-2 py-0 text-[10px] font-semibold text-white hover:opacity-95"
                                  style={{ backgroundColor: DROP_TEAL }}
                                >
                                  Drop-off
                                </Badge>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 px-4 py-4 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Label id="carpool-budget-label" htmlFor="carpool-budget-input" className="text-sm font-semibold text-[#0B1320]">
                        Daily commute budget
                      </Label>
                      <div
                        id="carpool-budget-value"
                        className="flex h-9 max-w-[9.5rem] shrink-0 overflow-hidden rounded-lg border border-emerald-400/55 bg-white shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-[#25D366]/30 focus-within:ring-offset-2"
                      >
                        <span
                          className="flex h-full shrink-0 items-center justify-center border-r border-emerald-200/70 bg-emerald-50/60 px-2.5 text-emerald-800"
                          aria-hidden
                        >
                          <IndianRupee className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </span>
                        <Input
                          id="carpool-budget-input"
                          className="h-9 min-w-0 flex-1 rounded-none border-0 bg-transparent px-2.5 text-right text-sm font-bold tabular-nums text-[#0B1320] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          inputMode="numeric"
                          autoComplete="off"
                          maxLength={6}
                          value={budgetDraft ?? String(monthlyBudgetApprox)}
                          onFocus={() => setBudgetDraft(String(monthlyBudgetApprox))}
                          onChange={(e) => {
                            const d = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setBudgetDraft(d);
                          }}
                          onBlur={() => {
                            const raw = (budgetDraft ?? String(monthlyBudgetApprox)).replace(/\D/g, '');
                            const parsed = raw === '' ? COMMUTE_BUDGET_MIN : Number.parseInt(raw, 10);
                            const safe = Number.isFinite(parsed) ? parsed : COMMUTE_BUDGET_MIN;
                            setMonthlyBudgetApprox(clampCommuteBudget(safe));
                            setBudgetDraft(null);
                          }}
                        />
                      </div>
                    </div>
                    <p id="carpool-budget-hint" className="mt-1 text-xs leading-relaxed text-slate-500">
                      Rough daily spend you are comfortable with for this route (carpool / shared).
                    </p>
                    <Slider
                      id="carpool-budget-slider"
                      className={cn(
                        'mt-4 w-full touch-pan-x',
                        '[&_span.bg-primary]:!bg-[#25D366]',
                        '[&_span.border-primary]:!border-[#25D366]',
                      )}
                      value={[monthlyBudgetApprox]}
                      min={COMMUTE_BUDGET_MIN}
                      max={COMMUTE_BUDGET_MAX}
                      step={COMMUTE_BUDGET_STEP}
                      onValueChange={(v) => {
                        setBudgetDraft(null);
                        setMonthlyBudgetApprox(v[0] ?? COMMUTE_BUDGET_DEFAULT);
                      }}
                      aria-valuemin={COMMUTE_BUDGET_MIN}
                      aria-valuemax={COMMUTE_BUDGET_MAX}
                      aria-valuenow={monthlyBudgetApprox}
                      aria-labelledby="carpool-budget-label"
                      aria-describedby="carpool-budget-hint carpool-budget-value"
                    />
                    <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      <span>₹{COMMUTE_BUDGET_MIN.toLocaleString('en-IN')}</span>
                      <span>₹{(COMMUTE_BUDGET_MAX / 1000).toFixed(0)}k+</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="carpool-name" className="text-sm font-semibold text-[#0B1320]">
                        Full Name*
                      </Label>
                      <Input
                        id="carpool-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                        className="h-11 rounded-xl border-slate-200 bg-white px-3.5 shadow-none placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-[#25D366]/25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="carpool-wa" className="text-sm font-semibold text-[#0B1320]">
                        WhatsApp Number*
                      </Label>
                      <div className="flex overflow-hidden rounded-xl shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-[#25D366]/25 focus-within:ring-offset-2">
                        <span className="flex h-11 shrink-0 items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600">
                          +91
                        </span>
                        <Input
                          id="carpool-wa"
                          className="h-11 rounded-l-none rounded-r-xl border border-slate-200 border-l-0 bg-white px-3.5 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="9876543210"
                          value={waDigits}
                          onChange={(e) => setWaDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          autoComplete="tel"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Updates via WhatsApp</p>
                    </div>
                  </div>

                  {/* Company | Seats | Pickup — one visual row from sm+, mockup-aligned borders */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_9.75rem_minmax(10.5rem,13rem)] sm:items-end sm:gap-x-4">
                    <div className="min-w-0 space-y-2 sm:pb-px">
                      <Label htmlFor="carpool-co" className="text-sm font-semibold text-[#0B1320]">
                        Company / Organisation*
                      </Label>
                      <Input
                        id="carpool-co"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="TCS, Infosys, Wipro..."
                        autoComplete="organization"
                        className="h-11 rounded-xl border-slate-200 bg-white px-3.5 text-sm shadow-none transition-colors placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-[#25D366]/25"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-[#0B1320]">Seats Required</Label>
                      <div
                        className={cn(
                          'flex h-11 items-center justify-center gap-0.5 rounded-xl border-2 px-2',
                          'border-emerald-400/65 bg-emerald-50/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]',
                        )}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-lg border-emerald-200/80 bg-white/90 text-[#0B1320] shadow-sm hover:bg-white"
                          disabled={seats <= 1}
                          onClick={() => setSeats((s) => Math.max(1, s - 1))}
                          aria-label="Decrease seats"
                        >
                          <Minus className="h-4 w-4" aria-hidden />
                        </Button>
                        <span className="min-w-[2rem] text-center text-sm font-bold tabular-nums text-[#0B1320]">
                          {seats}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 shrink-0 rounded-lg border-emerald-200/80 bg-white/90 text-[#0B1320] shadow-sm hover:bg-white"
                          disabled={seats >= 6}
                          onClick={() => setSeats((s) => Math.min(6, s + 1))}
                          aria-label="Increase seats"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-2">
                      <Label htmlFor="carpool-time" className="text-sm font-semibold text-[#0B1320]">
                        Pickup time*
                      </Label>
                      <Select
                        value={pickupTime}
                        onValueChange={(v) => {
                          setPickupTime(v);
                          const match = SHIFT_TABS.find((t) => shiftToTimeValue(t) === v);
                          if (match) setShiftId(match.id);
                        }}
                      >
                        <div
                          className={cn(
                            'flex h-11 items-center rounded-xl border-2 px-1 sm:min-w-[10.5rem]',
                            'border-emerald-400/65 bg-emerald-50/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]',
                          )}
                        >
                          <SelectTrigger
                            id="carpool-time"
                            className={cn(
                              'h-11 max-h-full min-h-0 flex-1 justify-between rounded-[10px] border-0 bg-white/95 px-3 py-0',
                              'text-sm font-semibold leading-none text-[#0B1320]',
                              'shadow-none ring-offset-0 focus:ring-offset-0',
                              'focus-visible:ring-2 focus-visible:ring-[#25D366]/30 data-[placeholder]:text-slate-500',
                              '[&>*:nth-child(2)]:flex [&>*:nth-child(2)]:shrink-0 [&>*:nth-child(2)]:items-center [&>*:nth-child(2)]:justify-center',
                              '[&>svg:last-child]:h-4 [&>svg:last-child]:w-4 [&>svg:last-child]:shrink-0 [&>svg:last-child]:self-center [&>svg:last-child]:text-emerald-700/55',
                            )}
                          >
                            <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2">
                              <Clock className="h-4 w-4 shrink-0 self-center text-emerald-700/70" aria-hidden />
                              <SelectValue placeholder="Select time" className="truncate leading-none" />
                            </div>
                          </SelectTrigger>
                        </div>
                        <SelectContent className="max-h-none rounded-xl">
                          {SHIFT_PICKUP_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-[#0B1320]">Commute Schedule*</Label>
                    <div className="flex flex-wrap gap-2">
                      {scheduleOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setCommuteSchedule(opt)}
                          className={cn(
                            'rounded-full px-4 py-2 text-xs font-semibold tracking-tight transition-all md:text-sm',
                            commuteSchedule === opt
                              ? 'bg-[#25D366] text-white shadow-sm shadow-green-600/25'
                              : 'bg-slate-100/95 text-slate-600 hover:bg-slate-200/90 hover:text-slate-800',
                          )}
                        >
                          {commuteChipLabel(opt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {commuteSchedule === 'weekly' && (
                    <div className="space-y-2">
                      <Label>Select days</Label>
                      <div className="flex flex-wrap gap-2">
                        {(['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const).map((letter, idx) => (
                          <button
                            key={`${letter}-${idx}`}
                            type="button"
                            onClick={() => toggleWeeklyDay(idx)}
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors',
                              weeklyDays.includes(idx)
                                ? 'bg-[#25D366] text-white shadow-md shadow-green-500/25'
                                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
                            )}
                            aria-pressed={weeklyDays.includes(idx)}
                          >
                            {letter}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Monday through Sunday (left to right).</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-[#0B1320]">Group Preference</Label>
                    <div className="flex flex-wrap gap-2">
                      {(['mixed', 'women', 'men'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setGroupPreference(opt)}
                          className={cn(
                            'rounded-full px-4 py-2 text-xs font-semibold tracking-tight transition-all md:text-sm',
                            groupPreference === opt
                              ? 'bg-[#25D366] text-white shadow-sm shadow-green-600/25'
                              : 'bg-slate-100/95 text-slate-600 hover:bg-slate-200/90 hover:text-slate-800',
                          )}
                        >
                          {groupChipLabel(opt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carpool-note" className="text-sm font-semibold text-[#0B1320]">
                      Special Note (optional)
                    </Label>
                    <Textarea
                      id="carpool-note"
                      rows={4}
                      value={specialNote}
                      onChange={(e) => setSpecialNote(e.target.value)}
                      placeholder={
                        'E.g. I work from home on Wednesdays, need early morning pickup, need women-only group, etc.'
                      }
                      className="min-h-[7.5rem] resize-y rounded-2xl border-slate-200 bg-white px-3.5 py-3 text-sm leading-relaxed text-[#0B1320] shadow-none placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-[#25D366]/25"
                    />
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/95 p-5">
                    <Checkbox
                      id="carpool-consent"
                      checked={consent}
                      onCheckedChange={(v) => setConsent(v === true)}
                      className="mt-0.5 border-slate-400 data-[state=checked]:border-[#25D366] data-[state=checked]:bg-[#25D366]"
                    />
                    <label
                      htmlFor="carpool-consent"
                      className="cursor-pointer text-sm leading-relaxed text-slate-700"
                    >
                      I agree to be added to the Vizag Taxi Hub carpooling WhatsApp group and receive booking updates
                      and route information.*
                    </label>
                  </div>

                  <Button
                    type="button"
                    className={cn(
                      'box-border !flex h-auto min-h-[3.5rem] w-full max-w-full min-w-0 items-center justify-center rounded-2xl border-0 px-5 py-3.5 text-base font-bold leading-snug text-white shadow-[0_10px_28px_-6px_rgba(37,211,102,0.55)] transition-colors',
                      '!whitespace-normal bg-[#25D366] hover:bg-[#20bd5a]',
                    )}
                    onClick={handleSubmit}
                  >
                    <span className="inline-flex max-w-full flex-col items-center justify-center gap-2 sm:flex-row sm:gap-2.5">
                      <span className="inline-flex shrink-0 items-center justify-center rounded-md bg-white/95 p-0.5 text-[#25D366] ring-1 ring-white/70">
                        <CalendarDays className="h-[1.125rem] w-[1.125rem]" aria-hidden strokeWidth={2.25} />
                      </span>
                      <span className="max-w-[min(100%,18rem)] text-center [text-wrap:balance] sm:max-w-none">
                        Enquire My Carpool via WhatsApp
                      </span>
                    </span>
                  </Button>
                  <p className="mx-auto flex max-w-md flex-col items-center gap-1.5 pt-2 text-center text-xs leading-relaxed text-slate-500 sm:flex-row sm:items-start sm:gap-2 sm:pt-1.5">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400 sm:mt-0.5" aria-hidden />
                    <span className="text-pretty">Opens WhatsApp with your enquiry prefilled. You can edit it before sending.</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            <div
              id="carpool-route-strip"
              className="min-w-0 w-full max-w-full max-lg:row-start-2 lg:col-span-2 lg:row-start-1 border-b border-slate-200/90 bg-white px-4 pt-5 pb-8 sm:px-6 sm:pb-9 lg:px-0 lg:pt-6 lg:pb-7"
            >
              <div className="mx-auto flex w-full min-w-0 max-w-full flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-8 lg:gap-y-3">
                <div className="flex w-full min-w-0 flex-row items-center justify-between gap-3 lg:w-auto lg:shrink-0 lg:justify-start">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#25D366]" aria-hidden />
                    <span
                      className="text-[11px] font-bold uppercase leading-none tracking-[0.14em]"
                      style={{ color: '#1b4332' }}
                    >
                      Popular routes
                    </span>
                  </div>

                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#25D366] lg:hidden"
                    onClick={() =>
                      document.getElementById('carpool-booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  >
                    View all
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <div className="grid min-w-0 w-full grid-cols-2 gap-2.5 sm:gap-3 lg:flex lg:flex-1 lg:flex-wrap lg:gap-2.5">
                  {CARPOOL_STOPS.map((s) => (
                    <span
                      key={s.name}
                      className="flex min-h-[2.75rem] min-w-0 items-center justify-center whitespace-normal rounded-full border border-amber-400/75 bg-white px-2.5 py-2 text-center text-xs font-semibold leading-snug text-[#9a6d2d] shadow-sm sm:min-h-0 sm:px-4 sm:text-sm lg:inline-flex lg:shrink-0 lg:whitespace-nowrap"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-slate-600 hover:text-[#25D366] lg:flex"
                  onClick={() =>
                    document.getElementById('carpool-booking-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }
                >
                  View all
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>

            <div className="min-w-0 max-w-full space-y-10 max-lg:row-start-3 max-lg:space-y-10 lg:col-start-1 lg:row-start-2 lg:space-y-12">
              <section className="border-t border-slate-200/80 pt-10 md:pt-12">
                <h2 className="text-2xl font-bold tracking-tight text-[#0B1320] md:text-3xl">
                  Why Carpool with Us?
                </h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {[
                    {
                      Icon: Fuel,
                      title: 'Save on Fuel',
                      body: 'Split petrol costs equally among all passengers',
                      wrap: 'bg-red-50 text-red-600',
                    },
                    {
                      Icon: Clock,
                      title: 'Fixed Pickup Times',
                      body: 'Reliable scheduled pickups at your nearest stop',
                      wrap: 'bg-sky-50 text-sky-600',
                    },
                    {
                      Icon: ShieldCheck,
                      title: 'Verified Commuters Only',
                      body: 'Office-going professionals; women-only groups on request',
                      wrap: 'bg-violet-50 text-violet-600',
                    },
                    {
                      Icon: Leaf,
                      title: 'Go Green with India',
                      body: 'Every shared ride reduces CO₂ emissions',
                      wrap: 'bg-emerald-50 text-emerald-600',
                    },
                  ].map(({ Icon, title, body, wrap }) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60"
                    >
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-xl',
                          wrap,
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </div>
                      <h3 className="mt-4 text-base font-semibold leading-snug tracking-normal text-[#0B1320]">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold tracking-tight text-[#0B1320] md:text-2xl">
                  Morning pickup schedule
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Stops along the NAD → IT SEZ corridor with areas served — tap stops in the form to choose pickup &
                  drop-off.
                </p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-0 border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <div className="w-12 shrink-0" aria-hidden />
                    <div className="px-3 py-3">Stop</div>
                    <div className="px-3 py-3">Area</div>
                  </div>
                  {CARPOOL_STOPS.map((row, idx) => {
                    const isLast = idx === CARPOOL_STOPS.length - 1;
                    return (
                      <div
                        key={row.name}
                        className={cn(
                          'relative grid grid-cols-[auto_1fr_1fr] items-stretch border-b border-slate-100 last:border-b-0',
                          isLast && 'bg-emerald-50/70',
                        )}
                      >
                        <div className="relative flex w-12 shrink-0 justify-center py-3">
                          <div
                            className="absolute bottom-0 top-3 w-0.5 bg-emerald-200"
                            style={{ display: idx === CARPOOL_STOPS.length - 1 ? 'none' : undefined }}
                            aria-hidden
                          />
                          <div className="relative z-[1] mt-1 flex flex-col items-center">
                            {isLast ? (
                              <span className="text-lg leading-none" title="Finish line">
                                🏁
                              </span>
                            ) : (
                              <span className="h-3 w-3 rounded-full border-2 border-emerald-400 bg-white shadow-sm" />
                            )}
                          </div>
                        </div>
                        <div className={cn('flex items-center px-3 py-3 text-sm font-medium', isLast ? 'text-emerald-950' : 'text-slate-900')}>
                          {row.name}
                        </div>
                        <div className="flex items-center px-3 py-3 text-sm text-slate-600">{row.area}</div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-sm">
                <p className="text-center text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Trusted <span className="text-slate-300">•</span> Safe <span className="text-slate-300">•</span>{' '}
                  Reliable
                </p>
                <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {[
                    { Icon: UserCheck, label: 'Verified Users' },
                    { Icon: Clock, label: 'Punctual Rides' },
                    { Icon: IndianRupee, label: 'Cost Efficient' },
                    { Icon: Leaf, label: 'Eco Friendly' },
                  ].map(({ Icon, label }) => (
                    <div key={label} className="flex flex-col items-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700">
                        <Icon className="h-6 w-6" aria-hidden />
                      </div>
                      <span className="mt-3 text-xs font-semibold text-slate-800">{label}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
}
