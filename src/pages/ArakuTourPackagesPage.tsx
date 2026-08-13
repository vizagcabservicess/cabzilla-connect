import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, CheckCircle, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TourHeroWidget } from '@/components/TourHeroWidget';
import { ServiceLinks } from '@/components/ServiceLinks';
import { ServiceEmbedShell } from '@/components/service/ServiceEmbedShell';
import { tourAPI } from '@/services/api/tourAPI';
import { TourInfo } from '@/types/cab';
import { getTourUrl } from '@/utils/tourUrlUtils';

const ArakuTourPackagesPage = () => {
  const [tours, setTours] = useState<TourInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await tourAPI.getAvailableTours();
        if (cancelled) return;
        const arakuRelated = (data || []).filter((t) => {
          const name = (t.name || '').toLowerCase();
          return (
            name.includes('araku') ||
            name.includes('borra') ||
            name.includes('lambasingi') ||
            name.includes('vanajangi')
          );
        });
        setTours(arakuRelated.length > 0 ? arakuRelated : (data || []).slice(0, 8));
      } catch {
        if (!cancelled) setTours([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getTourPrice = (tour: TourInfo): string => {
    if (tour.pricing) {
      const tempo =
        tour.pricing['tempo_traveller'] ||
        tour.pricing['tempo-traveller'] ||
        Object.values(tour.pricing)[0];
      if (tempo) return `₹${Number(tempo).toLocaleString('en-IN')}`;
    }
    if (tour.distance) return `₹${(tour.distance * 35).toLocaleString('en-IN')}`;
    return 'On request';
  };

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: 'Araku Valley Tour Packages from Vizag',
    description:
      'Book Araku Valley tour packages from Vizag — one-day trips, cab booking, and sightseeing with professional drivers.',
    url: 'https://vizagtaxihub.com/araku-tour-packages-vizag',
    touristType: 'Sightseeing',
    provider: {
      '@type': 'LocalBusiness',
      name: 'Vizag Taxi Hub',
      telephone: '+91-9966363662',
    },
  };

  return (
    <ServiceEmbedShell
      slug="araku"
      helmetExtra={<script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
      hero={({ onStepChange, onTripEditOpenChange, summaryBackHref, embedStretchToShell }) => (
        <TourHeroWidget
          onStepChange={onStepChange}
          onTripEditOpenChange={onTripEditOpenChange}
          summaryBackHref={summaryBackHref}
          embedStretchToShell={embedStretchToShell}
        />
      )}
      belowFold={
        <>
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Araku Valley Tour from Vizag</h2>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-4">
                Plan your Araku Valley tour package from Vizag — one-day trips, cab booking, and sightseeing
                with comfortable vehicles and professional drivers. Ideal for families and groups heading to
                Borra Caves, coffee plantations, and tribal museums.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {[
                  'One-day Araku trips',
                  'Cab & tempo options',
                  'Sightseeing packages',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    <span className="font-medium text-gray-800">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Tour Packages</h2>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-gray-600">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading tours…
                </div>
              ) : tours.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">
                  No tour packages available right now. Call us to book an Araku trip.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tours.map((tour) => (
                    <Link
                      key={tour.id}
                      to={getTourUrl(tour)}
                      className="group overflow-hidden rounded-xl border border-gray-100 bg-gray-50 hover:border-green-200 transition-colors"
                    >
                      <div className="relative h-36 bg-gray-200">
                        <img
                          src={tour.image || `/tours/${tour.id}.jpg`}
                          alt={tour.name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop';
                          }}
                        />
                        <Badge className="absolute top-2 left-2 bg-green-600 text-white">Araku</Badge>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 group-hover:text-green-700 line-clamp-2">
                          {tour.name}
                        </h3>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {tour.distance ? `${tour.distance} km` : 'Vizag'}
                            {tour.days ? ` · ${tour.days}D` : ''}
                          </span>
                          <span className="font-bold text-green-700">{getTourPrice(tour)}*</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/tours/araku-valley-tour"
                  className="text-sm font-medium text-green-700 hover:underline"
                >
                  Araku Valley Tour details
                </Link>
                <Link
                  to="/outstation-taxi/visakhapatnam-to-araku-valley"
                  className="text-sm font-medium text-green-700 hover:underline"
                >
                  Vizag to Araku cab fare
                </Link>
                <Link
                  to="/vehicle/tempo-traveller"
                  className="text-sm font-medium text-green-700 hover:underline"
                >
                  Tempo traveller for Araku
                </Link>
              </div>
            </section>
          </div>

          <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900 mb-2">Book Araku Tour</h2>
              <p className="text-sm text-gray-600 mb-4">
                One-day trips · Packages · Cab & tempo from Vizag
              </p>
              <ul className="space-y-2 mb-4 text-sm text-gray-700">
                {['Sightseeing support', 'AC vehicles', 'Professional driver'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => window.open('tel:+919966363662')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Call +91 9966363662
              </Button>
            </div>
            <div className="rounded-xl border border-gray-100 bg-white p-4">
              <ServiceLinks
                currentService="/araku-tour-packages-vizag"
                title="Other Services"
                variant="sidebar"
              />
            </div>
          </aside>
        </>
      }
    />
  );
};

export default ArakuTourPackagesPage;
