/**
 * Titles, descriptions, and canonical URLs for public pages.
 * Consumed by PublicHead (client) and vite emit of per-route HTML under dist/seo (first HTML response).
 */
import { lookupVizagOutstation, vizagOutstationPaths } from './outstationDistance';
import { getTourDisplayName } from '../utils/tourUrlUtils';
import { getVehicleDisplayName } from '../utils/vehicleUrlUtils';

export const SITE_ORIGIN = 'https://vizagtaxihub.com';
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.png`;

const DESCRIPTION_MIN = 140;
const DESCRIPTION_MAX = 160;
const DESCRIPTION_FILLERS = [
  ' Book online with Vizag Taxi Hub.',
  ' Call Vizag Taxi Hub in Visakhapatnam.',
] as const;

/** Task 6 routes stay on the app shell. No public marketing title. */
export const PRIVATE_PREFIXES = [
  '/admin',
  '/login',
  '/driver',
  '/ride',
  '/event/share',
  '/reset-password',
  '/verify-email',
  '/dashboard',
  '/customer',
] as const;

const URBANIA_OG = `${SITE_ORIGIN}/uploads/og-image-urbania.jpg`;
const TEMPO_OG = `${SITE_ORIGIN}/uploads/taxi-services--visakhapatnam-tempo-traveller.png`;
const INNOVA_OG = `${SITE_ORIGIN}/uploads/taxi-services--visakhapatnam-innova-crysta.png`;

export type PublicHead = {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogDescription: string;
  ogUrl: string;
  ogImage: string;
  /** Visible in the no-JS HTML shell; React replaces #root on hydrate. */
  h1: string;
  mainText: string;
};

type ExactHead = {
  title: string;
  description: string;
  ogImage: string;
};

/** Exact titles/descriptions from the SEO brief. No fares/prices/discounts except homepage rating. */
const EXACT_HEADS: Record<string, ExactHead> = {
  '/': {
    title: 'Cab & Taxi Service in Vizag | Outstation, Airport, Araku',
    description:
      'Vizag Taxi Hub – local, outstation and airport cabs in Visakhapatnam since 2020. 4.9★ from 700+ reviews. Check your fare instantly and book online.',
    ogImage: DEFAULT_OG_IMAGE,
  },
  '/tempo-traveller-rental-vizag': {
    title: 'Tempo Traveller Rental in Vizag | 12, 17 & 18 Seater',
    description:
      'Hire AC 12, 17 and 18 seater tempo travellers in Vizag for groups, weddings and outstation trips. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/urbania-rental-vizag': {
    title: 'Force Urbania Rental in Vizag | Luxury Van Hire',
    description:
      'Rent a Force Urbania luxury van in Vizag for weddings, corporate groups and Araku trips with a driver. Book online with Vizag Taxi Hub.',
    ogImage: URBANIA_OG,
  },
  '/12-seater-tempo-traveller-vizag': {
    title: '12 Seater Tempo Traveller in Vizag | Vizag Taxi Hub',
    description:
      'Book a 12 seater AC tempo traveller in Vizag for family and small group travel with a professional driver. Book online or call Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/17-seater-tempo-traveller-vizag': {
    title: '17 Seater Tempo Traveller in Vizag | Vizag Taxi Hub',
    description:
      'Book a 17 seater AC tempo traveller in Vizag for group tours, weddings and outstation trips with a driver. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/18-seater-tempo-traveller-vizag': {
    title: '18 Seater Tempo Traveller in Vizag | Vizag Taxi Hub',
    description:
      'Book an 18 seater AC tempo traveller in Vizag for large groups, events and outstation travel with a driver. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/wedding-tempo-traveller-vizag': {
    title: 'Wedding Tempo Traveller in Vizag | Vizag Taxi Hub',
    description:
      'Wedding tempo traveller hire in Vizag for guest transport, baraat and venue transfers with AC coaches. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/corporate-tempo-traveller-vizag': {
    title: 'Corporate Tempo Traveller in Vizag | Vizag Taxi Hub',
    description:
      'Corporate tempo traveller hire in Vizag for office trips, conferences and staff travel with AC coaches. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/pilgrimage-tempo-traveller-vizag': {
    title: 'Pilgrimage Tempo Traveller from Vizag | Vizag Taxi Hub',
    description:
      'Pilgrimage tempo traveller from Vizag for temple trips and group darshan travel with AC coaches. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/group-travel-tempo-traveller-vizag': {
    title: 'Group Travel Tempo Traveller in Vizag | Vizag Taxi Hub',
    description:
      'Group travel tempo traveller in Vizag for tours, events and outstation trips with AC seating. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/mini-bus-travels-vizag': {
    title: 'Mini Bus Hire in Vizag | Vizag Taxi Hub',
    description:
      'Mini bus hire in Vizag for group tours, weddings and outstation travel with a professional driver. Book online with Vizag Taxi Hub.',
    ogImage: TEMPO_OG,
  },
  '/araku-tour-packages-vizag': {
    title: 'Araku Tour Packages from Vizag | Vizag Taxi Hub',
    description:
      'Araku tour packages from Vizag by private cab, including valley day trips with a professional driver. Book online with Vizag Taxi Hub.',
    ogImage: DEFAULT_OG_IMAGE,
  },
  '/airport-taxi': {
    title: 'Vizag Airport Taxi | Pickup & Drop | Vizag Taxi Hub',
    description:
      'Vizag airport taxi for pickup and drop at Bhogapuram and city terminals, with meet and greet support. Book online with Vizag Taxi Hub.',
    ogImage: INNOVA_OG,
  },
  '/local-taxi': {
    title: 'Local Taxi in Vizag | City Cabs by the Hour',
    description:
      'Local taxi in Vizag for city rides by the hour or point to point, with a professional driver. Book online with Vizag Taxi Hub.',
    ogImage: DEFAULT_OG_IMAGE,
  },
  '/outstation-taxi': {
    title: 'Outstation Cabs from Vizag | One Way & Round Trip',
    description:
      'Outstation cabs from Vizag for one way and round trips across Andhra and nearby states with a driver. Book online with Vizag Taxi Hub.',
    ogImage: DEFAULT_OG_IMAGE,
  },
  '/tours': {
    title: 'Vizag & Araku Tour Packages by Cab | Vizag Taxi Hub',
    description:
      'Vizag and Araku tour packages by private cab, from city sightseeing to valley day trips with a driver. Book online with Vizag Taxi Hub.',
    ogImage: DEFAULT_OG_IMAGE,
  },
  '/fleet': {
    title: 'Our Fleet: Sedan, Innova, Tempo Traveller | Vizag Taxi Hub',
    description:
      'Browse the Vizag Taxi Hub fleet in Visakhapatnam: sedans, Innova, tempo traveller and Urbania with drivers. Book online or call us.',
    ogImage: DEFAULT_OG_IMAGE,
  },
  '/hire-driver': {
    title: 'Hire a Driver in Vizag | Vizag Taxi Hub',
    description:
      'Hire a driver in Vizag for your car, or book a cab with driver for local, airport and outstation trips. Book online with Vizag Taxi Hub.',
    ogImage: DEFAULT_OG_IMAGE,
  },
  '/shared-carpooling': {
    title: 'Shared Carpooling in Vizag | Vizag Taxi Hub',
    description:
      'Shared carpooling in Vizag for common routes, or book a private cab for local and outstation trips. Book online with Vizag Taxi Hub.',
    ogImage: DEFAULT_OG_IMAGE,
  },
};

const VEHICLE_SLUGS = [
  'swift-dzire',
  'ertiga',
  'toyota-glanza',
  'innova-crysta',
  'tempo-traveller',
  'amaze',
  'innova-hycross',
  'urbania',
  'sedan',
] as const;

const TOUR_SLUGS = [
  'araku-valley-tour',
  'lambasingi-tour',
  'vanajangi-tour',
  'vizag-north-city-tour',
  'vizag-south-city-tour',
  'arasavalli-srikurmam-tour',
  'araku-vizag-3d-2n',
] as const;

/** Policy and secondary pages: plain "{name} | Vizag Taxi Hub". */
const STATIC_PAGES: Record<string, { name: string; summary: string }> = {
  '/about': {
    name: 'About',
    summary:
      'About Vizag Taxi Hub, a Visakhapatnam cab service for local, outstation and airport trips since 2020. Professional drivers. Book online or call Vizag Taxi Hub.',
  },
  '/contact': {
    name: 'Contact',
    summary:
      'Contact Vizag Taxi Hub in Visakhapatnam for local, outstation and airport cabs. Call, WhatsApp or send a message. Book online or call Vizag Taxi Hub.',
  },
  '/support': {
    name: 'Support',
    summary:
      'Support from Vizag Taxi Hub for bookings in Visakhapatnam. Help with local, outstation and airport trips. Call or WhatsApp, or check your fare and book online.',
  },
  '/help-center': {
    name: 'Help Center',
    summary:
      'Help center for Vizag Taxi Hub in Visakhapatnam. Answers for local, outstation and airport cab bookings. Book online or call Vizag Taxi Hub.',
  },
  '/contact-us': {
    name: 'Contact Us',
    summary:
      'Contact Vizag Taxi Hub in Visakhapatnam for a cab with driver. Local, outstation and airport trips. Book online or call Vizag Taxi Hub.',
  },
  '/terms-conditions': {
    name: 'Terms and Conditions',
    summary:
      'Terms and conditions for booking a cab with Vizag Taxi Hub in Visakhapatnam. Local, outstation and airport trips. Read the terms before you book online.',
  },
  '/privacy-policy': {
    name: 'Privacy Policy',
    summary:
      'Privacy policy for Vizag Taxi Hub in Visakhapatnam. How booking details are used for local, outstation and airport cabs. Read the policy before you book.',
  },
  '/user-agreement': {
    name: 'User Agreement',
    summary:
      'User agreement for Vizag Taxi Hub in Visakhapatnam. Rules for booking local, outstation and airport cabs online with a professional driver.',
  },
  '/terms': {
    name: 'Terms',
    summary:
      'Terms for booking a cab with Vizag Taxi Hub in Visakhapatnam. Local, outstation and airport trips with a professional driver. Book online.',
  },
  '/privacy': {
    name: 'Privacy',
    summary:
      'Privacy information for Vizag Taxi Hub in Visakhapatnam. How we handle booking details for local, outstation and airport cabs. Book online.',
  },
  '/data-deletion': {
    name: 'Data Deletion',
    summary:
      'Request data deletion from Vizag Taxi Hub in Visakhapatnam. This page explains how to ask us to remove account and booking details.',
  },
  '/refunds': {
    name: 'Refunds',
    summary:
      'Refunds for Vizag Taxi Hub bookings in Visakhapatnam. How cancellation refunds work for local, outstation and airport cabs. Book online.',
  },
  '/cancellation-refund-policy': {
    name: 'Cancellation and Refund Policy',
    summary:
      'Cancellation and refund policy for Vizag Taxi Hub in Visakhapatnam. Local, outstation and airport cab bookings. Read the policy before you book online.',
  },
  '/rentals': {
    name: 'Car Rentals',
    summary:
      'Car rentals in Visakhapatnam with Vizag Taxi Hub. A cab with driver for local, airport and outstation trips. Book online or call Vizag Taxi Hub.',
  },
  '/pooling': {
    name: 'Carpooling',
    summary:
      'Carpooling with Vizag Taxi Hub in Visakhapatnam. Shared-seat rides alongside local, outstation and airport cabs. Book online or call Vizag Taxi Hub.',
  },
  '/careers': {
    name: 'Careers',
    summary:
      'Careers at Vizag Taxi Hub in Visakhapatnam. Work with a cab team that runs local, outstation and airport trips. See open roles and get in touch.',
  },
  '/our-story': {
    name: 'Our Story',
    summary:
      'Our story at Vizag Taxi Hub in Visakhapatnam. Local, outstation and airport cabs with professional drivers since 2020. Book online or call Vizag Taxi Hub.',
  },
  '/vision-mission': {
    name: 'Vision and Mission',
    summary:
      'Vision and mission of Vizag Taxi Hub in Visakhapatnam. Reliable local, outstation and airport cabs with professional drivers. Book online.',
  },
  '/hire-driver-terms': {
    name: 'Hire a Driver Terms',
    summary:
      'Terms for the hire-a-driver page at Vizag Taxi Hub in Visakhapatnam. For a trip, book a cab with driver for local, airport or outstation travel.',
  },
  '/offers': {
    name: 'Offers',
    summary:
      'Current offers from Vizag Taxi Hub in Visakhapatnam on local, outstation, airport and tour bookings. Book online or call Vizag Taxi Hub.',
  },
  '/vizag-to-araku-bus': {
    name: 'Vizag to Araku Bus',
    summary:
      'Vizag to Araku travel with Vizag Taxi Hub. Private cab from Visakhapatnam toward Araku Valley with a professional driver. Book online or call us.',
  },
  '/group-tours': {
    name: 'Group Tours',
    summary:
      'Group tours from Visakhapatnam with Vizag Taxi Hub. Shared seats and private cabs for outstation trips. Book online or call Vizag Taxi Hub.',
  },
  '/payment': {
    name: 'Payment',
    summary:
      'Secure payment for a Vizag Taxi Hub booking in Visakhapatnam. Complete your local, outstation or airport cab booking online.',
  },
  '/booking-confirmation': {
    name: 'Booking Confirmation',
    summary:
      'Booking confirmation from Vizag Taxi Hub in Visakhapatnam. Review your local, outstation or airport cab after you book online.',
  },
};

const OUTSTATION_TITLE = 'Visakhapatnam to {place} Taxi | Vizag Taxi Hub';
const OUTSTATION_DESCRIPTION =
  'Book a cab from Visakhapatnam to {place} with Vizag Taxi Hub. One way and round trip with a professional driver. Book online or call us.';
const ROUTE_PAIR_TITLE = '{from} to {to} | Vizag Taxi Hub';
const ROUTE_PAIR_DESCRIPTION =
  'Cab from {from} to {to} with Vizag Taxi Hub in Visakhapatnam. A car with driver for this trip. Book online or call us.';
const TOUR_TITLE = '{name} from Vizag | Vizag Taxi Hub';
const TOUR_DESCRIPTION =
  '{name} from Vizag by private cab with Vizag Taxi Hub and a professional driver. Book online or call Vizag Taxi Hub.';
const VEHICLE_TITLE = '{name} on Rent in Vizag | Vizag Taxi Hub';
const VEHICLE_DESCRIPTION =
  'Rent {name} in Vizag with a professional driver for local, airport and outstation trips. Book online with Vizag Taxi Hub.';
const GENERIC_TITLE = '{name} | Vizag Taxi Hub';
const GENERIC_DESCRIPTION =
  '{name} with Vizag Taxi Hub in Visakhapatnam. Local, outstation and airport cabs with a professional driver. Book online or call us.';

export function normalizePublicPath(raw: string): string {
  const noHash = raw.split('#')[0] ?? '';
  const noQuery = noHash.split('?')[0] ?? '';
  let path = noQuery.trim();
  if (!path.startsWith('/')) path = `/${path}`;
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep the raw path */
  }
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
}

export function canonicalUrlFor(path: string): string {
  const clean = normalizePublicPath(path);
  return clean === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${clean}`;
}

export function fitDescription(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length >= DESCRIPTION_MIN && clean.length <= DESCRIPTION_MAX) return clean;

  let out = clean;
  for (const filler of DESCRIPTION_FILLERS) {
    if (out.length >= DESCRIPTION_MIN) break;
    out = `${out.replace(/[. ]+$/g, '')}.${filler}`.replace(/\s+/g, ' ').trim();
  }

  if (out.length > DESCRIPTION_MAX) {
    const slice = out.slice(0, DESCRIPTION_MAX);
    const space = slice.lastIndexOf(' ');
    out = (space >= DESCRIPTION_MIN ? slice.slice(0, space) : slice).replace(/[.,;:\s]+$/g, '');
  }

  if (out.length < DESCRIPTION_MIN) {
    out = clean.slice(0, DESCRIPTION_MAX).trim();
  }
  if (out.length > DESCRIPTION_MAX) {
    out = out.slice(0, DESCRIPTION_MAX).trim();
  }
  return out;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split('-')
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export function isPrivatePath(path: string): boolean {
  const clean = normalizePublicPath(path);
  return PRIVATE_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}

export function h1FromTitle(title: string): string {
  const beforePipe = title.split('|')[0]?.trim() ?? title.trim();
  return beforePipe || title.trim();
}

function buildHead(title: string, description: string, path: string, ogImage: string): PublicHead {
  const canonical = canonicalUrlFor(path);
  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonical,
    ogImage,
    h1: h1FromTitle(title),
    mainText: description,
  };
}

function fromExact(path: string, exact: ExactHead): PublicHead {
  // Homepage keeps its audited description verbatim (includes rating + fare CTA).
  const description = path === '/' ? exact.description : fitDescription(exact.description);
  return buildHead(exact.title, description, path, exact.ogImage);
}

function fromName(path: string, name: string, summary: string, ogImage = DEFAULT_OG_IMAGE): PublicHead {
  return buildHead(`${name} | Vizag Taxi Hub`, fitDescription(summary), path, ogImage);
}

function genericHead(path: string, name: string): PublicHead {
  return buildHead(
    applyTemplate(GENERIC_TITLE, { name }),
    fitDescription(applyTemplate(GENERIC_DESCRIPTION, { name })),
    path,
    DEFAULT_OG_IMAGE,
  );
}

function outstationHead(path: string, placeSlug: string): PublicHead {
  const stats = lookupVizagOutstation(placeSlug);
  const place = stats?.place ?? titleCaseSlug(placeSlug);
  return buildHead(
    applyTemplate(OUTSTATION_TITLE, { place }),
    fitDescription(applyTemplate(OUTSTATION_DESCRIPTION, { place })),
    path,
    DEFAULT_OG_IMAGE,
  );
}

function tourHead(path: string, slug: string): PublicHead {
  const name = getTourDisplayName(slug);
  return buildHead(
    applyTemplate(TOUR_TITLE, { name }),
    fitDescription(applyTemplate(TOUR_DESCRIPTION, { name })),
    path,
    DEFAULT_OG_IMAGE,
  );
}

function vehicleHead(path: string, slug: string): PublicHead {
  const name = getVehicleDisplayName(slug);
  const ogImage =
    slug === 'urbania' ? URBANIA_OG : slug === 'tempo-traveller' ? TEMPO_OG : slug === 'innova-crysta' ? INNOVA_OG : DEFAULT_OG_IMAGE;
  return buildHead(
    applyTemplate(VEHICLE_TITLE, { name }),
    fitDescription(applyTemplate(VEHICLE_DESCRIPTION, { name })),
    path,
    ogImage,
  );
}

function routePairHead(path: string, fromSlug: string, toSlug: string): PublicHead {
  const from = titleCaseSlug(fromSlug);
  const to = titleCaseSlug(toSlug);
  return buildHead(
    applyTemplate(ROUTE_PAIR_TITLE, { from, to }),
    fitDescription(applyTemplate(ROUTE_PAIR_DESCRIPTION, { from, to })),
    path,
    DEFAULT_OG_IMAGE,
  );
}

export function resolvePublicHead(rawPath: string): PublicHead | null {
  const path = normalizePublicPath(rawPath);
  if (isPrivatePath(path)) return null;

  const exact = EXACT_HEADS[path];
  if (exact) return fromExact(path, exact);

  const page = STATIC_PAGES[path];
  if (page) return fromName(path, page.name, page.summary);

  const distance = path.match(/^\/outstation-taxi\/visakhapatnam-to-(.+)$/);
  if (distance?.[1]) return outstationHead(path, distance[1]);

  const vehicle = path.match(/^\/vehicle\/([a-z0-9-]+)$/);
  if (vehicle?.[1]) return vehicleHead(path, vehicle[1]);

  const tour = path.match(/^\/tours\/([a-z0-9-]+)$/);
  if (tour?.[1]) return tourHead(path, tour[1]);

  const paired = path.match(/^\/(local-taxi|airport-taxi|outstation-taxi)\/([a-z0-9-]+)-to-([a-z0-9-]+)$/);
  if (paired?.[2] && paired[3]) return routePairHead(path, paired[2], paired[3]);

  if (/\.[a-z0-9]+$/i.test(path)) return null;

  const last = path.split('/').filter(Boolean).pop();
  if (!last) return null;
  return genericHead(path, titleCaseSlug(last));
}

export type SeoHeadEntry = {
  title: string;
  description: string;
  ogImage: string;
  h1: string;
  mainText: string;
};

export type SeoHeadDocument = {
  origin: string;
  defaultOgImage: string;
  descriptionMin: number;
  descriptionMax: number;
  fillers: string[];
  privatePrefixes: string[];
  pages: Record<string, SeoHeadEntry>;
  distance: { title: string; description: string };
  routePair: { title: string; description: string };
  generic: { title: string; description: string };
};

/** Paths listed in public/sitemap.xml (source of truth for shell HTML). */
export function listSitemapPaths(sitemapXml: string): string[] {
  const paths = new Set<string>();
  const re = /<loc>\s*https?:\/\/(?:www\.)?vizagtaxihub\.com([^<\s]*)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(sitemapXml)) !== null) {
    paths.add(normalizePublicPath(match[1] || '/'));
  }
  return [...paths];
}

function knownPublicPaths(extraPaths: string[] = []): string[] {
  const paths = new Set<string>([
    ...Object.keys(EXACT_HEADS),
    ...Object.keys(STATIC_PAGES),
    ...extraPaths,
  ]);
  for (const slug of VEHICLE_SLUGS) paths.add(`/vehicle/${slug}`);
  for (const slug of TOUR_SLUGS) paths.add(`/tours/${slug}`);
  for (const path of vizagOutstationPaths()) paths.add(path);
  return [...paths];
}

export function buildSeoHeadDocument(extraPaths: string[] = []): SeoHeadDocument {
  const pages: Record<string, SeoHeadEntry> = {};
  for (const path of knownPublicPaths(extraPaths)) {
    const head = resolvePublicHead(path);
    if (!head) continue;
    pages[path] = {
      title: head.title,
      description: head.description,
      ogImage: head.ogImage,
      h1: head.h1,
      mainText: head.mainText,
    };
  }
  return {
    origin: SITE_ORIGIN,
    defaultOgImage: DEFAULT_OG_IMAGE,
    descriptionMin: DESCRIPTION_MIN,
    descriptionMax: DESCRIPTION_MAX,
    fillers: [...DESCRIPTION_FILLERS],
    privatePrefixes: [...PRIVATE_PREFIXES],
    pages,
    distance: { title: OUTSTATION_TITLE, description: OUTSTATION_DESCRIPTION },
    routePair: { title: ROUTE_PAIR_TITLE, description: ROUTE_PAIR_DESCRIPTION },
    generic: { title: GENERIC_TITLE, description: GENERIC_DESCRIPTION },
  };
}

export function validatePublicHead(): void {
  const requiredTitles: Array<[string, string]> = [
    ['/', EXACT_HEADS['/'].title],
    ['/tempo-traveller-rental-vizag', EXACT_HEADS['/tempo-traveller-rental-vizag'].title],
    ['/urbania-rental-vizag', EXACT_HEADS['/urbania-rental-vizag'].title],
    ['/airport-taxi', EXACT_HEADS['/airport-taxi'].title],
    ['/fleet', EXACT_HEADS['/fleet'].title],
  ];

  for (const [path, title] of requiredTitles) {
    const head = resolvePublicHead(`${path}?gclid=test123`);
    if (!head) throw new Error(`Missing head for ${path}`);
    if (head.title !== title) throw new Error(`Title mismatch for ${path}: ${head.title}`);
    if (path === '/') {
      if (head.description !== EXACT_HEADS['/'].description) {
        throw new Error('Homepage description must stay verbatim');
      }
      if (head.canonical !== `${SITE_ORIGIN}/`) throw new Error('Homepage canonical must end with /');
    } else {
      if (head.description.length < DESCRIPTION_MIN || head.description.length > DESCRIPTION_MAX) {
        throw new Error(`Description length ${head.description.length} for ${path}`);
      }
      if (head.canonical !== canonicalUrlFor(path)) throw new Error(`Canonical mismatch for ${path}`);
      if (head.canonical.includes('?') || head.canonical.endsWith('/')) {
        throw new Error(`Canonical has query or slash for ${path}`);
      }
    }
  }

  if (resolvePublicHead('/admin') !== null) throw new Error('Admin must not get a public title');
  if (resolvePublicHead('/admin/fleet') !== null) throw new Error('Admin child must not get a public title');

  const distance = resolvePublicHead('/outstation-taxi/visakhapatnam-to-araku-valley/');
  if (!distance || distance.title !== 'Visakhapatnam to Araku Valley Taxi | Vizag Taxi Hub') {
    throw new Error(`Distance title mismatch: ${distance?.title ?? 'missing'}`);
  }
  if (distance.canonical !== `${SITE_ORIGIN}/outstation-taxi/visakhapatnam-to-araku-valley`) {
    throw new Error('Distance canonical mismatch');
  }

  const arasavalli = resolvePublicHead('/outstation-taxi/visakhapatnam-to-arasavalli');
  if (!arasavalli || arasavalli.title !== 'Visakhapatnam to Arasavalli Taxi | Vizag Taxi Hub') {
    throw new Error(`Arasavalli title mismatch: ${arasavalli?.title ?? 'missing'}`);
  }

  const hyderabad = resolvePublicHead('/outstation-taxi/visakhapatnam-to-hyderabad');
  if (!hyderabad || hyderabad.title !== 'Visakhapatnam to Hyderabad Taxi | Vizag Taxi Hub') {
    throw new Error(`Hyderabad title mismatch: ${hyderabad?.title ?? 'missing'}`);
  }

  const unknown = resolvePublicHead('/outstation-taxi/visakhapatnam-to-mumbai');
  if (!unknown || unknown.title !== 'Visakhapatnam to Mumbai Taxi | Vizag Taxi Hub') {
    throw new Error(`Missing-distance title mismatch: ${unknown?.title ?? 'missing'}`);
  }

  const tour = resolvePublicHead('/tours/araku-valley-tour');
  if (!tour || tour.title !== 'Araku Valley Tour from Vizag | Vizag Taxi Hub') {
    throw new Error(`Tour title mismatch: ${tour?.title ?? 'missing'}`);
  }

  const vehicle = resolvePublicHead('/vehicle/ertiga');
  if (!vehicle || vehicle.title !== 'Ertiga on Rent in Vizag | Vizag Taxi Hub') {
    throw new Error(`Vehicle title mismatch: ${vehicle?.title ?? 'missing'}`);
  }

  const generated = [
    distance,
    arasavalli,
    hyderabad,
    unknown,
    tour,
    vehicle,
    resolvePublicHead('/fleet'),
    resolvePublicHead('/tours/lambasingi-tour'),
    resolvePublicHead('/local-taxi/gajuwaka-to-railway-station'),
  ];
  for (const head of generated) {
    if (!head) throw new Error('Expected a generated head');
    const length = head.description.length;
    if (length < DESCRIPTION_MIN || length > DESCRIPTION_MAX) {
      throw new Error(`Description length ${length} for ${head.canonical}: ${head.description}`);
    }
  }
}
