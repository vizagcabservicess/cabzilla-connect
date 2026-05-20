import type { GroupPreference, CommuteSchedule } from './constants';

export type CommuteFormData = {
  fullName: string;
  waDigits: string;
  company: string;
  budget: string;
  pickupTime: string;
  pickupDate: string;
  seats: number;
  commuteSchedule: CommuteSchedule;
  groupPreference: GroupPreference;
  from: string;
  to: string;
};

export type CarpoolSearchParams = CommuteFormData & {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
};

export type SortOption = 'earliest' | 'price-low' | 'price-high' | 'seats';
