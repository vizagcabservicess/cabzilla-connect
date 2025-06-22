import { Navbar } from "@/components/Navbar";
import { AirportHeroWidget } from "@/components/AirportHeroWidget";

export function AirportTaxiPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <AirportHeroWidget />
      {/* A footer could be added here if needed */}
    </div>
  );
}
