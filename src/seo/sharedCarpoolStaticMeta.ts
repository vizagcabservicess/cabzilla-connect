/**
 * SEO defaults for /shared-carpooling — used in Helmet + JSON-LD on the landing page.
 */
export const SHARED_CARPOOL_SEO = {
  title: 'Shared Carpooling in Visakhapatnam | Daily Office & College Rides | Vizag Taxi Hub',
  description:
    'Book shared carpool seats in Visakhapatnam for daily office and college commutes. Verified drivers, fixed per-seat fares, on-time pickup. NAD, MVP, IT SEZ & more — Vizag Taxi Hub.',
  keywords:
    'shared carpooling vizag, carpool visakhapatnam, office commute cab vizag, college carpool vizag, shared cab booking vizag, daily commute rides vizag, IT SEZ carpool, NAD junction carpool, vizag taxi hub carpool',
  canonicalUrl: 'https://vizagtaxihub.com/shared-carpooling',
  ogImageUrl: 'https://vizagtaxihub.com/og-image.png',
  pageHeadline: 'Smart Commute. Shared Rides. Stronger Community.',
  pageSubtitle: 'Daily shared cabs for employees & students in Visakhapatnam',
} as const;

const FAQ_ENTRIES = [
  {
    question: 'What is shared carpooling on Vizag Taxi Hub?',
    answer:
      'Shared carpooling lets employees and students book a seat in a verified cab on a fixed daily route — such as NAD Junction to IT SEZ Madhurawada — and split the fare with co-riders.',
  },
  {
    question: 'How do I book a shared carpool seat in Vizag?',
    answer:
      'Enter your pickup and drop locations, commute budget, and preferred time on the shared carpooling page, then search matching rides and confirm your seat online or via WhatsApp.',
  },
  {
    question: 'Are shared carpool drivers verified?',
    answer:
      'Yes. Vizag Taxi Hub shared rides use verified drivers and registered cabs with fixed, transparent per-seat pricing.',
  },
  {
    question: 'Which routes are available for shared carpooling in Visakhapatnam?',
    answer:
      'Popular routes include NAD Junction, MVP Colony, Gajuwaka, Maddilapalem, and IT SEZ Madhurawada. New routes are added based on commuter demand within the Vizag city area.',
  },
] as const;

export function buildSharedCarpoolStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SHARED_CARPOOL_SEO.canonicalUrl}#webpage`,
        url: SHARED_CARPOOL_SEO.canonicalUrl,
        name: SHARED_CARPOOL_SEO.title,
        description: SHARED_CARPOOL_SEO.description,
        isPartOf: {
          '@type': 'WebSite',
          name: 'Vizag Taxi Hub',
          url: 'https://vizagtaxihub.com',
        },
        about: {
          '@type': 'Service',
          name: 'Shared Carpooling Visakhapatnam',
          description: SHARED_CARPOOL_SEO.description,
          provider: {
            '@type': 'LocalBusiness',
            name: 'Vizag Taxi Hub',
            telephone: '+91-9966363662',
            url: 'https://vizagtaxihub.com',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Visakhapatnam',
              addressRegion: 'Andhra Pradesh',
              addressCountry: 'IN',
            },
          },
          areaServed: {
            '@type': 'City',
            name: 'Visakhapatnam',
          },
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
            name: 'Shared Carpooling',
            item: SHARED_CARPOOL_SEO.canonicalUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ENTRIES.map(({ question, answer }) => ({
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
