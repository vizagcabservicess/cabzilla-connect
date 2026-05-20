import { trackGuestSearch } from '@/services/trackSearchAPI';
import type { CommuteFormData } from './types';
import { commuteScheduleLabel, formatCarpoolDisplayDate, groupPreferenceLabel } from './searchUtils';

function formatGuestPhoneE164(waDigits: string): string {
  const digits = waDigits.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11) return `+${digits}`;
  return '';
}

function buildCarpoolTripTypeField(form: CommuteFormData): string {
  const lines = [
    'Shared Carpool · Commute Form',
    `👤 Name: ${form.fullName}`,
    form.company ? `🏢 Company: ${form.company}` : null,
    `📅 Schedule: ${commuteScheduleLabel(form.commuteSchedule)}`,
    `👥 Group: ${groupPreferenceLabel(form.groupPreference)}`,
    `💺 Seats needed: ${form.seats}`,
    `💰 Budget: Up to ₹${form.budget} /per seat for one way`,
  ].filter(Boolean);

  return lines.join('\n');
}

/** Notify business owner on WhatsApp when a guest submits the shared carpool commute form. */
export function trackCarpoolCommuteSearch(form: CommuteFormData): void {
  const guestPhone = formatGuestPhoneE164(form.waDigits);
  if (!guestPhone) return;

  const displayDate = formatCarpoolDisplayDate(form.pickupDate) || form.pickupDate;
  const departure = [displayDate, form.pickupTime].filter(Boolean).join(' · ');

  trackGuestSearch({
    guestPhone,
    pickup: form.from,
    drop: form.to,
    tripType: buildCarpoolTripTypeField(form),
    departure,
    carsShown: [
      `Seats: ${form.seats}`,
      `Budget: ₹${form.budget} /per seat for one way`,
      `Schedule: ${commuteScheduleLabel(form.commuteSchedule)}`,
      `Group: ${groupPreferenceLabel(form.groupPreference)}`,
      form.company ? `Company: ${form.company}` : '',
    ].filter(Boolean),
  });
}
