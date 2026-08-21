export const AIRPORT_TAXI_PAGE_URL = 'https://vizagtaxihub.com/airport-taxi';
export const AIRPORT_TAXI_PHONE_DISPLAY = '+91 9966363662';
export const AIRPORT_TAXI_PHONE_TEL = '+919966363662';
export const AIRPORT_TAXI_FLIGHT_STATUS_URL = 'https://www.flightradar24.com/data/airports/vtz';

export const AIRPORT_TAXI_WHATSAPP_MESSAGE = [
  'Hi! I need a Bhogapuram Airport taxi (Alluri Sitarama Raju International Airport).',
  '',
  '✈️ Flight Number:',
  '📅 Arrival Date:',
  '⏰ Arrival Time:',
  '📍 Drop Location:',
  '👥 Number of Passengers:',
].join('\n');

export const AIRPORT_TAXI_WHATSAPP_URL =
  'https://wa.me/919966363662?text=' + encodeURIComponent(AIRPORT_TAXI_WHATSAPP_MESSAGE);

export const AIRPORT_POPULAR_ROUTES = [
  {
    to: 'Visakhapatnam City',
    cardTo: 'Visakhapatnam City',
    distance: '~50 km',
  },
  {
    to: 'Visakhapatnam Railway Station',
    cardTo: 'Railway Station',
    distance: '~52 km',
  },
  {
    to: 'RK Beach / Beach Road',
    cardTo: 'Dwaraka Nagar / Beach',
    distance: '~50 km',
  },
  {
    to: 'MVP Colony',
    cardTo: 'MVP Colony',
    distance: '~48 km',
  },
  {
    to: 'Gajuwaka',
    cardTo: 'Gajuwaka / Steel Plant',
    distance: '~55 km',
  },
  {
    to: 'Rushikonda',
    cardTo: 'Rushikonda / Beach',
    distance: '~25–30 km',
  },
  {
    to: 'Bheemili',
    cardTo: 'Bheemili',
    distance: '~25–30 km',
  },
] as const;

export const AIRPORT_VIZAG_DESTINATIONS = [
  'Visakhapatnam Railway Station',
  'MVP Colony',
  'Beach Road',
  'RK Beach',
  'Gajuwaka',
  'Steel Plant',
  'Dwaraka Nagar',
  'Rushikonda',
  'Bheemili',
  'Kailasagiri',
  'Madhurawada',
  'Anakapalle',
] as const;

export const AIRPORT_NORTH_ANDHRA_DESTINATIONS = [
  'Vizianagaram',
  'Srikakulam',
  'Bhogapuram',
  'Bobbili',
  'Palakonda',
  'Kurupam',
  'Parvathipuram',
  'Pusapatirega',
  'Nellimarla',
] as const;

export const AIRPORT_DIRECT_CITIES = [
  'Hyderabad',
  'Delhi',
  'Chennai',
  'Bengaluru',
  'Kolkata',
  'Navi Mumbai',
  'Tirupati',
] as const;

export const AIRPORT_PICKUP_STEPS = [
  {
    shortTitle: 'Share Details',
    title: 'Share your flight details',
    body: 'Provide your flight number, arrival date and destination while booking.',
  },
  {
    shortTitle: 'We Monitor',
    title: 'We monitor your flight',
    body: 'Our team checks the flight status and coordinates the pickup based on the latest arrival information.',
  },
  {
    shortTitle: 'Driver Confirms',
    title: 'Your driver coordinates the pickup',
    body: 'The driver plans the airport arrival according to the flight timing and pickup requirements.',
  },
  {
    shortTitle: 'Meet Driver',
    title: 'Meet your driver',
    body: 'Look for your driver/name board at the agreed pickup point and proceed with your luggage.',
  },
  {
    shortTitle: 'Safe Ride',
    title: 'Travel directly to your destination',
    body: 'Enjoy a direct transfer from Bhogapuram Airport without having to search for a taxi after landing.',
  },
] as const;

export const AIRPORT_KNOW_BEFORE = [
  {
    title: 'New Airport Location',
    body: "Visakhapatnam's new airport is located at Bhogapuram in Vizianagaram district, approximately 45 km from Visakhapatnam.",
  },
  {
    title: 'Airport Code',
    body: 'The airport is associated with the VTZ code used for Visakhapatnam air services.',
  },
  {
    title: 'Longer Transfer to Vizag',
    body: 'The new airport is farther from central Visakhapatnam than the previous airport. Allow sufficient travel time, particularly during peak traffic.',
  },
  {
    title: 'Plan Your Pickup',
    body: 'For arrivals, share your flight number with us so we can coordinate the pickup around the expected arrival time.',
  },
  {
    title: 'Airport Pickup',
    body: 'The airport has designated arrival and parking areas. Pickup and waiting arrangements may be subject to airport traffic and parking regulations.',
  },
  {
    title: 'Keep Your Phone Available',
    body: 'After landing, keep your phone switched on so your driver can contact you and coordinate the final pickup point if required.',
  },
] as const;

export const AIRPORT_ADVANCE_BENEFITS = [
  'Fixed fare before travel',
  'Driver arranged in advance',
  'Flight monitoring',
  'Multiple vehicle options',
  'Family-friendly transfers',
  'Group airport transfers',
  '24/7 booking assistance',
] as const;

export const AIRPORT_INTERNAL_LINKS = [
  { name: 'Airport Transfer', href: '/airport-taxi' },
  { name: 'Local Taxi', href: '/local-taxi' },
  { name: 'Outstation Taxi', href: '/outstation-taxi' },
  { name: 'Tempo Traveller Rental', href: '/tempo-traveller-rental-vizag' },
  { name: 'Urbania Rental', href: '/urbania-rental-vizag' },
  { name: 'Innova Crysta', href: '/vehicle/innova-crysta' },
  { name: 'Vizag City Tour', href: '/tours/vizag-north-city-tour' },
  { name: 'Araku Valley Tour', href: '/araku-tour-packages-vizag' },
  { name: 'Vizianagaram Taxi', href: '/outstation-taxi/visakhapatnam-to-vizianagaram' },
  { name: 'Srikakulam Taxi', href: '/outstation-taxi/visakhapatnam-to-srikakulam' },
  { name: 'Corporate Transport', href: '/corporate-tempo-traveller-vizag' },
  { name: 'Group Tours', href: '/group-tours' },
] as const;

export const AIRPORT_FAQS = [
  {
    question: 'What is Vizag airport called now?',
    answer:
      "Visakhapatnam's new airport is Alluri Sitarama Raju International Airport, located at Bhogapuram in Vizianagaram district.",
  },
  {
    question: 'Where is Bhogapuram Airport located?',
    answer:
      'Bhogapuram Airport is located in Bhogapuram, Vizianagaram district, Andhra Pradesh. The airport site is approximately 45 km from Visakhapatnam.',
  },
  {
    question: 'Is Bhogapuram Airport the same as Vizag Airport?',
    answer:
      'Bhogapuram is the new airport serving the Visakhapatnam region. Scheduled commercial operations are moving from the previous Visakhapatnam airport facility to the new Bhogapuram airport.',
  },
  {
    question: 'What is the airport code for Bhogapuram Airport?',
    answer: 'The airport is associated with the VTZ code for Visakhapatnam air services.',
  },
  {
    question: 'How far is Bhogapuram Airport from Visakhapatnam?',
    answer:
      'The airport is approximately 45 km from Visakhapatnam. The actual road distance and journey time depend on your destination and route.',
  },
  {
    question: 'How long does it take from Bhogapuram Airport to Vizag?',
    answer:
      'For central Visakhapatnam, allow approximately 60–75 minutes, although actual travel time can vary depending on traffic and your destination.',
  },
  {
    question: 'Do you provide pickup from Bhogapuram Airport?',
    answer:
      'Yes. Vizag Taxi Hub provides airport pickup and drop services from Alluri Sitarama Raju International Airport to Visakhapatnam, Vizianagaram, Srikakulam and other destinations.',
  },
  {
    question: 'Do you track flight delays?',
    answer:
      'Yes. Share your flight number while booking and our team can monitor the flight status and coordinate the pickup accordingly.',
  },
  {
    question: 'Can I book an airport taxi for my family?',
    answer:
      'Yes. You can choose from sedan, Ertiga, Innova Crysta and larger vehicles depending on your group size and luggage requirements.',
  },
  {
    question: 'Do you provide Tempo Traveller airport transfers?',
    answer:
      'Yes. Tempo Travellers are available for larger families, tour groups, corporate teams and group airport transfers.',
  },
  {
    question: 'Can I book an Urbania from Bhogapuram Airport?',
    answer:
      'Yes. Urbania vehicles can be arranged for larger groups, corporate travel and comfortable airport transfers, subject to availability.',
  },
  {
    question: 'Can I travel directly from Bhogapuram Airport to Vizianagaram or Srikakulam?',
    answer:
      'Yes. We provide direct airport transfers to Vizianagaram, Srikakulam and other destinations in North Andhra.',
  },
  {
    question: 'Should I book my airport taxi in advance?',
    answer:
      'We recommend booking in advance, especially for early-morning arrivals, late-night flights, large groups and peak travel dates. This allows us to arrange the appropriate vehicle and coordinate your pickup.',
  },
] as const;

const BUSINESS_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram',
  addressLocality: 'Visakhapatnam',
  addressRegion: 'Andhra Pradesh',
  postalCode: '530024',
  addressCountry: 'IN',
} as const;

export function buildAirportTaxiStructuredData() {
  const localBusiness = {
    '@type': 'LocalBusiness',
    '@id': `${AIRPORT_TAXI_PAGE_URL}#business`,
    name: 'Vizag Taxi Hub',
    url: 'https://vizagtaxihub.com',
    telephone: '+91-9966363662',
    image: 'https://vizagtaxihub.com/og-image.png',
    address: BUSINESS_ADDRESS,
    areaServed: [
      { '@type': 'City', name: 'Visakhapatnam' },
      { '@type': 'City', name: 'Vizianagaram' },
      { '@type': 'City', name: 'Srikakulam' },
      { '@type': 'AdministrativeArea', name: 'Bhogapuram' },
    ],
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      localBusiness,
      {
        '@type': ['TaxiService', 'Service'],
        '@id': `${AIRPORT_TAXI_PAGE_URL}#service`,
        name: 'Bhogapuram Airport Taxi / Airport Transfer',
        serviceType: 'Airport Transfer',
        description:
          'Fixed-rate airport taxi to and from Alluri Sitarama Raju International Airport at Bhogapuram, with flight tracking, meet & greet and 24/7 booking assistance.',
        url: AIRPORT_TAXI_PAGE_URL,
        provider: { '@id': `${AIRPORT_TAXI_PAGE_URL}#business` },
        areaServed: localBusiness.areaServed,
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: AIRPORT_TAXI_PAGE_URL,
          servicePhone: {
            '@type': 'ContactPoint',
            telephone: '+91-9966363662',
            contactType: 'customer service',
            availableLanguage: ['English', 'Telugu', 'Hindi'],
          },
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${AIRPORT_TAXI_PAGE_URL}#webpage`,
        url: AIRPORT_TAXI_PAGE_URL,
        name: 'Bhogapuram Airport Taxi | Vizag Taxi Hub',
        description:
          'Book Bhogapuram Airport taxi to or from Visakhapatnam. Fixed fares, flight tracking, meet & greet and 24/7 airport transfers with Vizag Taxi Hub.',
        about: { '@id': `${AIRPORT_TAXI_PAGE_URL}#service` },
        isPartOf: {
          '@type': 'WebSite',
          name: 'Vizag Taxi Hub',
          url: 'https://vizagtaxihub.com',
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://vizagtaxihub.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Bhogapuram Airport Taxi',
            item: AIRPORT_TAXI_PAGE_URL,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${AIRPORT_TAXI_PAGE_URL}#faq`,
        mainEntity: AIRPORT_FAQS.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer,
          },
        })),
      },
    ],
  };
}
