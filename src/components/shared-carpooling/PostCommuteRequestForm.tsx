import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Building2,
  CalendarDays,
  Car,
  Check,
  Clock,
  IndianRupee,
  Loader2,
  Lock,
  MapPin,
  Send,
  User,
  Users,
} from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BRAND_GREEN, BRAND_GREEN_LIGHT, GroupPreference } from './constants';
import type { CarpoolSearchParams } from './types';
import { commuteScheduleLabel, groupPreferenceLabel } from './searchUtils';
import { VIZAG_TAXI_HUB_PHONE_E164, buildWhatsAppMeUrl } from '@/utils/whatsappPrefillMessage';
import { sharedCarpoolPublicAPI } from '@/services/api/sharedCarpoolAPI';

const TRAVEL_DAYS = ['Daily (Mon – Fri)', 'Mon – Sat', 'Custom days', 'Weekends only'] as const;
const CAB_TYPES = ['Any Type', 'Sedan (Dzire)', 'SUV (Ertiga)', 'MUV (Innova / Xylo)'] as const;

type PostCommuteRequestFormProps = {
  search: CarpoolSearchParams;
};

export function PostCommuteRequestForm({ search }: PostCommuteRequestFormProps) {
  const [fullName, setFullName] = useState(search.fullName);
  const [waDigits, setWaDigits] = useState(search.waDigits);
  const [company, setCompany] = useState(search.company);
  const [pickupTime, setPickupTime] = useState(search.time || 'Any time');
  const [travelDays, setTravelDays] = useState<string>(TRAVEL_DAYS[0]);
  const [groupPreference, setGroupPreference] = useState<GroupPreference>(search.groupPreference);
  const [budget, setBudget] = useState(search.budget);
  const [cabType, setCabType] = useState<string>(CAB_TYPES[0]);
  const [monthlyPass, setMonthlyPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autoSubmitStarted = useRef(false);

  const buildPayload = () => ({
    full_name: fullName.trim(),
    phone: waDigits.trim(),
    company: company.trim(),
    pickup: search.from,
    drop_location: search.to,
    travel_date: search.date,
    pickup_time: pickupTime,
    travel_days: travelDays,
    group_preference: groupPreference,
    budget: parseFloat(budget) || null,
    cab_type: cabType,
    monthly_pass: monthlyPass,
    seats: search.seats,
  });

  // Auto-submit once when user arrives from the landing commute form (already filled name + phone).
  useEffect(() => {
    if (autoSubmitStarted.current || submitted) return;
    if (!search.fullName?.trim() || (search.waDigits?.length ?? 0) < 10) return;

    autoSubmitStarted.current = true;
    setFullName(search.fullName);
    setWaDigits(search.waDigits);
    if (search.company) setCompany(search.company);

    void (async () => {
      setSubmitting(true);
      try {
        await sharedCarpoolPublicAPI.submitCommuteRequest({
          full_name: search.fullName.trim(),
          phone: search.waDigits.trim(),
          company: (search.company ?? '').trim(),
          pickup: search.from,
          drop_location: search.to,
          travel_date: search.date,
          pickup_time: search.time || search.pickupTime || 'Any time',
          travel_days: TRAVEL_DAYS[0],
          group_preference: search.groupPreference,
          budget: parseFloat(search.budget) || null,
          cab_type: CAB_TYPES[0],
          monthly_pass: false,
          seats: search.seats,
        });
        setSubmitted(true);
        toast.success('Request submitted! We will notify you when a ride matches.');
      } catch {
        autoSubmitStarted.current = false;
        toast.error('Could not submit request. Try again or use WhatsApp.');
      } finally {
        setSubmitting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount when search carries landing form data
  }, []);

  const buildMessage = (prefix: string) =>
    [
      `*${prefix} — Vizag Taxi Hub*`,
      '',
      `Name: ${fullName.trim() || '—'}`,
      `WhatsApp: +91 ${waDigits.trim() || '—'}`,
      `Company: ${company.trim() || '—'}`,
      `Route: ${search.from} → ${search.to}`,
      `Date: ${search.date}`,
      `Pickup Time: ${pickupTime}`,
      `Days: ${travelDays}`,
      `Group: ${groupPreferenceLabel(groupPreference)}`,
      `Budget: Up to ₹${budget} /per seat for one way`,
      `Schedule: ${commuteScheduleLabel(search.commuteSchedule)}`,
      `Cab Type: ${cabType}`,
      `Monthly Pass: ${monthlyPass ? 'Yes' : 'No'}`,
      `Seats: ${search.seats}`,
      '',
      'Please notify me when a matching shared ride is available.',
    ].join('\n');

  const submitWhatsApp = (prefix: string) => {
    const url = `https://wa.me/${VIZAG_TAXI_HUB_PHONE_E164}?text=${encodeURIComponent(buildMessage(prefix))}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async () => {
    if (submitted || submitting || autoSubmitStarted.current) return;
    if (!fullName.trim() || waDigits.trim().length < 10) {
      toast.error('Please enter your name and WhatsApp number.');
      return;
    }

    setSubmitting(true);
    try {
      await sharedCarpoolPublicAPI.submitCommuteRequest(buildPayload());
      setSubmitted(true);
      toast.success('Request submitted! We will notify you when a ride matches.');
    } catch {
      toast.error('Could not submit request. Try WhatsApp instead.');
    } finally {
      setSubmitting(false);
    }
  };

  const groupOptions: { id: GroupPreference; label: string; Icon: typeof Users }[] = [
    { id: 'mixed', label: 'Mixed Group', Icon: Users },
    { id: 'men', label: 'Men Only', Icon: User },
    { id: 'women', label: 'Women Only', Icon: User },
  ];

  return (
    <section className="mx-auto max-w-[900px] px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Post a Commute Request</h2>
            <p className="mt-1 text-sm text-gray-500">
              Tell us your route — we&apos;ll notify you when a ride matches
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <Clock className="h-3.5 w-3.5" />
            Takes less than 2 minutes
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" className="sm:col-span-1">
            <IconInput Icon={User} value={fullName} onChange={setFullName} placeholder="Enter your full name" />
          </Field>
          <Field label="WhatsApp Number">
            <div className="flex gap-2">
              <select className="w-20 shrink-0 rounded-xl border border-gray-200 bg-gray-50 px-2 py-3 text-sm">
                <option>+91</option>
              </select>
              <input
                type="tel"
                value={waDigits}
                onChange={(e) => setWaDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number"
                className="flex-1 rounded-xl border border-gray-200 py-3 px-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
              />
            </div>
          </Field>
          <Field label="Company / Organisation" className="sm:col-span-2">
            <IconInput Icon={Building2} value={company} onChange={setCompany} placeholder="Your office or college name" />
          </Field>
          <Field label="Pickup Location">
            <IconInput Icon={MapPin} value={search.from} onChange={() => undefined} readOnly iconColor={BRAND_GREEN} />
          </Field>
          <Field label="Drop Location">
            <IconInput Icon={MapPin} value={search.to} onChange={() => undefined} readOnly iconColor="#ef4444" />
          </Field>
          <Field label="Pickup Time">
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm"
              >
                <option>Any time</option>
                <option>06:30 AM</option>
                <option>07:00 AM</option>
                <option>07:30 AM</option>
                <option>08:00 AM</option>
                <option>05:00 PM</option>
                <option>05:30 PM</option>
              </select>
            </div>
          </Field>
          <Field label="Days of Travel">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={travelDays}
                onChange={(e) => setTravelDays(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm"
              >
                {TRAVEL_DAYS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Group Preference</label>
          <div className="grid grid-cols-3 gap-2">
            {groupOptions.map(({ id, label, Icon }) => {
              const selected = groupPreference === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setGroupPreference(id)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-xl border-2 px-2 py-3 text-center',
                    selected ? 'border-green-600' : 'border-gray-200 hover:border-gray-300',
                  )}
                  style={selected ? { borderColor: BRAND_GREEN, backgroundColor: BRAND_GREEN_LIGHT } : undefined}
                >
                  {selected && <Check className="absolute right-2 top-2 h-4 w-4" style={{ color: BRAND_GREEN }} strokeWidth={3} />}
                  <Icon className="h-5 w-5 text-gray-600" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Daily Commute Budget">
            <IconInput Icon={IndianRupee} value={budget} onChange={setBudget} placeholder="150" />
          </Field>
          <Field label="Preferred Cab Type (Optional)">
            <div className="relative">
              <Car className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <select
                value={cabType}
                onChange={(e) => setCabType(e.target.value)}
                className="w-full appearance-none rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm"
              >
                {CAB_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <input
            type="checkbox"
            checked={monthlyPass}
            onChange={(e) => setMonthlyPass(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
            style={{ accentColor: BRAND_GREEN }}
          />
          <span className="text-sm font-medium text-gray-800">I&apos;m interested in Monthly Pass</span>
          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: BRAND_GREEN }}>
            Best Value
          </span>
        </label>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || submitted}
            className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 disabled:opacity-70"
            style={{ backgroundColor: BRAND_GREEN }}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : submitted ? (
              <Check className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitted ? 'Request Submitted' : 'Submit Request'}
          </button>
          <a
            href={buildWhatsAppMeUrl('/shared-carpooling/no-rides')}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-sm font-semibold hover:bg-green-50"
            style={{ borderColor: BRAND_GREEN, color: BRAND_GREEN }}
          >
            <FaWhatsapp className="h-5 w-5" style={{ color: '#25D366' }} />
            Chat on WhatsApp
          </a>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-gray-500">
          <Lock className="h-3.5 w-3.5" />
          Your details are safe with us. We will never share your information.
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function IconInput({
  Icon,
  value,
  onChange,
  placeholder,
  readOnly,
  iconColor,
}: {
  Icon: typeof User;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  iconColor?: string;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" style={iconColor ? { color: iconColor } : undefined} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(
          'w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20',
          readOnly && 'bg-gray-50 text-gray-700',
        )}
      />
    </div>
  );
}
