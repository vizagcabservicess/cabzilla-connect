
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getRouteBySlug } from '@/lib/routeData';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import NotFound from './NotFound';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car, ArrowRight } from 'lucide-react';
import { CabsPage } from './CabsPage';

const RoutePage = () => {
  const { fromSlug, toSlug } = useParams<{ fromSlug: string; toSlug: string }>();
  const route = getRouteBySlug(fromSlug, toSlug);

  if (!route) {
    return <NotFound />;
  }

  return (
    <>
      <Helmet>
        <title>{route.seo.title}</title>
        <meta name="description" content={route.seo.description} />
        <meta name="keywords" content={route.seo.keywords} />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8 pb-24">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <img src={route.image} alt={`Taxi to ${route.to}`} className="w-full h-64 object-cover rounded-t-lg" />
                <CardHeader>
                  <CardTitle className="text-3xl">{`Visakhapatnam to ${route.to} Taxi`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: route.content }} />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Indicative Fares</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Sedan (Dzire, etc.)</span>
                      <span className="font-bold text-lg text-blue-600">{route.fares.sedan}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">SUV (Ertiga, etc.)</span>
                      <span className="font-bold text-lg text-blue-600">{route.fares.suv}</span>
                    </div>
                    {route.fares.tempo && <div className="flex justify-between items-center">
                      <span className="font-medium">Tempo Traveller</span>
                      <span className="font-bold text-lg text-blue-600">{route.fares.tempo}</span>
                    </div>}
                     {route.fares.luxury && <div className="flex justify-between items-center">
                      <span className="font-medium">Luxury (Innova, etc.)</span>
                      <span className="font-bold text-lg text-blue-600">{route.fares.luxury}</span>
                    </div>}
                  </div>
                  <p className="text-xs text-gray-500 mt-4">*Fares are approximate. Actual price may vary based on demand and other factors.</p>
                  <Button asChild size="lg" className="w-full mt-6">
                    <Link to={`/cabs/outstation?from=${route.from}&to=${route.to}`}>
                      <Car className="mr-2 h-5 w-5" />
                      Book Your Cab Now
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
           <section className="mt-12">
             <CabsPage key={`${fromSlug}-${toSlug}`} />
           </section>
        </main>
        <MobileNavigation />
      </div>
    </>
  );
};

export default RoutePage;
