
import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getRouteBySlug } from '@/lib/routeData';
import { Navbar } from '@/components/Navbar';
import { MobileNavigation } from '@/components/MobileNavigation';
import NotFound from './NotFound';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Car } from 'lucide-react';
import { CabBookingInterface } from '@/components/CabBookingInterface';

const RoutePage = () => {
  const { fromSlug, toSlug } = useParams<{ fromSlug: string; toSlug: string }>();
  const route = getRouteBySlug(fromSlug, toSlug);
  const bookingSectionRef = useRef<HTMLDivElement>(null);

  if (!route) {
    return <NotFound />;
  }

  const handleBookNowClick = () => {
    bookingSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Helmet>
        <title>{route.seo.title}</title>
        <meta name="description" content={route.seo.description} />
        <meta name="keywords" content={route.seo.keywords} />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <section className="relative bg-gray-800 text-white">
          <img
            src={route.image.replace('h=300', 'h=400').replace('w=500', 'w=1200')}
            alt={`Taxi from ${route.from} to ${route.to}`}
            className="absolute inset-0 w-full h-full object-cover z-0 opacity-40"
          />
          <div className="relative container mx-auto px-4 py-24 text-center z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {`Visakhapatnam to ${route.to} Taxi`}
            </h1>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">
              {route.description}
            </p>
          </div>
        </section>

        <main className="container mx-auto px-4 py-12 pb-24">
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-3xl">{`About Your Trip to ${route.to}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: route.content }} />
                </CardContent>
              </Card>
            </div>
            <div className="lg:col-span-1">
              <Card className="sticky top-8 text-center p-6">
                <CardHeader className="p-0">
                  <CardTitle>Ready to Go?</CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-4">
                  <p className="text-gray-600 mb-6">
                    Book your taxi from {route.from} to {route.to} now and enjoy a hassle-free journey.
                  </p>
                  <Button size="lg" className="w-full" onClick={handleBookNowClick}>
                      <Car className="mr-2 h-5 w-5" />
                      Book Your Cab
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
           <section className="mt-12" ref={bookingSectionRef}>
             <Card className="bg-white p-4 sm:p-6 lg:p-8">
               <h2 className="text-3xl font-bold text-center mb-8">Select Your Cab & Book</h2>
               <CabBookingInterface
                  key={`${fromSlug}-${toSlug}`}
                  initialTripDetails={{ from: route.from, to: route.to, tripType: 'outstation' }}
               />
             </Card>
           </section>
        </main>
        <MobileNavigation />
      </div>
    </>
  );
};

export default RoutePage;
