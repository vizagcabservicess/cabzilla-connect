import { useParams } from 'react-router-dom';
import { Navbar } from "@/components/Navbar";
import { LocalHeroWidget } from "@/components/LocalHeroWidget";
import { Helmet } from 'react-helmet-async';

// Helper to convert slug to title case
function unslugify(slug: string) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function LocalTaxiPrefilledPage() {
  const { from, to } = useParams<{ from: string; to: string }>();

  const pickupLocation = from ? unslugify(from) : undefined;
  const dropLocation = to ? unslugify(to) : undefined;

  return (
    <>
      <Helmet>
        <title>{pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Local Taxi | Vizag Taxi Hub` : 'Local Taxi Service | Vizag Taxi Hub'}</title>
        <meta name="description" content={pickupLocation && dropLocation ? `Book local taxi from ${pickupLocation} to ${dropLocation} in Visakhapatnam. Quick pickup, safe rides, and fair pricing with professional drivers.` : 'Book local taxi service in Visakhapatnam. Quick pickup, safe rides, and fair pricing with professional drivers.'} />
        <meta name="keywords" content="local taxi visakhapatnam, city cab vizag, local cab booking visakhapatnam, vizag city taxi, point to point taxi vizag" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://vizagtaxihub.com/local-taxi/${from}/${to}`} />
        <meta property="og:title" content={pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Local Taxi | Vizag Taxi Hub` : 'Local Taxi Service | Vizag Taxi Hub'} />
        <meta property="og:description" content={pickupLocation && dropLocation ? `Book local taxi from ${pickupLocation} to ${dropLocation} in Visakhapatnam. Quick pickup, safe rides, and fair pricing with professional drivers.` : 'Book local taxi service in Visakhapatnam. Quick pickup, safe rides, and fair pricing with professional drivers.'} />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://vizagtaxihub.com/local-taxi/${from}/${to}`} />
        <meta property="twitter:title" content={pickupLocation && dropLocation ? `${pickupLocation} to ${dropLocation} Local Taxi | Vizag Taxi Hub` : 'Local Taxi Service | Vizag Taxi Hub'} />
        <meta property="twitter:description" content={pickupLocation && dropLocation ? `Book local taxi from ${pickupLocation} to ${dropLocation} in Visakhapatnam. Quick pickup, safe rides, and fair pricing with professional drivers.` : 'Book local taxi service in Visakhapatnam. Quick pickup, safe rides, and fair pricing with professional drivers.'} />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://vizagtaxihub.com/local-taxi/${from}/${to}`} />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        <Navbar />
        <LocalHeroWidget 
          initialPickup={pickupLocation} 
          initialDrop={dropLocation} 
        />
        {/* A footer could be added here if needed */}
      </div>
    </>
  );
} 