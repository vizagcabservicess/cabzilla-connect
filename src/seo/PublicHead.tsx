import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { resolvePublicHead } from '@/seo/publicPageMeta';

/**
 * Single public SEO head for every marketing route.
 * Mounted last in the root layout with prioritizeSeoTags so page Helmets cannot leave a second title/description/canonical.
 */
export function PublicHead() {
  const { pathname } = useLocation();
  const head = resolvePublicHead(pathname);
  if (!head) return null;

  return (
    <Helmet prioritizeSeoTags>
      <title>{head.title}</title>
      <meta name="description" content={head.description} />
      <link rel="canonical" href={head.canonical} />
      <meta property="og:title" content={head.ogTitle} />
      <meta property="og:description" content={head.ogDescription} />
      <meta property="og:url" content={head.ogUrl} />
      <meta property="og:image" content={head.ogImage} />
    </Helmet>
  );
}

/** Alias matching the brief's Seo component name. */
export const Seo = PublicHead;
