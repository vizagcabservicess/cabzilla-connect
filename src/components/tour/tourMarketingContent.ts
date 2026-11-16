/**
 * Hand-written marketing copy for tour detail pages that use TourMarketingLayout.
 * Araku day tour keeps its existing copy; other tours follow the same pattern.
 */

export type TourMarketingStop = {
  time?: string;
  title: string;
  detail: string;
};

export type TourMarketingFaq = { q: string; a: string };
export type TourMarketingReview = { name: string; text: string };
export type TourMarketingRouteNode = { place: string; detail: string };
export type TourMarketingChip = { label: string; value: string };
/** YouTube testimonial clip — poster only until the guest taps play. */
export type TourMarketingVideo = {
  id: string;
  quote: string;
  name: string;
  tourLabel: string;
  duration: string;
  /** Custom thumbnail from admin; empty → YouTube hqdefault. */
  posterUrl?: string | null;
  /** Full YouTube URL for open-in-app / fallback. */
  youtubeUrl?: string | null;
};

export type TourMarketingContent = {
  slug: string;
  breadcrumbLabel: string;
  headline: string;
  /** Hero chips under the H1 (duration, distance, stops, pickup). */
  heroChips: {
    duration: string;
    distanceFallbackKm: number;
    distanceSuffix?: string;
    stopsLabel: string;
    pickupNote: string;
  };
  itineraryTitle: string;
  itinerarySubtitle: string;
  /** Optional route strip above the stop list (desktop). */
  routeStrip: TourMarketingRouteNode[] | null;
  stops: TourMarketingStop[];
  inclusionsTitle: string;
  inclusionsSubtitle: string;
  included: string[];
  excluded: string[];
  policyNote: string;
  goodToKnow: TourMarketingChip[];
  faqs: TourMarketingFaq[];
  reviews: TourMarketingReview[];
  /** Cover image alt text when using tour.imageUrl. */
  coverAlt: string;
  /** Skip low-quality / cartoon cover filenames. */
  skipCoverFiles?: string[];
  /** Default pickup hour for the booking card (0–23). */
  defaultPickupHour: number;
  defaultTripMode: 'one-way' | 'round-trip';
  /**
   * WhatsApp prefill. Use {vehicle} and {date} placeholders.
   */
  whatsAppMessage: string;
  /**
   * Related-tours filter: exclude items whose name or id matches (case-insensitive).
   * Current tour is always excluded by tourId.
   */
  relatedExcludeNamePattern?: RegExp;
};

const SHARED_EXTRAS = [
  'Driver allowance is extra',
  'GST 18% applies only when a GST invoice is raised',
  'Extra hours are charged at that vehicle’s hourly rate, confirmed before you travel',
];

const SHARED_REVIEWS = [
  {
    name: 'Sai Supraj',
    text: 'Exceptional service. Our driver Nagaraj was knowledgeable and showed us places we would have missed.',
  },
  {
    name: 'Munta Sanju',
    text: 'The driver was professional and polite, and the car was clean. A stress-free journey.',
  },
  {
    name: 'Karri Reddy',
    text: 'Second time with Vizag Taxi Hub. Customer care is excellent and the service is consistent.',
  },
];

/** Shared guest clips shown on every marketing tour page (poster until play). */
export const SHARED_TOUR_TESTIMONIAL_VIDEOS: TourMarketingVideo[] = [
  {
    id: 'wrgfamvCkns',
    quote: 'Well-organized Araku trip, excellent driver and service!',
    name: 'Priya & Family',
    tourLabel: 'Araku Valley Tour',
    duration: '01:32',
    youtubeUrl: 'https://www.youtube.com/shorts/wrgfamvCkns',
  },
  {
    id: 'ROa7qu67ECA',
    quote: 'Comfortable cab and on-time service. Highly recommended!',
    name: 'Rakesh Kumar',
    tourLabel: 'Family Tour',
    duration: '01:05',
    youtubeUrl: 'https://www.youtube.com/shorts/ROa7qu67ECA',
  },
  {
    id: 'QUUuoF04zfk',
    quote: 'Safe, friendly and a memorable experience with Vizag Taxi Hub.',
    name: 'Anitha & Group',
    tourLabel: 'Araku Valley Tour',
    duration: '00:58',
    youtubeUrl: 'https://www.youtube.com/shorts/QUUuoF04zfk',
  },
];

export const TOUR_TESTIMONIALS_YOUTUBE_URL =
  'https://www.youtube.com/channel/UC2-jFwKuTHB357sBeIY4Urr';

export const TOUR_MARKETING_CONTENT: Record<string, TourMarketingContent> = {
  'araku-valley-tour': {
    slug: 'araku-valley-tour',
    breadcrumbLabel: 'Araku Valley Day Tour',
    headline: 'Vizag to Araku Valley One Day Tour Package by Cab',
    heroChips: {
      duration: '13 hrs · 7:00 AM – 8:00 PM',
      distanceFallbackKm: 260,
      distanceSuffix: 'round trip',
      stopsLabel: '10 sightseeing stops',
      pickupNote: 'Door pickup & drop in Vizag',
    },
    itineraryTitle: 'Your day, stop by stop',
    itinerarySubtitle: '7:00 AM pickup · Drop back by 8:00 PM',
    routeStrip: [
      { place: 'Visakhapatnam', detail: '7:00 AM pickup' },
      { place: 'Borra Caves', detail: 'Ghat & caves' },
      { place: 'Araku Valley', detail: 'Coffee & museums' },
      { place: 'Visakhapatnam', detail: '8:00 PM drop' },
    ],
    stops: [
      { time: '7:00 AM', title: 'Pickup from your hotel or home in Vizag', detail: '' },
      { title: 'Damuku Viewpoint', detail: 'First valley views of the ghat road' },
      { title: 'Galikonda Viewpoint', detail: 'One of the highest points in the Eastern Ghats' },
      { title: 'Borra Caves', detail: 'Million-year-old limestone caves with coloured lighting' },
      { title: 'Katiki Waterfalls', detail: 'Cab goes up to the parking point' },
      { title: 'Coffee Plantation', detail: 'Walk among the Araku coffee estates' },
      { title: 'Padmapuram Gardens', detail: 'Botanical gardens and tree-top huts' },
      { title: 'Tribal Museum', detail: "Life and culture of the valley's tribes" },
      { title: 'Coffee Museum', detail: 'Taste and buy Araku coffee' },
      { title: 'Chocolate Factory', detail: 'Local coffee-chocolate makers' },
      { title: 'Wooden Bridge', detail: 'Last photo stop before heading down' },
      { time: 'By 8:00 PM', title: 'Drop back at your pickup point', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Full-day private cab · All 10 sightseeing stops',
    included: [
      'Private AC cab with experienced ghat-road driver',
      'All fuel for the 260 km Vizag–Araku–Vizag round trip',
      'Doorstep pickup & drop anywhere in Visakhapatnam city',
      'All 10 sightseeing stops along the ghat road & Araku town',
      'Toll-gate charges along the tour route (if any)',
    ],
    excluded: [
      ...SHARED_EXTRAS,
      'Entry tickets & parking fees at Borra Caves, gardens and museums',
      'Katiki Waterfalls jeep ride beyond the cab parking point & meals',
    ],
    policyNote:
      'During peak tourist season, vehicles park in designated areas at Borra Caves and Katiki Waterfalls. Itinerary order may adjust for traffic or road conditions.',
    goodToKnow: [
      { label: 'Distance', value: '115 km one way' },
      { label: 'Drive time', value: '~3.5 hrs via ghat' },
      { label: 'Best season', value: 'Oct – Feb' },
      { label: 'Borra Caves', value: '10 AM – 5:30 PM' },
    ],
    faqs: [
      {
        q: 'How far is Araku Valley from Vizag?',
        a: 'About 115 km one way, roughly 3.5 hours by road through the Eastern Ghats. The full day tour with all stops covers about 260 km.',
      },
      {
        q: 'How much is a Vizag to Araku taxi for a day trip?',
        a: 'The price is for the whole vehicle for the day, from a sedan seating 4 up to a 16-seater Urbania. Pick a vehicle in the booking card to see that fare.',
      },
      {
        q: 'Can we visit Araku and Borra Caves in one day?',
        a: 'Yes. This tour includes Borra Caves on the way up and returns to Vizag by about 8 PM.',
      },
      {
        q: 'What are Borra Caves timings?',
        a: 'Generally 10 AM to 5:30 PM. The route is planned so you reach the caves within opening hours.',
      },
      {
        q: 'What is the best time to visit Araku Valley?',
        a: 'October to February is the most popular season for cool, misty weather. The valley is at its greenest after the monsoon rains.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Galikonda Viewpoint, Araku Valley',
    skipCoverFiles: ['araku-valley-vizagtaxihub.jpg'],
    defaultPickupHour: 7,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Vizag to Araku day tour{vehicle} on {date}.',
    relatedExcludeNamePattern: /araku/i,
  },

  'lambasingi-tour': {
    slug: 'lambasingi-tour',
    breadcrumbLabel: 'Lambasingi Tour',
    headline: 'Vizag to Lambasingi One Day Tour Package by Cab',
    heroChips: {
      duration: '13 hrs · 2:00 AM start',
      distanceFallbackKm: 300,
      distanceSuffix: 'round trip',
      stopsLabel: 'Hill-station viewpoints & valley stops',
      pickupNote: 'Door pickup & drop in Vizag',
    },
    itineraryTitle: 'Your Lambasingi day plan',
    itinerarySubtitle: '2:00 AM pickup · Same-day return to Vizag',
    routeStrip: [
      { place: 'Visakhapatnam', detail: '2:00 AM pickup' },
      { place: 'Ghat road', detail: 'Viewpoints' },
      { place: 'Lambasingi', detail: 'Valley & mist' },
      { place: 'Visakhapatnam', detail: 'Evening drop' },
    ],
    stops: [
      { time: '2:00 AM', title: 'Pickup from your hotel or home in Vizag', detail: '' },
      { title: 'Ghat viewpoints en route', detail: 'Photo stops on the climb toward Lambasingi' },
      { title: 'Lambasingi village & valley views', detail: 'Walk, misty hills and cool weather' },
      { title: 'Viewpoint & nature trails', detail: 'Open landscapes around Kothapalli / Lambasingi' },
      { title: 'Local tea / snack break', detail: 'Time for refreshments (meals not included)' },
      { time: 'By evening', title: 'Drop back at your pickup point in Vizag', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Full-day private cab · Hill-station day trip',
    included: [
      'Private AC cab with experienced hill-road driver',
      'All fuel for the Vizag–Lambasingi–Vizag round trip',
      'Doorstep pickup & drop anywhere in Visakhapatnam city',
      'Flexible photo stops along the route (as time allows)',
      'Toll-gate charges along the tour route (if any)',
    ],
    excluded: [...SHARED_EXTRAS, 'Meals, snacks and personal expenses', 'Entry fees at any private viewpoints or parks'],
    policyNote:
      'Lambasingi weather can turn misty or cold early in the morning. Carry a light jacket. Itinerary order may adjust for fog or road conditions.',
    goodToKnow: [
      { label: 'Distance', value: '150 km one way' },
      { label: 'Drive time', value: '~3.5–4 hrs' },
      { label: 'Best season', value: 'Nov – Feb' },
      { label: 'Start', value: '2:00 AM pickup' },
    ],
    faqs: [
      {
        q: 'How far is Lambasingi from Vizag?',
        a: 'About 150 km one way (about 3.5–4 hours). The full day round trip is about 300 km depending on stops.',
      },
      {
        q: 'Is Lambasingi a one-day trip from Vizag?',
        a: 'Yes. This package is a same-day private cab tour with pickup and drop in Visakhapatnam.',
      },
      {
        q: 'When is the best time to visit Lambasingi?',
        a: 'November to February is popular for cool weather and morning mist. We start at 2:00 AM so you reach the hills in time for the best views.',
      },
      {
        q: 'How is the fare calculated?',
        a: 'The price is for the whole vehicle for the day. Choose a sedan, Ertiga, Innova, Urbania or Tempo Traveller in the booking card.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Lambasingi hills near Visakhapatnam',
    defaultPickupHour: 2,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Vizag to Lambasingi day tour{vehicle} on {date}.',
  },

  'vanajangi-tour': {
    slug: 'vanajangi-tour',
    breadcrumbLabel: 'Vanajangi Tour',
    headline: 'Vizag to Vanajangi Hills One Day Tour by Cab',
    heroChips: {
      duration: '13 hrs · 2:00 AM start',
      distanceFallbackKm: 260,
      distanceSuffix: 'round trip',
      stopsLabel: 'Hills, viewpoints & ghat scenery',
      pickupNote: 'Door pickup & drop in Vizag',
    },
    itineraryTitle: 'Your Vanajangi day plan',
    itinerarySubtitle: '2:00 AM pickup · Evening return',
    routeStrip: [
      { place: 'Visakhapatnam', detail: '2:00 AM pickup' },
      { place: 'Paderu belt', detail: 'Ghat drive' },
      { place: 'Vanajangi', detail: 'Hill views' },
      { place: 'Visakhapatnam', detail: 'Evening drop' },
    ],
    stops: [
      { time: '2:00 AM', title: 'Pickup from Vizag for a sunrise run', detail: '' },
      { title: 'Ghat drive toward Paderu / Vanajangi', detail: 'Scenic Eastern Ghats stretch' },
      { title: 'Vanajangi Hills viewpoint', detail: 'Cloud beds and valley panoramas on clear mornings' },
      { title: 'Photo & tea break', detail: 'Time at the viewpoint before the descent' },
      { title: 'Optional short stops on return', detail: 'As road and time allow' },
      { time: 'By evening', title: 'Drop back in Visakhapatnam', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Full-day private cab · Hill viewpoint tour',
    included: [
      'Private AC cab with a driver used to ghat roads',
      'Fuel for the Vizag–Vanajangi–Vizag round trip',
      'Doorstep pickup & drop in Visakhapatnam',
      'Time at the main Vanajangi viewpoint',
      'Toll charges on the route (if any)',
    ],
    excluded: [...SHARED_EXTRAS, 'Meals and personal expenses', 'Any local guide fees'],
    policyNote:
      'Sunrise views depend on weather and fog. Pickup is at 2:00 AM so you can reach the hills for sunrise. Road conditions can change after rains.',
    goodToKnow: [
      { label: 'Distance', value: '~120–130 km one way' },
      { label: 'Drive time', value: '~3.5–4 hrs' },
      { label: 'Best season', value: 'Oct – Feb' },
      { label: 'Start', value: '2:00 AM pickup' },
    ],
    faqs: [
      {
        q: 'Can we see the Vanajangi sunrise from Vizag in one day?',
        a: 'Yes. Pickup is at 2:00 AM so you can reach the viewpoint for sunrise. The cab waits and returns you to Vizag the same day.',
      },
      {
        q: 'How difficult is the drive?',
        a: 'It is a ghat road. We assign drivers familiar with hill routes. Travel time varies with fog and traffic.',
      },
      {
        q: 'What should we carry?',
        a: 'A warm layer, water, and a charged phone/camera. Misty mornings can feel cold even in Vizag’s mild season.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Vanajangi Hills viewpoint',
    defaultPickupHour: 2,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Vizag to Vanajangi day tour{vehicle} on {date}.',
  },

  'vizag-north-city-tour': {
    slug: 'vizag-north-city-tour',
    breadcrumbLabel: 'Vizag North City Tour',
    headline: 'Vizag North City Sightseeing Tour by Private Cab',
    heroChips: {
      duration: '10 hrs · Temple & viewpoints',
      distanceFallbackKm: 100,
      distanceSuffix: 'approx. city circuit',
      stopsLabel: 'Simhachalam, Yarada & Dolphin’s Nose',
      pickupNote: 'Hotel / home pickup in Vizag',
    },
    itineraryTitle: 'North Vizag highlights',
    itinerarySubtitle: 'Three stops · Dolphin’s Nose from 3:00 PM',
    routeStrip: [
      { place: 'Pickup', detail: 'Your hotel' },
      { place: 'Simhachalam', detail: 'Temple visit' },
      { place: 'Yarada Beach', detail: 'Hillside shore' },
      { place: "Dolphin's Nose", detail: '3:00–5:00 PM' },
    ],
    stops: [
      { time: 'Morning', title: 'Pickup from your hotel or home', detail: '' },
      { title: 'Simhachalam Temple', detail: 'Sri Varaha Lakshmi Narasimha Swamy' },
      { title: 'Yarada Beach', detail: 'Quiet beach below the hills' },
      { title: "Dolphin's Nose", detail: '3:00 PM – 5:00 PM · cliff view of the bay and harbour' },
      { time: 'Evening', title: 'Drop back at your hotel or preferred point', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Private city cab · Up to ~10 hours',
    included: [
      'Private AC cab with local Vizag driver',
      'Fuel for Simhachalam, Yarada Beach and Dolphin’s Nose',
      'Hotel or home pickup & drop in Visakhapatnam',
      'Waiting time at the three sights within the package window',
    ],
    excluded: [...SHARED_EXTRAS, 'Temple entry, special darshan and parking fees', 'Meals and personal expenses'],
    policyNote:
      'Dolphin’s Nose is visited between 3:00 PM and 5:00 PM. Simhachalam can be crowded on festival days, so start with the temple. RK Beach, Kailasagiri and the museums are on the South City Tour.',
    goodToKnow: [
      { label: 'Duration', value: '~10 hours' },
      { label: 'Stops', value: '3 sights' },
      { label: 'Viewpoint', value: '3:00–5:00 PM' },
      { label: 'Best start', value: 'Morning' },
    ],
    faqs: [
      {
        q: 'Which places are included?',
        a: 'Only three: Simhachalam Temple, Yarada Beach and Dolphin’s Nose. Dolphin’s Nose is between 3:00 PM and 5:00 PM.',
      },
      {
        q: 'Can we skip some stops?',
        a: 'Yes. Tell the driver if you want to drop one of the three. The fare is for the private cab and time window.',
      },
      {
        q: 'Do tickets cost extra?',
        a: 'Yes. Temple entry, special darshan and parking are paid at the counters.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Simhachalam Temple and Yarada Beach, Visakhapatnam',
    defaultPickupHour: 8,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Vizag North City sightseeing tour{vehicle} on {date}.',
  },

  'vizag-south-city-tour': {
    slug: 'vizag-south-city-tour',
    breadcrumbLabel: 'Vizag South City Tour',
    headline: 'Vizag South City Sightseeing Tour by Private Cab',
    heroChips: {
      duration: '10 hrs · Beaches & museums',
      distanceFallbackKm: 100,
      distanceSuffix: 'approx. city circuit',
      stopsLabel: 'RK Beach, museums & parks',
      pickupNote: 'Hotel / home pickup in Vizag',
    },
    itineraryTitle: 'South Vizag highlights',
    itinerarySubtitle: 'Typical order · Adjusts for openings & your pace',
    routeStrip: [
      { place: 'Pickup', detail: 'Your hotel' },
      { place: 'RK Beach', detail: 'Museums & promenade' },
      { place: 'Kailasagiri', detail: 'Rushikonda' },
      { place: 'Drop', detail: 'Same day' },
    ],
    stops: [
      { time: 'Morning', title: 'Pickup from your hotel or home', detail: '' },
      { title: 'Central Park', detail: 'A green break in the city' },
      { title: 'Helicopter Museum', detail: 'Saaras, the Navy helicopter on display' },
      { title: 'RK Beach', detail: 'Seaside promenade and photos' },
      { title: 'Fighter Jet Museum (TU-142)', detail: 'Walk through a retired Navy aircraft' },
      { title: 'INS Kurusura Submarine Museum', detail: 'A real submarine on Beach Road' },
      { title: 'Tenneti Park', detail: 'Cliffside park above the bay' },
      { title: 'Kailasagiri', detail: 'Hilltop views of the city and coast' },
      { title: 'Rushikonda Beach', detail: 'Golden sand and water sports' },
      { title: 'Kalimatha Temple', detail: 'Hilltop shrine with sea views' },
      { time: 'Evening', title: 'Drop back at your hotel or preferred point', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Private city cab · Up to ~10 hours',
    included: [
      'Private AC cab with local Vizag driver',
      'Fuel for the south Vizag circuit',
      'Hotel or home pickup & drop in Visakhapatnam',
      'Waiting time at the listed sights within the package window',
    ],
    excluded: [...SHARED_EXTRAS, 'Museum, park and temple entry tickets', 'Meals, parking and personal expenses'],
    policyNote:
      'Museum and park timings can change on public holidays. Your driver will suggest the best order for the day. Simhachalam is not a stop on this tour.',
    goodToKnow: [
      { label: 'Duration', value: '~10 hours' },
      { label: 'Focus', value: 'Beaches & museums' },
      { label: 'Best start', value: 'Morning' },
      { label: 'Pace', value: 'Relaxed city day' },
    ],
    faqs: [
      {
        q: 'Can we combine north and south in one day?',
        a: 'It is tight. Most guests pick either North or South City Tour. WhatsApp us if you want a custom full-day mix.',
      },
      {
        q: 'Is Simhachalam included?',
        a: 'No. Simhachalam is not part of this south city tour. The day covers RK Beach, the naval museums, Tenneti Park, Kailasagiri, Rushikonda and Kalimatha Temple.',
      },
      {
        q: 'Is the cab private?',
        a: 'Yes. The fare is for your vehicle only, not a shared sightseeing bus.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'RK Beach and the Vizag coastline',
    defaultPickupHour: 8,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Vizag South City sightseeing tour{vehicle} on {date}.',
  },

  'arasavalli-srikurmam-tour': {
    slug: 'arasavalli-srikurmam-tour',
    breadcrumbLabel: 'Arasavalli & Srikurmam Tour',
    headline: 'Vizag to Arasavalli & Srikurmam Temple Tour by Cab',
    heroChips: {
      duration: '12 hrs · Pilgrimage day trip',
      distanceFallbackKm: 250,
      distanceSuffix: 'round trip',
      stopsLabel: 'Two sacred temple stops',
      pickupNote: 'Door pickup & drop in Vizag',
    },
    itineraryTitle: 'Temple day plan',
    itinerarySubtitle: 'Morning start · Same-day return',
    routeStrip: [
      { place: 'Visakhapatnam', detail: 'Morning pickup' },
      { place: 'Arasavalli', detail: 'Suryanarayana Swamy' },
      { place: 'Srikurmam', detail: 'Kurmanatha Swamy' },
      { place: 'Visakhapatnam', detail: 'Evening drop' },
    ],
    stops: [
      { time: 'Morning', title: 'Pickup from your hotel or home in Vizag', detail: '' },
      { title: 'Arasavalli Sun Temple', detail: 'Sri Suryanarayana Swamy Temple near Srikakulam' },
      { title: 'Srikurmam Temple', detail: 'Rare Kurmanatha (tortoise incarnation) shrine' },
      { title: 'Lunch / rest break', detail: 'As per your preference (meals not included)' },
      { time: 'Evening', title: 'Return drop in Visakhapatnam', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Private pilgrimage cab · Same-day return',
    included: [
      'Private AC cab with professional driver',
      'Fuel for the Vizag–temples–Vizag round trip',
      'Doorstep pickup & drop in Visakhapatnam',
      'Waiting time at both temples within the day package',
      'Toll charges on the route (if any)',
    ],
    excluded: [...SHARED_EXTRAS, 'Special darshan tickets and donations', 'Meals, parking and personal expenses'],
    policyNote:
      'Temple dress codes apply. Festival days mean longer queues — start early and keep flexible buffer time.',
    goodToKnow: [
      { label: 'Distance', value: '~250 km round trip' },
      { label: 'Duration', value: '~12 hours' },
      { label: 'Best for', value: 'Families & elders' },
      { label: 'Start', value: 'Morning' },
    ],
    faqs: [
      {
        q: 'Can elders manage this as a day trip?',
        a: 'Yes — it is a popular same-day pilgrimage from Vizag. We recommend a comfortable sedan or Innova and an early start.',
      },
      {
        q: 'Are both temples covered?',
        a: 'Yes. Arasavalli and Srikurmam are the two main stops on this package.',
      },
      {
        q: 'Do you arrange darshan tickets?',
        a: 'Tickets and donations are paid at the temple. The cab and waiting time are included in the fare.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Arasavalli and Srikurmam temples',
    defaultPickupHour: 6,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Arasavalli & Srikurmam temple tour{vehicle} on {date}.',
  },

  'araku-vizag-3d-2n': {
    slug: 'araku-vizag-3d-2n',
    breadcrumbLabel: 'Araku–Vizag 3D/2N',
    headline: '3 Days Vizag & Araku Valley Tour Package by Cab',
    heroChips: {
      duration: '3 days / 2 nights',
      distanceFallbackKm: 460,
      distanceSuffix: 'total touring',
      stopsLabel: 'Vizag & Araku',
      pickupNote: 'Cab only · hotels extra',
    },
    itineraryTitle: 'Day-by-day plan',
    itinerarySubtitle: 'Both nights in Vizag · Hotels & meals on your own',
    routeStrip: [
      { place: 'Day 1', detail: 'Beaches & parks' },
      { place: 'Day 2', detail: 'Borra & Araku' },
      { place: 'Day 3', detail: 'Yarada & temple' },
      { place: 'End', detail: 'Vizag drop' },
    ],
    stops: [
      { time: 'Day 1', title: 'Pickup in Vizag', detail: 'Hotel or railway station, within 10 km · about 10 hours' },
      { title: 'Rushikonda Beach', detail: 'Golden sand and water sports' },
      { title: 'Kailasagiri Hill Park', detail: 'City and coastline views' },
      { title: 'Tenneti Park', detail: 'Cliffside park on Beach Road' },
      { title: 'RK Beach', detail: 'Evening stop on the promenade' },
      { title: 'Beach Road museums', detail: 'Submarine Museum, TU 142, Visakha Museum, Sea Harrier' },
      { title: 'Central Park', detail: 'Short stroll before the hotel drop' },
      { time: 'Night', title: 'Overnight in Vizag', detail: 'Hotel on your own. Cab resumes at 7:00 AM' },
      { time: 'Day 2', title: 'Araku Valley day trip', detail: '7:00 AM hotel pickup · back in Vizag by about 8:00 PM' },
      { title: 'Damuku Viewpoint', detail: 'Valley views on the ghat road' },
      { title: 'Borra Caves', detail: 'Limestone caves with coloured lighting' },
      { title: 'Katiki Waterfalls', detail: 'Jeep ride and short trek are extra' },
      { title: 'Coffee plantations', detail: 'Araku coffee estates' },
      { title: 'Galikonda Viewpoint', detail: 'Highest viewpoint on this circuit' },
      { title: 'Coffee Museum', detail: 'Taste and buy Araku coffee' },
      { title: 'Tribal Museum', detail: "Life and culture of the valley's tribes" },
      { title: 'Chocolate Factory', detail: 'Local coffee-chocolate makers' },
      { title: 'Padmapuram Gardens', detail: 'Botanical gardens and tree-top huts' },
      { time: 'Night', title: 'Overnight in Vizag', detail: 'Evening drop at the hotel. Stay is on your own' },
      { time: 'Day 3', title: 'South Vizag and departure', detail: 'Checkout, then about 10 hours in the cab' },
      { title: 'Yarada Beach', detail: 'Black-sand beach below the hills' },
      { title: "Dolphin's Nose", detail: 'Bay of Bengal viewpoint' },
      { title: 'Simhachalam Temple', detail: 'Sri Varaha Lakshmi Narasimha Swamy' },
      { time: 'End', title: 'Drop in Visakhapatnam', detail: 'Hotel or railway station' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Chauffeur-driven cab for 3D/2N · Hotels usually separate',
    included: [
      'Private AC cab with driver for the 3-day itinerary',
      'Fuel for the planned Vizag + Araku circuit',
      'Pickup & drop within the trip plan (hotel / station / airport as agreed)',
      'Toll charges on the touring route (if any)',
    ],
    excluded: [
      ...SHARED_EXTRAS,
      'Hotel rooms, meals and entry tickets',
      'Personal expenses and optional activities',
    ],
    policyNote:
      'This package is centred on the private cab. Hotel category and meal plans can be arranged separately — ask on WhatsApp when you book.',
    goodToKnow: [
      { label: 'Duration', value: '3D / 2N' },
      { label: 'Distance', value: '~460 km touring' },
      { label: 'Best season', value: 'Oct – Feb' },
      { label: 'Stay', value: 'Hotels usually extra' },
    ],
    faqs: [
      {
        q: 'Are hotels included in this price?',
        a: 'The listed fare is typically for the private cab. We can quote hotels separately based on your budget.',
      },
      {
        q: 'Can we customise days?',
        a: 'Yes. Share your must-see list on WhatsApp and we will adjust the day plan and vehicle.',
      },
      {
        q: 'Is Araku covered?',
        a: 'Yes. Day 2 is a full Araku day trip: Damuku, Borra Caves, Katiki Waterfalls, Galikonda, the coffee and tribal museums, the chocolate factory, and Padmapuram Gardens, then back to Vizag the same evening.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Vizag and Araku Valley multi-day tour',
    defaultPickupHour: 9,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the 3 Days Vizag & Araku Valley tour{vehicle} starting {date}.',
    relatedExcludeNamePattern: /araku/i,
  },

  'annavaram-temple-tour-vizag': {
    slug: 'annavaram-temple-tour-vizag',
    breadcrumbLabel: 'Annavaram Temple Tour',
    headline: 'Vizag to Annavaram Temple One Day Tour by Cab',
    heroChips: {
      duration: '12 hrs · Pilgrimage day trip',
      distanceFallbackKm: 260,
      distanceSuffix: 'round trip',
      stopsLabel: 'Satyanarayana Swamy Temple',
      pickupNote: 'Door pickup & drop in Vizag',
    },
    itineraryTitle: 'Annavaram day plan',
    itinerarySubtitle: 'Morning darshan run · Same-day return',
    routeStrip: [
      { place: 'Visakhapatnam', detail: 'Morning pickup' },
      { place: 'Annavaram', detail: 'Ratnagiri Hills' },
      { place: 'Temple time', detail: 'Darshan & rest' },
      { place: 'Visakhapatnam', detail: 'Evening drop' },
    ],
    stops: [
      { time: 'Morning', title: 'Pickup from your hotel or home in Vizag', detail: '' },
      { title: 'Drive to Annavaram (Ratnagiri Hills)', detail: 'Comfortable private AC taxi journey' },
      { title: 'Sri Veera Venkata Satyanarayana Swamy Temple', detail: 'Darshan time for the family' },
      { title: 'Lunch / rest near the temple town', detail: 'Meals not included' },
      { time: 'Evening', title: 'Return drop in Visakhapatnam', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Private pilgrimage cab · Same-day return',
    included: [
      'Private AC cab with professional driver',
      'Fuel for the Vizag–Annavaram–Vizag round trip',
      'Doorstep pickup & drop in Visakhapatnam',
      'Waiting time at the temple within the day package',
      'Toll charges on the route (if any)',
    ],
    excluded: [...SHARED_EXTRAS, 'Special darshan tickets and donations', 'Meals, parking and personal expenses'],
    policyNote:
      'Ideal for families, couples and senior citizens. Festival days are busier — an early start helps.',
    goodToKnow: [
      { label: 'Distance', value: '~130 km one way' },
      { label: 'Duration', value: '~12 hours' },
      { label: 'Best for', value: 'Pilgrimage families' },
      { label: 'Return', value: 'Same day to Vizag' },
    ],
    faqs: [
      {
        q: 'Is Annavaram possible as a one-day trip from Vizag?',
        a: 'Yes. This package is designed as a same-day private taxi tour with return to Visakhapatnam.',
      },
      {
        q: 'Which vehicles can we book?',
        a: 'Sedan, Ertiga, Innova Crysta and larger options depending on group size — pick one in the booking card.',
      },
      {
        q: 'Are temple tickets included?',
        a: 'No. Darshan tickets and donations are paid at the temple; the cab fare covers transport and waiting.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Annavaram Satyanarayana Swamy Temple',
    defaultPickupHour: 6,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Annavaram Temple tour from Vizag{vehicle} on {date}.',
  },

  'araku-valley-package-2d-1n': {
    slug: 'araku-valley-package-2d-1n',
    breadcrumbLabel: 'Araku 2D/1N Package',
    headline: 'Araku Valley 2 Days 1 Night Tour Package by Cab',
    heroChips: {
      duration: '2 days / 1 night · ~30 hours',
      distanceFallbackKm: 260,
      distanceSuffix: 'touring',
      stopsLabel: 'Borra, Araku & overnight',
      pickupNote: 'Cab included · Hotel usually extra',
    },
    itineraryTitle: 'Two-day Araku plan',
    itinerarySubtitle: 'Overnight in Araku · Return to Vizag next day',
    routeStrip: [
      { place: 'Day 1', detail: 'Borra & Katiki' },
      { place: 'Night', detail: 'Araku stay' },
      { place: 'Day 2', detail: 'Museums & gardens' },
      { place: 'Return', detail: 'Vizag drop' },
    ],
    stops: [
      { time: 'Day 1', title: 'Vizag to Araku Valley', detail: 'Pickup from the city, a hotel or the railway station' },
      { title: 'Damuku Viewpoint', detail: 'Mountain views on the ghat road' },
      { title: 'Galikonda Viewpoint', detail: 'Eastern Ghats viewpoint' },
      { title: 'Borra Caves', detail: 'Limestone caves on the way up' },
      { title: 'Katiki Waterfalls', detail: 'Cab only up to the parking area' },
      { title: 'Coffee Plantation', detail: 'Plantation stop before Araku' },
      { title: 'Check-in at the Araku hotel', detail: 'The room is not included in the cab fare' },
      { time: 'Night', title: 'Overnight stay in Araku Valley', detail: '' },
      { time: 'Day 2', title: 'Araku Valley to Vizag', detail: 'Valley sights after breakfast, then the drive back' },
      { title: 'Madagada View Point', detail: '' },
      { title: 'Breakfast and hotel check-out', detail: 'Meals are not included' },
      { title: 'Coffee Museum', detail: '' },
      { title: 'Tribal Museum', detail: '' },
      { title: 'Chocolate Factory', detail: '' },
      { title: 'Padmapuram Gardens', detail: '' },
      { title: 'Lunch at a local restaurant', detail: 'Meals are not included' },
      { time: 'Evening', title: 'Drop at your hotel or Vizag railway station', detail: '' },
    ],
    inclusionsTitle: "What's included in the fare",
    inclusionsSubtitle: 'Private cab for 2D/1N · Hotel and meals extra',
    included: [
      'Pickup from your home, hotel or railway station in Visakhapatnam',
      'Private AC cab with driver for the two-day itinerary',
      'Fuel for the Vizag–Araku–Vizag circuit',
      'Toll charges on the route, if any',
    ],
    excluded: [
      ...SHARED_EXTRAS,
      'Hotel stay and meals in Araku',
      'Entry tickets and parking at the sights',
      'Ride from the Katiki check-post to the waterfall',
    ],
    policyNote:
      'The cab goes only as far as the Katiki Waterfalls parking area. In peak season, Borra Caves and Katiki may allow parking only in designated lots. The hotel and meals are not part of the cab fare.',
    goodToKnow: [
      { label: 'Duration', value: '2D / 1N' },
      { label: 'Distance', value: '~260 km' },
      { label: 'Best season', value: 'Oct – Feb' },
      { label: 'Stay', value: 'Hotel extra' },
    ],
    faqs: [
      {
        q: 'How is this different from the one-day Araku tour?',
        a: 'You stay overnight in Araku. Day 1 covers the ghat viewpoints, Borra Caves, Katiki and a coffee plantation. Day 2 covers Madagada, the museums, the chocolate factory and Padmapuram Gardens before the return to Vizag.',
      },
      {
        q: 'Are hotels included?',
        a: 'No. Lodging and meals in Araku are extra. We can add a hotel when you enquire.',
      },
      {
        q: 'Does the cab go to Katiki Waterfalls?',
        a: 'The cab goes to the parking area. The ride from the check-post to the waterfall is extra.',
      },
    ],
    reviews: SHARED_REVIEWS,
    coverAlt: 'Araku Valley overnight package',
    defaultPickupHour: 7,
    defaultTripMode: 'round-trip',
    whatsAppMessage: 'Hi, I want the Araku Valley 2D/1N package{vehicle} starting {date}.',
    relatedExcludeNamePattern: /araku/i,
  },
};

/** Also recognise API tourId-style keys after slugify. */
const ALIASES: Record<string, string> = {
  araku: 'araku-valley-tour',
  'araku-valley': 'araku-valley-tour',
  lambasingi: 'lambasingi-tour',
  'vanajangi-tour': 'vanajangi-tour',
  vanajangi: 'vanajangi-tour',
  'vanjangi-tour': 'vanajangi-tour',
  'vizag-north-city-tour': 'vizag-north-city-tour',
  'vizag-south-city-tour': 'vizag-south-city-tour',
  'arasavalli-srikurmam-tour': 'arasavalli-srikurmam-tour',
  'arasavalli-srikurmam': 'arasavalli-srikurmam-tour',
  'araku-vizag-3d-2n': 'araku-vizag-3d-2n',
  // Slugify of "3 Days Vizag & Araku Valley Tour" when name-map misses (e.g. trailing space).
  '3-days-vizag-and-araku-valley-tour': 'araku-vizag-3d-2n',
  '3-days-vizag-araku-valley-tour': 'araku-vizag-3d-2n',
  'araku-vizag-3d-2n-tour': 'araku-vizag-3d-2n',
  'annavaram-temple-tour': 'annavaram-temple-tour-vizag',
  'annavaram-temple-tour-vizag': 'annavaram-temple-tour-vizag',
  'araku-valley-package-2d-1n': 'araku-valley-package-2d-1n',
  'araku-valley-package-2d-1n-tour': 'araku-valley-package-2d-1n',
  'araku-copy': 'araku-valley-package-2d-1n',
};

export function resolveTourMarketingSlug(slug: string | undefined | null): string | null {
  const raw = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  if (!raw) return null;
  if (TOUR_MARKETING_CONTENT[raw]) return raw;
  const aliased = ALIASES[raw];
  if (aliased && TOUR_MARKETING_CONTENT[aliased]) return aliased;
  return null;
}

export function getTourMarketingContent(slug: string | undefined | null): TourMarketingContent | null {
  const key = resolveTourMarketingSlug(slug);
  return key ? TOUR_MARKETING_CONTENT[key] : null;
}

export function hasTourMarketingLayout(slug: string | undefined | null): boolean {
  return getTourMarketingContent(slug) != null;
}

/** True when the current path is a tour detail page with marketing layout. */
export function isTourMarketingPath(pathname: string): boolean {
  const match = pathname.match(/^\/tours\/([^/]+)\/?$/i);
  if (!match) return false;
  return hasTourMarketingLayout(decodeURIComponent(match[1]));
}
