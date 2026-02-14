import { useParams } from 'react-router-dom';
import { Navbar } from "@/components/Navbar";
import { OutstationHeroWidget } from "@/components/OutstationHeroWidget";
import { Helmet } from 'react-helmet-async';

// Helper to convert slug to title case
function unslugify(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function OutstationTaxiPrefilledPage() {
  const { from, to } = useParams<{ from: string; to: string }>();

  const pickupLocation = from ? unslugify(from) : undefined;
  const dropLocation = to ? unslugify(to) : undefined;

  return (
    <>
      <Helmet>
        <title>{pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Outstation Taxi | Vizag Taxi Hub` : 'Outstation Taxi Service | Vizag Taxi Hub'}</title>
        <meta name="description" content={pickupLocation && dropLocation ? `Book outstation taxi from ${pickupLocation} to ${dropLocation}. Professional cab service with GPS tracking, verified drivers, and best rates.` : 'Book outstation taxi service from Visakhapatnam. Professional cab service with GPS tracking, verified drivers, and best rates.'} />
        <meta name="keywords" content="outstation taxi visakhapatnam, one way cab from vizag, vizag to hyderabad taxi, vizag to chennai cab, outstation cab booking visakhapatnam, vizag taxi service" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://vizagtaxihub.com/outstation-taxi/${from}/${to}`} />
        <meta property="og:title" content={pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Outstation Taxi | Vizag Taxi Hub` : 'Outstation Taxi Service | Vizag Taxi Hub'} />
        <meta property="og:description" content={pickupLocation && dropLocation ? `Book outstation taxi from ${pickupLocation} to ${dropLocation}. Professional cab service with GPS tracking, verified drivers, and best rates.` : 'Book outstation taxi service from Visakhapatnam. Professional cab service with GPS tracking, verified drivers, and best rates.'} />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://vizagtaxihub.com/outstation-taxi/${from}/${to}`} />
        <meta property="twitter:title" content={pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Outstation Taxi | Vizag Taxi Hub` : 'Outstation Taxi Service | Vizag Taxi Hub'} />
        <meta property="twitter:description" content={pickupLocation && dropLocation ? `Book outstation taxi from ${pickupLocation} to ${dropLocation}. Professional cab service with GPS tracking, verified drivers, and best rates.` : 'Book outstation taxi service from Visakhapatnam. Professional cab service with GPS tracking, verified drivers, and best rates.'} />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://vizagtaxihub.com/outstation-taxi/${from}/${to}`} />
      </Helmet>
      
      <div className="min-h-screen bg-white pt-24 md:pt-28 pb-12 md:pb-16">
        <Navbar />
        <section className="pt-4 md:pt-6 pb-6 md:pb-10">
          <OutstationHeroWidget 
            initialPickup={pickupLocation} 
            initialDrop={dropLocation} 
          />
        </section>
        {/* A footer could be added here if needed */}
      </div>
    </>
  );
} 