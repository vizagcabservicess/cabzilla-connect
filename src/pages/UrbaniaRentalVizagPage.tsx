import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { MobileNavigation } from '@/components/MobileNavigation';
import { Button } from '@/components/ui/button';
import { ResponsiveGrid, ServiceCard } from '@/components/MobileSlider';
import { Car, Users, Phone, Star, CheckCircle } from 'lucide-react';

const PAGE_URL = 'https://vizagtaxihub.com/urbania-rental-vizag';
const BOOK_PATH = '/vehicle/urbania';

const UrbaniaRentalVizagPage = () => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'Vizag Taxi Hub - Urbania Van Rental',
    description:
      'Premium Urbania van rental in Visakhapatnam for weddings, corporate groups, pilgrimages, and outstation travel. AC Urbania with experienced driver, Vizag and Andhra Pradesh service.',
    url: PAGE_URL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '44-66-22/4, near Singalamma Temple, Singalammapuram, Kailasapuram',
      addressLocality: 'Visakhapatnam',
      addressRegion: 'Andhra Pradesh',
      postalCode: '530024',
      addressCountry: 'IN',
    },
    telephone: '+91-9966363662',
    openingHours: 'Mo-Su 00:00-23:59',
    paymentAccepted: 'Cash, Credit Card, UPI, Net Banking',
    areaServed: [
      { '@type': 'City', name: 'Visakhapatnam' },
      { '@type': 'State', name: 'Andhra Pradesh' },
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Urbania & group transport',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Urbania rental with driver',
            description: 'Premium Urbania van for local, airport, and outstation trips from Vizag',
          },
        },
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: 'Corporate & wedding Urbania',
            description: 'Dedicated Urbania hire for events and business travel',
          },
        },
      ],
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do you provide Urbania van rental in Visakhapatnam?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Vizag Taxi Hub offers Urbania van hire with a professional driver for local rides, airport transfers, weddings, corporate groups, and outstation travel across Andhra Pradesh.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is included with Urbania booking?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Bookings typically include the Urbania vehicle, fuel, driver allowance, and AC comfort. Exact inclusions follow the trip type (local package vs per-km outstation). Confirm details when you book online or call +91 9966363662.',
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Urbania Van Rental in Vizag | Premium AC Mini Bus Hire | Vizag Taxi Hub</title>
        <meta
          name="description"
          content="Book Urbania rental in Visakhapatnam for weddings, corporate travel, and outstation trips. Premium AC Urbania with driver — local, airport & AP routes. Call +91 9966363662."
        />
        <meta
          name="keywords"
          content="urbania rental vizag, urbania hire visakhapatnam, force urbania vizag, mercedes urbania booking vizag, luxury mini bus urbania vizag, corporate urbania vizag, wedding urbania vizag, pilgrimage urbania vizag, group travel urbania ap, AC urbania outstation vizag, urbania tempo alternative vizag, premium van hire vizag, vizag taxi hub urbania"
        />
        <link rel="canonical" href={PAGE_URL} />
        <meta name="author" content="Vizag Taxi Hub" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={PAGE_URL} />
        <meta
          property="og:title"
          content="Urbania Van Rental in Vizag | Premium AC Group Travel"
        />
        <meta
          property="og:description"
          content="Urbania hire in Visakhapatnam — weddings, corporate groups, outstation tours. Book with Vizag Taxi Hub."
        />
        <meta property="og:image" content="https://vizagtaxihub.com/uploads/og-image-urbania.jpg" />
        <meta property="og:site_name" content="Vizag Taxi Hub" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={PAGE_URL} />
        <meta
          property="twitter:title"
          content="Urbania Van Rental in Vizag | Vizag Taxi Hub"
        />
        <meta
          property="twitter:description"
          content="Premium Urbania van rental with driver in Visakhapatnam — group travel made easy."
        />
        <meta property="twitter:image" content="https://vizagtaxihub.com/uploads/og-image-urbania.jpg" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="container mx-auto max-w-7xl px-4 pb-16 pt-4 md:pb-32">
          <div className="mb-8 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white">
            <h1 className="mb-4 text-2xl font-bold md:text-3xl">Urbania Van Rental in Vizag</h1>
            <p className="mb-6 text-lg md:text-xl">
              Premium Urbania (premium mini-bus style van) hire in Visakhapatnam — ideal for large
              families, weddings, corporate shuttles, and comfortable outstation journeys across
              Andhra Pradesh.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-gray-100"
                onClick={() => {
                  window.location.href = 'tel:+919966363662';
                }}
              >
                <Phone className="mr-2 h-5 w-5" />
                Call +91 9966363662
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => window.open(`https://vizagtaxihub.com${BOOK_PATH}`, '_blank')}
              >
                <Car className="mr-2 h-5 w-5" />
                View Urbania & book
              </Button>
            </div>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <Users className="mb-4 h-8 w-8 text-slate-700" />
              <h2 className="mb-2 text-lg font-semibold">Group & event travel</h2>
              <p className="text-gray-600">
                Spacious seating and luggage room for weddings, corporate teams, and family
                outings from Vizag.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <Star className="mb-4 h-8 w-8 text-amber-500" />
              <h2 className="mb-2 text-lg font-semibold">AC comfort</h2>
              <p className="text-gray-600">
                Air-conditioned Urbania for comfortable long-distance and city travel in coastal AP
                heat.
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <CheckCircle className="mb-4 h-8 w-8 text-green-600" />
              <h2 className="mb-2 text-lg font-semibold">Experienced drivers</h2>
              <p className="text-gray-600">
                Licensed drivers familiar with Vizag, airport routes, and major outstation highways.
              </p>
            </div>
          </div>

          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-bold text-gray-900">Why book Urbania with us?</h2>
            <ul className="list-inside list-disc space-y-2 text-gray-700">
              <li>
                One booking for premium group capacity — ideal when you need more space and comfort
                than a standard MPV.
              </li>
              <li>
                Local packages, airport transfers, and outstation per-km options aligned with our
                fleet pricing.
              </li>
              <li>
                Next step: open the{' '}
                <Link to={BOOK_PATH} className="font-medium text-blue-600 hover:underline">
                  Urbania vehicle page
                </Link>{' '}
                for photos, rates, and booking.
              </li>
            </ul>
          </div>

          <div className="rounded-xl bg-white p-6 pb-8 shadow-sm md:pb-6">
            <h2 className="mb-6 text-2xl font-bold text-gray-900">Related group transport</h2>
            <ResponsiveGrid gridCols="grid-cols-1 md:grid-cols-2 lg:grid-cols-4" className="gap-4">
              <ServiceCard
                service={{
                  icon: Car,
                  title: 'Urbania — full details',
                  description: 'Specifications, gallery, and book Urbania online.',
                  features: ['Fleet pricing', 'Driver included', 'Vizag & AP'],
                  bgColor: 'bg-gradient-to-br from-slate-50 to-slate-100',
                  iconColor: 'text-slate-800',
                  link: BOOK_PATH,
                }}
              />
              <ServiceCard
                service={{
                  icon: Users,
                  title: 'Tempo Traveller rental',
                  description: '17-seater AC tempo traveller for large groups.',
                  features: ['Group travel', 'Outstation', 'Airport'],
                  bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100',
                  iconColor: 'text-blue-600',
                  link: '/tempo-traveller-rental-vizag',
                }}
              />
              <ServiceCard
                service={{
                  icon: Users,
                  title: '17 Seater Tempo',
                  description: 'Popular choice for tours and events.',
                  features: ['High capacity', 'AC', 'Driver'],
                  bgColor: 'bg-gradient-to-br from-green-50 to-green-100',
                  iconColor: 'text-green-600',
                  link: '/17-seater-tempo-traveller-vizag',
                }}
              />
              <ServiceCard
                service={{
                  icon: Users,
                  title: 'Corporate transport',
                  description: 'Business and delegate movement.',
                  features: ['Professional service', 'Billing support'],
                  bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100',
                  iconColor: 'text-indigo-600',
                  link: '/corporate-tempo-traveller-vizag',
                }}
              />
            </ResponsiveGrid>
          </div>
        </div>

        <Footer />
        <MobileNavigation />
      </div>
    </>
  );
};

export default UrbaniaRentalVizagPage;
