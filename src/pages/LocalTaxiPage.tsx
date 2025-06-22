import { Navbar } from "@/components/Navbar";
import { LocalHeroWidget } from "@/components/LocalHeroWidget";

export function LocalTaxiPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <LocalHeroWidget />
      {/* A footer could be added here if needed */}
    </div>
  );
}
