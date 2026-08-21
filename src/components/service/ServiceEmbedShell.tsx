import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BadgeCheck, Clock, Shield } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import {
  getServiceEmbedConfig,
  resolveServiceIllustrationLocalSrc,
  resolveServiceIllustrationSrc,
  type ServiceEmbedSlug,
  type ServiceEmbedTrustItem,
} from '@/seo/serviceEmbedMeta';
import { HomeOfferCampaignPopup } from '@/components/offers/HomeOfferCampaignPopup';
import type { OfferCampaignCategory } from '@/types/offerCampaign';

export interface ServiceEmbedShellProps {
  slug: ServiceEmbedSlug;
  /** Trip-locked Hero (or widget) rendered in the search slot. */
  hero: (handlers: {
    onStepChange: (step: number) => void;
    onTripEditOpenChange: (open: boolean) => void;
    summaryBackHref: string;
    embedStretchToShell: true;
    embedDesktopCardLayout?: boolean;
    embedDesktopCardTitle?: string;
  }) => React.ReactNode;
  /** Content below the booking widget (hidden on booking step ≥ 2 unless editing). */
  belowFold: React.ReactNode;
  /** Optional Helmet override; defaults to serviceEmbedMeta SEO. */
  helmetExtra?: React.ReactNode;
  /** Compact notice rendered immediately above the hero (e.g. airport move alert). */
  heroBanner?: React.ReactNode;
  /**
   * `embed` = Tempo/Urbania compact headline + illustration.
   * `marketing` = Local mockup hero on desktop; previous compact hero on mobile.
   */
  layout?: 'embed' | 'marketing';
}

function offerCategoriesForEmbed(slug: ServiceEmbedSlug): OfferCampaignCategory[] {
  switch (slug) {
    case 'airport':
      return ['airport'];
    case 'local':
      return ['local'];
    case 'outstation':
      return ['outstation_one_way', 'outstation_round_trip'];
    case 'araku':
      return ['tour'];
    default: {
      const _exhaustive: never = slug;
      return _exhaustive;
    }
  }
}

function TrustIcon({ icon }: { icon: ServiceEmbedTrustItem['icon'] }) {
  switch (icon) {
    case 'shield':
      return <Shield className="h-5 w-5" aria-hidden />;
    case 'clock':
      return <Clock className="h-5 w-5" aria-hidden />;
    case 'badgeCheck':
      return <BadgeCheck className="h-5 w-5" aria-hidden />;
    default: {
      const _exhaustive: never = icon;
      return _exhaustive;
    }
  }
}

function renderAccentHeadline(headline: string, accentWord?: string) {
  if (!accentWord || !headline.includes(accentWord)) {
    return headline;
  }
  const parts = headline.split(accentWord);
  return (
    <>
      {parts[0]}
      <span className="text-[var(--brand-primary)]">{accentWord}</span>
      {parts.slice(1).join(accentWord)}
    </>
  );
}

/**
 * Tempo/Urbania-style shell for airport / local / outstation / Araku landings.
 * Optional `marketing` layout matches the Local landing mockup hero on desktop only.
 */
export function ServiceEmbedShell({
  slug,
  hero,
  belowFold,
  helmetExtra,
  heroBanner,
  layout = 'embed',
}: ServiceEmbedShellProps) {
  const config = getServiceEmbedConfig(slug);
  const illustrationSrc = resolveServiceIllustrationSrc(config);
  const marketing = layout === 'marketing' ? config.marketingHero : undefined;
  const [heroStep, setHeroStep] = useState(1);
  const [revealPageGrid, setRevealPageGrid] = useState(false);

  useEffect(() => {
    setHeroStep(1);
    setRevealPageGrid(false);
  }, [slug]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;
    html.style.backgroundColor = '#ffffff';
    body.style.backgroundColor = '#ffffff';
    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
    };
  }, []);

  const hideBelow = heroStep >= 2 && !revealPageGrid;
  const offerCategories = useMemo(() => offerCategoriesForEmbed(slug), [slug]);
  /** Marketing split (copy + booking card) only on step 1; results use full-width embed. */
  const marketingLanding = Boolean(marketing) && heroStep === 1;

  const illustrationOnError = (
    e: React.SyntheticEvent<HTMLImageElement>,
    primarySrc: string,
  ) => {
    const el = e.currentTarget;
    if (el.dataset.fallbackApplied === '1') return;
    el.dataset.fallbackApplied = '1';
    const primaryWasRemote = primarySrc.includes('vizagtaxihub.com');
    el.src = primaryWasRemote
      ? resolveServiceIllustrationLocalSrc(config)
      : config.illustration.cdnUrl;
  };

  const illustrationAlt = config.illustration.alt ?? '';

  const searchSlot = (
    <div
      id={`${slug}-booking`}
      className={
        marketingLanding
          ? 'vehicle-urbania-search-slot max-lg:border-t max-lg:border-gray-100 max-lg:bg-white max-lg:px-2.5 max-lg:pb-2.5 max-lg:pt-0 lg:rounded-2xl lg:border lg:border-slate-200/80 lg:bg-white lg:p-5 lg:shadow-[0_20px_50px_-24px_rgba(15,23,42,0.28)] xl:p-6'
          : 'vehicle-urbania-search-slot max-lg:border-t max-lg:border-gray-100 max-lg:bg-white max-lg:px-2.5 max-lg:pb-2.5 max-lg:pt-0 lg:rounded-2xl lg:border lg:border-gray-200/90 lg:bg-white lg:p-4 lg:shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)] xl:p-5'
      }
    >
      {hero({
        onStepChange: setHeroStep,
        onTripEditOpenChange: setRevealPageGrid,
        summaryBackHref: config.summaryBackHref,
        embedStretchToShell: true,
        embedDesktopCardLayout: marketingLanding,
        embedDesktopCardTitle: marketingLanding
          ? marketing?.bookingCardTitle
          : undefined,
      })}
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{config.seo.title}</title>
        <meta name="description" content={config.seo.description} />
        <meta name="keywords" content={config.seo.keywords} />
        <link rel="canonical" href={config.seo.canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={config.seo.canonicalUrl} />
        <meta property="og:title" content={config.seo.title} />
        <meta property="og:description" content={config.seo.description} />
        <meta property="og:image" content={config.seo.ogImageUrl} />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={config.seo.canonicalUrl} />
        <meta property="twitter:title" content={config.seo.title} />
        <meta property="twitter:description" content={config.seo.description} />
        <meta property="twitter:image" content={config.seo.ogImageUrl} />
        <meta name="robots" content="index, follow" />
        {helmetExtra}
      </Helmet>

      <div className={`min-h-screen bg-white ${marketing ? 'lg:bg-[#F8F9FB]' : ''}`}>
        <Navbar />
        {heroStep === 1 && (
          <HomeOfferCampaignPopup enabled categories={offerCategories} />
        )}
        {heroBanner}
        <main
          id="main-content"
          className={`overflow-x-clip bg-white max-lg:max-w-[100vw] ${
            marketing ? 'lg:bg-[#F8F9FB]' : ''
          }`}
        >
          {marketing ? (
            <>
              <section
                className={
                  marketingLanding
                    ? 'vehicle-urbania-hero max-lg:mb-3 max-lg:px-2.5 max-lg:pt-2 sm:max-lg:mb-4 lg:relative lg:mb-0 lg:overflow-hidden lg:bg-gradient-to-b lg:from-[#F4F5F7] lg:via-[#F8F9FB] lg:to-[#F8F9FB] lg:pb-10 lg:pt-10'
                    : 'vehicle-urbania-hero container mx-auto mb-3 max-w-7xl px-4 pt-2 sm:mb-4 lg:mb-8 lg:pt-8'
                }
                data-vth-service-embed-hero={slug}
                data-vth-hero-layout={
                  marketingLanding ? 'marketing-desktop-embed-mobile' : 'marketing-results'
                }
              >
                <div
                  className={
                    marketingLanding
                      ? 'container relative mx-auto max-w-7xl max-lg:px-0 lg:px-4'
                      : 'relative w-full'
                  }
                >
                  <div
                    className={
                      marketingLanding
                        ? 'flex flex-col overflow-visible max-lg:rounded-t-none max-lg:rounded-b-2xl max-lg:border max-lg:border-gray-200/90 max-lg:border-t-0 max-lg:bg-white max-lg:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.08)] lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none'
                        : 'flex flex-col overflow-visible max-lg:-mx-4 max-lg:rounded-t-none max-lg:rounded-b-2xl max-lg:border max-lg:border-gray-200/90 max-lg:border-t-0 max-lg:bg-white max-lg:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.08)] lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none'
                    }
                  >
                    {/* Mobile: previous compact hero banner — landing only */}
                    {marketingLanding && (
                      <div className="relative isolate bg-white lg:hidden">
                        <div className="flex flex-col gap-0">
                          {slug === 'airport' ? (
                            <h1 className="sr-only">{config.seo.pageHeadline}</h1>
                          ) : (
                            <div className="relative z-[3] shrink-0 bg-white px-2.5 pb-0 pt-2 sm:px-3 sm:pt-2">
                              <div className="max-w-xl">
                                <h1 className="text-left font-sans text-[1.75rem] font-bold leading-[1.08] tracking-tight text-[#001b3a] sm:text-[2.125rem]">
                                  {config.seo.pageHeadline}
                                </h1>
                                <p className="mt-0.5 max-w-xl text-left font-sans text-sm font-normal leading-snug text-gray-700 sm:text-[0.9375rem]">
                                  {config.seo.pageSubtitle}
                                </p>
                              </div>
                            </div>
                          )}

                          <div
                            className="relative z-0 flex w-full min-h-[min(13rem,44vw)] items-center justify-center bg-white px-2.5 pb-2 pt-2 sm:min-h-[min(15rem,40vw)] sm:px-3"
                            aria-hidden={!illustrationAlt}
                          >
                            <img
                              src={illustrationSrc}
                              alt={illustrationAlt}
                              width={680}
                              height={560}
                              sizes="(max-width: 640px) 100vw, min(680px, 100vw)"
                              decoding="async"
                              loading="eager"
                              fetchPriority="high"
                              className="relative z-[1] mx-auto block h-auto w-full max-h-[min(13rem,44vw)] object-contain object-center sm:max-h-[min(15rem,40vw)]"
                              onError={(e) => illustrationOnError(e, illustrationSrc)}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Landing: copy left + booking card right. Results: full-width widget. */}
                    <div
                      className={
                        marketingLanding
                          ? 'lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:items-center lg:gap-8 xl:gap-12'
                          : 'w-full'
                      }
                    >
                      {marketingLanding && (
                        <div className="mb-8 hidden min-w-0 lg:block lg:mb-0">
                          <span className="inline-flex items-center rounded-full border border-blue-200/80 bg-white/90 px-3.5 py-1 text-sm font-semibold tracking-wide text-[var(--brand-primary)] shadow-sm">
                            {marketing.badge}
                          </span>
                          <h1 className="mt-4 text-left font-sans text-[1.875rem] font-bold leading-[1.12] tracking-tight text-[#0B1F3A] xl:text-[2.25rem]">
                            {renderAccentHeadline(config.seo.pageHeadline, marketing.accentWord)}
                          </h1>
                          <p className="mt-2.5 max-w-md text-left font-sans text-sm font-normal leading-relaxed text-slate-600 xl:text-base">
                            {config.seo.pageSubtitle}
                          </p>

                          <div className="mt-7 grid grid-cols-3 gap-3 xl:gap-5">
                            {marketing.trustItems.map((item) => (
                              <div key={item.title} className="min-w-0">
                                <div className="mb-2 text-[var(--brand-primary)]">
                                  <TrustIcon icon={item.icon} />
                                </div>
                                <p className="text-sm font-bold leading-tight text-slate-900">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-xs leading-snug text-slate-500 xl:text-sm">
                                  {item.subtitle}
                                </p>
                              </div>
                            ))}
                          </div>
                          {marketing.heroNote ? (
                            <p className="mt-5 inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-slate-700">
                              {marketing.heroNote}
                            </p>
                          ) : null}
                        </div>
                      )}

                      <div
                        className={
                          marketingLanding
                            ? 'min-w-0 w-full max-lg:max-w-none lg:max-w-[26rem] justify-self-end xl:max-w-[28rem]'
                            : 'min-w-0 w-full max-w-none'
                        }
                      >
                        {searchSlot}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div
                className={`container mx-auto max-w-7xl px-4 pb-16 pt-4 md:pb-32 lg:pt-8 ${
                  hideBelow ? 'hidden' : ''
                }`}
              >
                {belowFold}
              </div>
            </>
          ) : (
            <div className="container mx-auto max-w-7xl px-4 pb-16 pt-2 md:pb-32 lg:pt-24">
              <section
                className="vehicle-urbania-hero mb-3 sm:mb-4 lg:mb-8 max-lg:-mx-4 lg:mx-0"
                data-vth-service-embed-hero={slug}
              >
                <div className="flex flex-col overflow-visible max-lg:rounded-t-none max-lg:rounded-b-2xl max-lg:border max-lg:border-gray-200/90 max-lg:border-t-0 max-lg:bg-white max-lg:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.08)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
                  <div className="relative isolate bg-white lg:hidden">
                    <div className="flex flex-col gap-0">
                      <div className="relative z-[3] shrink-0 bg-white px-2.5 pb-0 pt-2 sm:px-3 sm:pt-2">
                        <div className="max-w-xl">
                          <h1 className="text-left font-sans text-[1.75rem] font-bold leading-[1.08] tracking-tight text-[#001b3a] sm:text-[2.125rem]">
                            {config.seo.pageHeadline}
                          </h1>
                          <p className="mt-0.5 max-w-xl text-left font-sans text-sm font-normal leading-snug text-gray-700 sm:text-[0.9375rem]">
                            {config.seo.pageSubtitle}
                          </p>
                        </div>
                      </div>

                      <div
                        className="relative z-0 flex w-full min-h-[min(13rem,44vw)] items-center justify-center bg-white px-2.5 pb-2 pt-2 sm:min-h-[min(15rem,40vw)] sm:px-3"
                        aria-hidden={!illustrationAlt}
                      >
                        <img
                          src={illustrationSrc}
                          alt={illustrationAlt}
                          width={680}
                          height={560}
                          sizes="(max-width: 640px) 100vw, min(680px, 100vw)"
                          decoding="async"
                          loading="eager"
                          fetchPriority="high"
                          className="relative z-[1] mx-auto block h-auto w-full max-h-[min(13rem,44vw)] object-contain object-center sm:max-h-[min(15rem,40vw)]"
                          onError={(e) => illustrationOnError(e, illustrationSrc)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 hidden lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:gap-8">
                    <div className="min-w-0">
                      <h1 className="text-left font-sans text-4xl font-bold leading-[1.08] tracking-tight text-[#001b3a] xl:text-5xl">
                        {config.seo.pageHeadline}
                      </h1>
                      <p className="mt-2 max-w-xl text-left font-sans text-base font-normal leading-snug text-gray-700 xl:text-lg">
                        {config.seo.pageSubtitle}
                      </p>
                    </div>
                    <div className="flex min-h-[12rem] items-center justify-center" aria-hidden={!illustrationAlt}>
                      <img
                        src={illustrationSrc}
                        alt={illustrationAlt}
                        width={560}
                        height={420}
                        sizes="(min-width: 1024px) 28vw, 40vw"
                        decoding="async"
                        loading="eager"
                        className="mx-auto block h-auto w-full max-h-[14rem] object-contain object-center xl:max-h-[16rem]"
                        onError={(e) => illustrationOnError(e, illustrationSrc)}
                      />
                    </div>
                  </div>

                  {searchSlot}
                </div>
              </section>

              <div
                className={`grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6 ${
                  hideBelow ? 'hidden' : ''
                }`}
              >
                {belowFold}
              </div>
            </div>
          )}
        </main>
        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
}

export default ServiceEmbedShell;
