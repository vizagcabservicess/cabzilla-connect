import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { MapPin } from 'lucide-react';

const ArakuTourPackagesPage = () => {
  return (
    <TempoTravellerPage
      pageType="araku-tours"
      title="Araku Tour Packages from Vizag"
      description="Book Araku tour packages from Vizag. Complete Araku Valley tour packages with tempo traveller, sightseeing, accommodation, and meals. Best Araku tour packages with professional guides. Book now for amazing Araku Valley experience."
      keywords="araku tour packages, vizag to araku tour, araku valley tour, araku packages from vizag, araku sightseeing tour, araku valley packages, araku tour booking, araku travel packages"
      url="https://vizagtaxihub.com/araku-tour-packages-vizag"
      color="from-green-600 to-green-800"
      icon={<MapPin className="h-8 w-8 text-green-600 mb-4" />}
    />
  );
};

export default ArakuTourPackagesPage;














