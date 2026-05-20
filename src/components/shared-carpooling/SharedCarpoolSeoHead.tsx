import { Helmet } from 'react-helmet-async';
import {
  buildSharedCarpoolStructuredData,
  SHARED_CARPOOL_SEO,
} from '@/seo/sharedCarpoolStaticMeta';

export function SharedCarpoolSeoHead() {
  const structuredData = buildSharedCarpoolStructuredData();

  return (
    <Helmet>
      <title>{SHARED_CARPOOL_SEO.title}</title>
      <meta name="description" content={SHARED_CARPOOL_SEO.description} />
      <meta name="keywords" content={SHARED_CARPOOL_SEO.keywords} />
      <meta name="author" content="Vizag Taxi Hub" />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href={SHARED_CARPOOL_SEO.canonicalUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={SHARED_CARPOOL_SEO.canonicalUrl} />
      <meta property="og:title" content={SHARED_CARPOOL_SEO.title} />
      <meta property="og:description" content={SHARED_CARPOOL_SEO.description} />
      <meta property="og:image" content={SHARED_CARPOOL_SEO.ogImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Vizag Taxi Hub" />
      <meta property="og:locale" content="en_IN" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={SHARED_CARPOOL_SEO.canonicalUrl} />
      <meta name="twitter:title" content={SHARED_CARPOOL_SEO.title} />
      <meta name="twitter:description" content={SHARED_CARPOOL_SEO.description} />
      <meta name="twitter:image" content={SHARED_CARPOOL_SEO.ogImageUrl} />

      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  );
}
