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

const AIRPORT_SEO_TITLE = 'Cabs in Visakhapatnam Airport | Vizag Airport Taxi';
const AIRPORT_SEO_DESCRIPTION =
  'Book Cabs in Visakhapatnam Airport at fixed rates. 24/7 airport pickup & drop with professional drivers. Call +91 9966363662';
const AIRPORT_SEO_KEYWORDS =
  'cabs in visakhapatnam airport, airport taxi visakhapatnam, vizag airport cab, airport transfer service, visakhapatnam airport pickup, airport drop vizag';

export function AirportTaxiPrefilledPage() {
  const { from, to } = useParams<{ from: string; to: string }>();

  const pickupLocation = from ? unslugify(from) : undefined;
  const dropLocation = to ? unslugify(to) : undefined;

  const pageTitle =
    pickupLocation && dropLocation
      ? `${pickupLocation} to ${dropLocation} | Vizag Airport Taxi`
      : AIRPORT_SEO_TITLE;
  const pageDescription =
    pickupLocation && dropLocation
      ? `Book cabs from ${pickupLocation} to ${dropLocation} at fixed rates. 24/7 airport pickup & drop with professional drivers. Call +91 9966363662`
      : AIRPORT_SEO_DESCRIPTION;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="keywords" content={AIRPORT_SEO_KEYWORDS} />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://vizagtaxihub.com/airport-taxi/${from}/${to}`} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`https://vizagtaxihub.com/airport-taxi/${from}/${to}`} />
        <meta property="twitter:title" content={pageTitle} />
        <meta property="twitter:description" content={pageDescription} />
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