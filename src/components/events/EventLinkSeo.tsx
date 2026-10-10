import { Helmet } from 'react-helmet-async';

export const EVENT_OG_IMAGE = 'https://vizagtaxihub.com/uploads/og-image.png';

export function EventLinkSeo({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url?: string;
}) {
  const href = url || (typeof window !== 'undefined' ? window.location.href.split('?')[0] : 'https://vizagtaxihub.com');
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href={href} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Vizag Taxi Hub" />
      <meta property="og:url" content={href} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={EVENT_OG_IMAGE} />
      <meta property="og:image:secure_url" content={EVENT_OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Vizag Taxi Hub" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={EVENT_OG_IMAGE} />
    </Helmet>
  );
}
