import { useParams } from 'react-router-dom';
import { Navbar } from "@/components/Navbar";
import { AirportHeroWidget } from "@/components/AirportHeroWidget";

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
    <div className="min-h-screen bg-white">
      <Navbar />
      <AirportHeroWidget 
        initialPickup={pickupLocation} 
        initialDrop={dropLocation} 
      />
      {/* A footer could be added here if needed */}
    </div>
  );
} 