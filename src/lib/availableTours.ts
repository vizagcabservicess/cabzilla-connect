/** Tour slugs that exist in the booking API — keep in sync with `tourUrlUtils` mappings. */
export const AVAILABLE_TOUR_ROUTES = [
  {
    slug: 'araku-valley-tour',
    label: 'Araku Valley Tour',
    keywords: ['araku'],
  },
  {
    slug: 'lambasingi-tour',
    label: 'Lambasingi Tour',
    keywords: ['lambasingi'],
  },
  {
    slug: 'vanajangi-tour',
    label: 'Vanajangi Tour',
    keywords: ['vanajangi'],
  },
  {
    slug: 'vizag-north-city-tour',
    label: 'Vizag North City Tour',
    keywords: ['vizag city', 'north city', 'city tour'],
  },
  {
    slug: 'vizag-south-city-tour',
    label: 'Vizag South City Tour',
    keywords: ['south city', 'vizag south'],
  },
  {
    slug: 'arasavalli-srikurmam-tour',
    label: 'Arasavalli & Srikurmam Tour',
    keywords: ['arasavalli', 'srikurmam'],
  },
  {
    slug: 'araku-vizag-3d-2n',
    label: 'Araku-Vizag 3D/2N Tour',
    keywords: ['3d 2n', '3 days', '2 nights'],
  },
] as const;

export type AvailableTourSlug = (typeof AVAILABLE_TOUR_ROUTES)[number]['slug'];

export function isKnownTourSlug(slug: string): boolean {
  return AVAILABLE_TOUR_ROUTES.some((tour) => tour.slug === slug);
}

export function findTourRouteByKeywords(query: string): (typeof AVAILABLE_TOUR_ROUTES)[number] | null {
  const lower = query.toLowerCase();
  return (
    AVAILABLE_TOUR_ROUTES.find((tour) =>
      tour.keywords.some((keyword) => lower.includes(keyword)),
    ) ?? null
  );
}
