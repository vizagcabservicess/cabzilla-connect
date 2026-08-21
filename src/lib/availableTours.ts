/** Tour slugs that exist in the booking API — keep in sync with `tourUrlUtils` mappings. */
export const AVAILABLE_TOUR_ROUTES = [
  {
    slug: 'araku-valley-tour',
    label: 'Araku Valley Tour',
    /** Same destinations the homepage search widget routes to Araku Valley Tour. */
    keywords: [
      'araku',
      'borra',
      'padmapuram',
      'katiki',
      'galikonda',
      'chaparai',
      'ananthagiri',
      'anantagiri',
    ],
  },
  {
    slug: 'lambasingi-tour',
    label: 'Lambasingi Tour',
    keywords: ['lambasingi', 'kothapalli'],
  },
  {
    slug: 'vanajangi-tour',
    label: 'Vanajangi Tour',
    keywords: ['vanajangi', 'paderu'],
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

export type TourPackageMatchable = {
  tourId: string;
  tourName: string;
};

export function isKnownTourSlug(slug: string): boolean {
  return AVAILABLE_TOUR_ROUTES.some((tour) => tour.slug === slug);
}

export function findTourRouteByKeywords(query: string): (typeof AVAILABLE_TOUR_ROUTES)[number] | null {
  const lower = query.toLowerCase().trim();
  if (!lower) return null;
  // Prefer longer keyword hits so "araku valley" still wins over shorter noise.
  let best: (typeof AVAILABLE_TOUR_ROUTES)[number] | null = null;
  let bestLen = 0;
  for (const tour of AVAILABLE_TOUR_ROUTES) {
    for (const keyword of tour.keywords) {
      if (keywordHitsInText(lower, keyword) && keyword.length > bestLen) {
        best = tour;
        bestLen = keyword.length;
      }
    }
  }
  return best;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordHitsInText(text: string, keyword: string): boolean {
  const blob = (text || '').toLowerCase();
  const k = keyword.toLowerCase().trim();
  if (!blob || !k) return false;
  // Short tokens like "araku" / "borra" must be whole words so "Pusapatirega" ≠ Araku.
  if (k.length <= 6) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(k)}(?:[^a-z0-9]|$)`, 'i').test(blob);
  }
  return blob.includes(k);
}

/** Araku hill-station places only — not generic fragments like "rega" in Pusapatirega. */
const ARAKU_PLACE_KEYWORDS = [
  'araku valley',
  'araku',
  'borra caves',
  'borra guhalu',
  'borra cave',
  'padmapuram gardens',
  'padmapuram garden',
  'padmapuram',
  'katiki waterfalls',
  'katiki falls',
  'galikonda',
  'chaparai',
  'ananthagiri',
  'anantagiri',
  'damuku',
  'anjadevudu',
] as const;

export function locationLooksLikeArakuTour(text: string): boolean {
  const blob = (text || '').toLowerCase().trim();
  if (!blob) return false;
  return ARAKU_PLACE_KEYWORDS.some((keyword) => keywordHitsInText(blob, keyword));
}

/**
 * Map a free-text place name (e.g. outstation "To") to a live tour package.
 * Mirrors homepage search: Araku / Lambasingi / Vanajangi → tour package, not outstation.
 */
export function matchTourPackageFromLocationText<T extends TourPackageMatchable>(
  text: string,
  tours: T[]
): T | null {
  const lower = text.toLowerCase().trim();
  if (!lower || tours.length === 0) return null;

  const nameHits = tours
    .map((tour) => {
      const name = tour.tourName.toLowerCase().trim();
      const bare = name.replace(/\s+tour\s*$/i, '').trim();
      let score = 0;
      if (lower === name || lower === bare) score = 1000 + bare.length;
      else if (lower.includes(bare) || bare.includes(lower)) score = bare.length;
      return { tour, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  if (nameHits[0]) return nameHits[0].tour;

  const route = findTourRouteByKeywords(lower);
  if (!route) return null;

  const slug = route.slug.toLowerCase();
  const slugAlt = slug.replace(/-/g, '_');
  const primaryKeyword = route.keywords[0]?.toLowerCase() || '';

  return (
    tours.find((tour) => {
      const id = tour.tourId.toLowerCase().replace(/_/g, '-');
      const idRaw = tour.tourId.toLowerCase();
      const name = tour.tourName.toLowerCase();
      return (
        id === slug ||
        idRaw === slugAlt ||
        id.includes(slug.replace(/-tour$/, '')) ||
        (primaryKeyword.length > 0 && name.includes(primaryKeyword))
      );
    }) ?? null
  );
}
