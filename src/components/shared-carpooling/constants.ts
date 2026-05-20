/** Brand green from mockup */
export const BRAND_GREEN = '#008744';

/** Per-seat price line 1 suffix (line 2 is {@link ONE_WAY_LABEL}). */
export const PER_SEAT_PRICE_SUFFIX = '/per seat';
export const ONE_WAY_LABEL = 'for one way';
/** @deprecated Use {@link PerSeatPrice} — kept for plain-text contexts (share, WhatsApp). */
export const PER_SEAT_ONE_WAY_LABEL = `${PER_SEAT_PRICE_SUFFIX} ${ONE_WAY_LABEL}`;

export type CommuteSchedule =
  | 'daily'
  | 'weekly'
  | 'mon-fri'
  | 'mon-sat'
  | '3-4-days'
  | 'irregular'
  | 'as-needed';

export const COMMUTE_SCHEDULE_OPTIONS: { id: CommuteSchedule; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'mon-fri', label: 'Mon–Fri' },
  { id: 'mon-sat', label: 'Mon–Sat' },
  { id: '3-4-days', label: '3–4 Days' },
  { id: 'irregular', label: 'Irregular' },
  { id: 'as-needed', label: 'As Needed' },
];
export const BRAND_GREEN_HOVER = '#006b36';
export const BRAND_GREEN_LIGHT = '#e6f5ec';
export const FOOTER_BG = '#0a2e1f';
export const HERO_ACCENT = '#39D353';

/** Initial commute-form budget before route fare is calculated. */
export const COMMUTE_FORM_DEFAULT_BUDGET = 400;

/** Shared carpool uses 4-seater Swift Dzire airport fare ÷ 4 seats. */
export const CARPOOL_MAX_SEATS = 4;

export const PAGE_URL = 'https://vizagtaxihub.com/shared-carpooling';
export const RESULTS_PAGE_URL = 'https://vizagtaxihub.com/shared-carpooling/results';

export type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening' | 'night';
export type GroupPreference = 'mixed' | 'men' | 'women';

export type SharedRide = {
  id: string;
  time: string;
  period: Exclude<TimeFilter, 'all'>;
  pickup: string;
  drop: string;
  via?: string;
  dropTime?: string;
  vehicle: string;
  vehicleImage: string;
  plate: string;
  driverName: string;
  driverAvatar: string;
  rating: number;
  seatsLeft: number;
  pricePerSeat: number;
  isBestMatch?: boolean;
  amenities?: string[];
  schedule?: string;
  estDuration?: string;
};

/** Rides are loaded from API only — no static dummy data */
export const SHARED_RIDES: SharedRide[] = [];

export const SCHEDULE_STOPS = [
  { stop: 'Indira Junction', area: 'NAD / NSTL', eta: '06:30 AM' },
  { stop: 'Nerul Junction', area: 'Shanti Nagar', eta: '06:38 AM' },
  { stop: 'Marripalem', area: 'Marripalem Main Rd', eta: '06:45 AM' },
  { stop: 'Kancharapalem', area: 'Kancharapalem Jn', eta: '06:52 AM' },
  { stop: 'Akkayapalem', area: 'Akkayapalem Circle', eta: '06:58 AM' },
  { stop: 'Gajuwaka', area: 'Gajuwaka Main', eta: '07:05 AM' },
  { stop: 'Maddilapalem', area: 'Maddilapalem Main', eta: '07:12 AM' },
  { stop: 'MVP Colony', area: 'MVP Colony', eta: '07:20 AM' },
  { stop: 'Rushikonda', area: 'Beach Road', eta: '07:35 AM' },
  { stop: 'IT SEZ Madhurwada', area: 'Startup Village', eta: '07:50 AM' },
] as const;

export const POPULAR_ROUTES = [
  { from: 'MVP Colony', to: 'Rushikonda', ridesToday: 32, demand: 'high' as const },
  { from: 'NAD Junction', to: 'IT SEZ Madhurwada', ridesToday: 28, demand: 'high' as const },
  { from: 'Kancharapalem', to: 'MVP Colony', ridesToday: 24, demand: 'medium' as const },
  { from: 'Maddilapalem', to: 'Rushikonda', ridesToday: 19, demand: 'medium' as const },
  { from: 'Gajuwaka', to: 'IT SEZ Madhurwada', ridesToday: 15, demand: 'low' as const },
  { from: 'Akkayapalem', to: 'MVP Colony', ridesToday: 12, demand: 'low' as const },
] as const;

export const PICKUP_LOCATIONS = [
  'NAD Junction',
  'Marripalem',
  'Kancharapalem',
  'Akkayapalem',
  'Gajuwaka',
  'Maddilapalem',
  'MVP Colony',
  'Rushikonda',
  'IT SEZ Madhurwada',
] as const;

export const PICKUP_TIMES = [
  '06:30 AM',
  '07:00 AM',
  '07:30 AM',
  '08:00 AM',
  '08:30 AM',
  '09:00 AM',
  '02:00 PM',
  '05:00 PM',
  '05:30 PM',
  '06:00 PM',
  '06:30 PM',
  '07:00 PM',
  '07:30 PM',
  '08:00 PM',
] as const;

/** Companies & colleges for profile verification search */
export const VERIFICATION_COMPANIES = [
  'Wipro Technologies',
  'Tech Mahindra',
  'HSBC Technology India',
  'Concentrix',
  'IBM India',
  'Infosys',
  'TCS',
  'Accenture',
  'Cyient',
  'Novartis',
  'IT SEZ Madhurawada',
  'Fintech Valley Vizag',
  'Port Authority of India',
  'HPCL Visakhapatnam',
  'BHEL Visakhapatnam',
  'Naval Dockyard',
  'GVK EMRI',
  'APSPDCL',
  'Other / Not listed',
] as const;

export const VERIFICATION_COLLEGES = [
  'Andhra University',
  'GITAM University',
  'Dr. L. Bullayya College',
  'Andhra Loyola College',
  'MVGR College of Engineering',
  'Anil Neerukonda Institute of Technology',
  'Gayatri Vidya Parishad',
  'Raghu Engineering College',
  'Damodaram Sanjivayya National Law University',
  'Other / Not listed',
] as const;
