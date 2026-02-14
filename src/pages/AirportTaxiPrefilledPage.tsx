import { useParams } from 'react-router-dom';
import { Navbar } from "@/components/Navbar";
import { AirportHeroWidget } from "@/components/AirportHeroWidget";
import { Helmet } from 'react-helmet-async';

// Helper to convert slug to title case
function unslugify(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function AirportTaxiPrefilledPage() {
  const { from, to } = useParams<{ from: string; to: string }>();

  const pickupLocation = from ? unslugify(from) : undefined;
  const dropLocation = to ? unslugify(to) : undefined;

  return (
    <>
      <Helmet>
        <title>{pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Airport Taxi | Vizag Taxi Hub` : 'Airport Taxi Service | Vizag Taxi Hub'}</title>
        <meta name="description" content={pickupLocation && dropLocation ? `Book airport taxi from ${pickupLocation} to ${dropLocation}. Reliable airport transfer service with fixed pricing and professional drivers.` : 'Book airport taxi service in Visakhapatnam. Reliable airport transfer service with fixed pricing and professional drivers.'} />
        <meta name="keywords" content="airport taxi visakhapatnam, vizag airport cab, airport transfer service, visakhapatnam airport pickup, airport drop vizag, taxi to airport" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://vizagtaxihub.com/airport-taxi/${from}/${to}`} />
        <meta property="og:title" content={pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Airport Taxi | Vizag Taxi Hub` : 'Airport Taxi Service | Vizag Taxi Hub'} />
        <meta property="og:description" content={pickupLocation && dropLocation ? `Book airport taxi from ${pickupLocation} to ${dropLocation}. Reliable airport transfer service with fixed pricing and professional drivers.` : 'Book airport taxi service in Visakhapatnam. Reliable airport transfer service with fixed pricing and professional drivers.'} />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://vizagtaxihub.com/airport-taxi/${from}/${to}`} />
        <meta property="twitter:title" content={pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Airport Taxi | Vizag Taxi Hub` : 'Airport Taxi Service | Vizag Taxi Hub'} />
        <meta property="twitter:description" content={pickupLocation && dropLocation ? `Book airport taxi from ${pickupLocation} to ${dropLocation}. Reliable airport transfer service with fixed pricing and professional drivers.` : 'Book airport taxi service in Visakhapatnam. Reliable airport transfer service with fixed pricing and professional drivers.'} />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://vizagtaxihub.com/airport-taxi/${from}/${to}`} />
      </Helmet>
      
      <div className="min-h-screen bg-white pt-24 md:pt-28">
        <Navbar />
        <AirportHeroWidget 
          initialPickup={pickupLocation} 
          initialDrop={dropLocation} 
        />
        {/* A footer could be added here if needed */}
      </div>
    </>
  );
} 