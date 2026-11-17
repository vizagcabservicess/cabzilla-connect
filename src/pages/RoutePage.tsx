import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ChevronRight,
  Clock,
  Headphones,
  MapPin,
  MessageCircle,
  Phone,
  Route as RouteIcon,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { OutstationHeroWidget } from '@/components/OutstationHeroWidget';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { ScrollToTop } from '@/components/ScrollToTop';
import { getRouteBySlug } from '@/lib/routeData';
import { RelatedRoutes } from '@/components/RelatedRoutes';
import { ServiceLinks } from '@/components/ServiceLinks';
import { outstationDistanceCopy } from '@/seo/outstationDistance';
import { resolvePublicHead } from '@/seo/publicPageMeta';
import { trackContactCta } from '@/utils/trackContactCta';

export const RoutePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [routeInfo, setRouteInfo] = useState<{
    from: string;
    to: string;
    distance: string;
    duration: string;
    description?: string;
    content?: string;
    seo?: {
      title?: string;
      description?: string;
      keywords?: string;
      faq?: { question: string; answer: string }[];
      extraContent?: string;
    };
  } | null>(null);
  const [heroStep, setHeroStep] = useState(1);
  const [revealPageGrid, setRevealPageGrid] = useState(false);

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

  useEffect(() => {
    if (!slug) {
      navigate('/outstation-taxi');
      return;
    }

    const parts = slug.split('-to-');
    if (parts.length !== 2) {
      navigate('/404');
      return;
    }
    const fromSlug = parts[0];
    const toSlug = parts[1];

    const routeData = getRouteBySlug(fromSlug, toSlug);

    if (routeData) {
      setRouteInfo({
        from: routeData.from,
        to: routeData.to,
        distance: routeData.distance,
        duration: routeData.time,
        description: routeData.description,
        content: routeData.content,
        seo: routeData.seo,
      });
    } else {
      setRouteInfo({
        from: fromSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        to: toSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        distance: 'N/A',
        duration: 'N/A',
        description: 'No description available.',
        content: '',
        seo: {
          title: `${fromSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} to ${toSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Taxi | Book Outstation Cab`,
          description: `Book a reliable taxi from ${fromSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} to ${toSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}. Best rates guaranteed.`,
          keywords: '',
        },
      });
    }
  }, [slug, navigate]);

  useEffect(() => {
    setHeroStep(1);
    setRevealPageGrid(false);
  }, [slug]);

  const handleSearch = useCallback(() => {
    // Search progression is driven inside OutstationHeroWidget / Hero via onStepChange.
  }, []);

  if (!routeInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FB]">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  const slugParts = (slug ?? '').split('-to-');
  const distanceCopy =
    slugParts[0] === 'visakhapatnam' && slugParts[1]
      ? outstationDistanceCopy(slugParts[1])
      : null;
  const sharedHead = slug ? resolvePublicHead(`/outstation-taxi/${slug}`) : null;
  const pageImage = sharedHead?.ogImage || '/og-image.png';

  const isLanding = heroStep === 1;
  const hideBelow = heroStep >= 2 && !revealPageGrid;
  const routeHeadline =
    distanceCopy?.h1 || `${routeInfo.from} to ${routeInfo.to} Outstation Taxi`;
  const routeSubtitle =
    distanceCopy?.lead ||
    routeInfo.description ||
    `Comfortable one-way and round-trip cabs from ${routeInfo.from} to ${routeInfo.to} with verified highway drivers.`;
  const hasDistance = routeInfo.distance && routeInfo.distance !== 'N/A';
  const hasDuration = routeInfo.duration && routeInfo.duration !== 'N/A';

  const whatsappHref =
    'https://wa.me/919966363662?text=' +
    encodeURIComponent(
      `Hi! I would like to book an outstation cab from ${routeInfo.from} to ${routeInfo.to}.`,
    );

  const highlights = [
    {
      icon: Zap,
      title: 'Door-to-Door Pickup',
      description: `Pickup from your home, hotel or railway station in ${routeInfo.from}.`,
    },
    {
      icon: Shield,
      title: 'Verified Drivers',
      description: 'Experienced highway chauffeurs with GPS-tracked AC vehicles.',
    },
    {
      icon: CheckCircle,
      title: 'Transparent Billing',
      description: 'Clear per-km & trip pricing with zero surge surprises.',
    },
    {
      icon: Headphones,
      title: '24/7 Trip Support',
      description: 'Round-the-clock dispatch help before and during your ride.',
    },
  ];

  return (
    <>
      <Helmet>
        {/* Title, description, canonical and Open Graph: PublicHead */}
        <meta
          name="keywords"
          content={
            routeInfo.seo?.keywords ||
            `${routeInfo.from} to ${routeInfo.to} taxi, ${routeInfo.from} to ${routeInfo.to} cab, outstation taxi ${routeInfo.from} ${routeInfo.to}`
          }
        />
        <meta name="author" content="Vizag Taxi Hub" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:image" content={pageImage} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <ScrollToTop />

      <div className="min-h-screen bg-white lg:bg-[#F8F9FB]">
        <Navbar />

        <main id="main-content" className="overflow-x-clip bg-white max-lg:max-w-[100vw] lg:bg-[#F8F9FB]">
          <section
            className={
              isLanding
                ? 'vehicle-urbania-hero max-lg:mb-3 max-lg:px-2.5 max-lg:pt-2 sm:max-lg:mb-4 lg:relative lg:mb-0 lg:overflow-hidden lg:bg-gradient-to-b lg:from-[#F4F5F7] lg:via-[#F8F9FB] lg:to-[#F8F9FB] lg:pb-10 lg:pt-8'
                : 'vehicle-urbania-hero container mx-auto mb-3 max-w-7xl px-4 pt-2 sm:mb-4 lg:mb-8 lg:pt-8'
            }
            data-vth-service-embed-hero="outstation-route"
          >
            <div className={isLanding ? 'container relative mx-auto max-w-7xl max-lg:px-0 lg:px-4' : 'relative w-full'}>
              <div
                className={
                  isLanding
                    ? 'flex flex-col overflow-visible max-lg:rounded-2xl max-lg:border max-lg:border-gray-200/90 max-lg:bg-white max-lg:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.08)] lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none'
                    : 'flex flex-col overflow-visible max-lg:-mx-4 max-lg:rounded-t-none max-lg:rounded-b-2xl max-lg:border max-lg:border-gray-200/90 max-lg:border-t-0 max-lg:bg-white max-lg:shadow-[0_10px_28px_-20px_rgba(15,23,42,0.08)] lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none'
                }
              >
                <div
                  className={
                    isLanding
                      ? 'lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] lg:items-center lg:gap-8 xl:gap-12'
                      : 'w-full'
                  }
                >
                  {isLanding && (
                    <div className="min-w-0 max-lg:px-3 max-lg:pb-3 max-lg:pt-3 lg:mb-0">
                      <nav
                        aria-label="Breadcrumb"
                        className="mb-3 hidden items-center gap-1.5 text-xs font-medium text-slate-500 lg:flex"
                      >
                        <Link to="/" className="hover:text-[var(--brand-primary)]">
                          Home
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
                        <Link to="/outstation-taxi" className="hover:text-[var(--brand-primary)]">
                          Outstation Taxi
                        </Link>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />
                        <span className="text-slate-700">
                          {routeInfo.from} to {routeInfo.to}
                        </span>
                      </nav>

                      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/80 px-3 py-1 text-xs font-semibold tracking-wide text-[var(--brand-primary)] lg:bg-white/90 lg:px-3.5 lg:text-sm lg:shadow-sm">
                        <RouteIcon className="h-3.5 w-3.5" aria-hidden />
                        {routeInfo.from} → {routeInfo.to}
                      </span>

                      <h1 className="mt-2.5 text-left font-sans text-[1.5rem] font-bold leading-[1.12] tracking-tight text-[#0B1F3A] sm:text-[1.75rem] lg:mt-4 lg:text-[2rem] xl:text-[2.25rem]">
                        {routeHeadline}
                      </h1>

                      <p className="mt-1.5 max-w-xl text-left font-sans text-sm font-normal leading-relaxed text-slate-600 lg:mt-2.5 lg:text-base">
                        {routeSubtitle}
                      </p>

                      {(hasDistance || hasDuration) && (
                        <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
                          {hasDistance && (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              <MapPin className="h-3.5 w-3.5 text-[var(--brand-primary)]" aria-hidden />
                              {routeInfo.distance}
                            </span>
                          )}
                          {hasDuration && (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              <Clock className="h-3.5 w-3.5 text-[var(--brand-primary)]" aria-hidden />
                              {routeInfo.duration}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <Shield className="h-3.5 w-3.5 text-[var(--brand-primary)]" aria-hidden />
                            One-way &amp; Round-trip
                          </span>
                        </div>
                      )}

                      <div className="mt-7 hidden grid-cols-3 gap-4 lg:grid xl:gap-6">
                        <div className="min-w-0">
                          <div className="mb-1.5 text-[var(--brand-primary)]">
                            <MapPin className="h-5 w-5" aria-hidden />
                          </div>
                          <p className="text-sm font-bold leading-tight text-slate-900">
                            {hasDistance ? routeInfo.distance : 'Direct Highway'}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-500 xl:text-sm">
                            Road distance
                          </p>
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1.5 text-[var(--brand-primary)]">
                            <Clock className="h-5 w-5" aria-hidden />
                          </div>
                          <p className="text-sm font-bold leading-tight text-slate-900">
                            {hasDuration ? routeInfo.duration : 'Flexible Schedule'}
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-500 xl:text-sm">
                            Estimated drive time
                          </p>
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1.5 text-[var(--brand-primary)]">
                            <Shield className="h-5 w-5" aria-hidden />
                          </div>
                          <p className="text-sm font-bold leading-tight text-slate-900">
                            24/7 Verified Cabs
                          </p>
                          <p className="mt-0.5 text-xs leading-snug text-slate-500 xl:text-sm">
                            One-way &amp; round-trip
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    className={
                      isLanding
                        ? 'w-full min-w-0 justify-self-end max-lg:max-w-none lg:max-w-[26rem] xl:max-w-[28rem]'
                        : 'w-full min-w-0 max-w-none'
                    }
                  >
                    <div
                      id="route-booking"
                      className={
                        isLanding
                          ? 'vehicle-urbania-search-slot max-lg:border-t max-lg:border-gray-100 max-lg:bg-white max-lg:px-2.5 max-lg:pb-2.5 max-lg:pt-0 lg:rounded-2xl lg:border lg:border-slate-200/80 lg:bg-white lg:p-5 lg:shadow-[0_20px_50px_-24px_rgba(15,23,42,0.28)] xl:p-6'
                          : 'vehicle-urbania-search-slot max-lg:border-t max-lg:border-gray-100 max-lg:bg-white max-lg:px-2.5 max-lg:pb-2.5 max-lg:pt-0 lg:rounded-2xl lg:border lg:border-gray-200/90 lg:bg-white lg:p-4 lg:shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)] xl:p-5'
                      }
                    >
                      <OutstationHeroWidget
                        initialPickup={routeInfo.from}
                        initialDrop={routeInfo.to}
                        onSearch={handleSearch}
                        onStepChange={setHeroStep}
                        onTripEditOpenChange={setRevealPageGrid}
                        summaryBackHref={slug ? `/outstation-taxi/${slug}` : '/outstation-taxi'}
                        embedStretchToShell
                        embedDesktopCardLayout={isLanding}
                        embedDesktopCardTitle={`Book ${routeInfo.from} to ${routeInfo.to} Cab`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div
            className={`container mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-2 md:pb-24 lg:space-y-8 lg:pt-4 ${
              hideBelow ? 'hidden' : ''
            }`}
          >
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary-light)] text-[var(--brand-primary)] sm:h-11 sm:w-11">
                  <Headphones className="h-5 w-5" aria-hidden />
                </span>
                <p className="text-sm text-slate-700 sm:text-base">
                  <span className="font-semibold text-slate-900">
                    Need help with your {routeInfo.to} trip?
                  </span>{' '}
                  Our team is ready to assist you anytime.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white hover:bg-slate-50"
                  onClick={() => {
                    trackContactCta('whatsapp', { name: 'outstation_route_help_whatsapp' });
                    window.open(whatsappHref, '_blank');
                  }}
                >
                  <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" aria-hidden />
                  Chat on WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full border-slate-200 bg-white text-[var(--brand-primary)] hover:bg-slate-50"
                  onClick={() => {
                    trackContactCta('phone', { name: 'outstation_route_help_call' });
                    window.open('tel:+919966363662');
                  }}
                >
                  <Phone className="mr-2 h-4 w-4" aria-hidden />
                  Call +91 9966363662
                </Button>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)] lg:items-start">
              <div className="min-w-0 space-y-6">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    About Your Trip to {routeInfo.to}
                  </h2>
                  {routeInfo.content ? (
                    <div
                      className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 sm:text-base"
                      dangerouslySetInnerHTML={{ __html: routeInfo.content }}
                    />
                  ) : (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
                      Journey from {routeInfo.from} to {routeInfo.to}, a destination celebrated for
                      its scenic beauty and cultural heritage. This {routeInfo.distance} route takes
                      approximately {routeInfo.duration} by road. Book your comfortable cab ride with
                      professional drivers and enjoy a hassle-free travel experience.
                    </p>
                  )}

                  {routeInfo.seo?.extraContent && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
                      <Sparkles
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]"
                        aria-hidden
                      />
                      <div
                        className="min-w-0"
                        dangerouslySetInnerHTML={{ __html: routeInfo.seo.extraContent }}
                      />
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                    Why book {routeInfo.from} to {routeInfo.to} with us
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {highlights.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.title}
                          className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-light)] text-[var(--brand-primary)]">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-sm">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {routeInfo.seo?.faq && routeInfo.seo.faq.length > 0 && (
                  <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                      Frequently Asked Questions
                    </h2>
                    <div className="mt-4 divide-y divide-slate-100">
                      {routeInfo.seo.faq.map((item, idx) => (
                        <div key={idx} className="py-3.5 first:pt-0 last:pb-0">
                          <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                            {item.question}
                          </h3>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600">
                            {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <RelatedRoutes
                  currentRoute={{ from: routeInfo.from, to: routeInfo.to }}
                  limit={4}
                />
              </div>

              <aside className="space-y-6 lg:sticky lg:top-24">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-slate-900">
                    {routeInfo.from} → {routeInfo.to} Snapshot
                  </h2>
                  <dl className="mt-4 divide-y divide-slate-100 text-sm">
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">Road distance</dt>
                      <dd className="font-semibold text-slate-900">
                        {hasDistance ? routeInfo.distance : 'Highway route'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">Est. travel time</dt>
                      <dd className="font-semibold text-slate-900">
                        {hasDuration ? routeInfo.duration : 'Varies by traffic'}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between py-2.5">
                      <dt className="text-slate-500">Trip options</dt>
                      <dd className="font-semibold text-slate-900">One-Way &amp; Round-Trip</dd>
                    </div>
                  </dl>
                  <div className="mt-4 space-y-2.5">
                    <Button
                      className="w-full bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)]"
                      onClick={() => {
                        trackContactCta('phone', { name: 'outstation_route_sidebar_call' });
                        window.open('tel:+919966363662');
                      }}
                    >
                      <Phone className="mr-2 h-4 w-4" aria-hidden />
                      Call +91 9966363662
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-slate-200 text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        trackContactCta('whatsapp', { name: 'outstation_route_sidebar_whatsapp' });
                        window.open(whatsappHref, '_blank');
                      }}
                    >
                      <MessageCircle className="mr-2 h-4 w-4 text-emerald-600" aria-hidden />
                      WhatsApp Inquiry
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <ServiceLinks
                    currentService="/outstation-taxi"
                    title="Explore Other Services"
                    variant="sidebar"
                  />
                </div>
              </aside>
            </div>
          </div>
        </main>

        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default RoutePage;
