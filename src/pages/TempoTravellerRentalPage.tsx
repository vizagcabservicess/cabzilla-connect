import React from 'react';
import { Bus } from 'lucide-react';
import TempoTravellerPage from './TempoTravellerPage';

const TempoTravellerRentalPage = () => {
  return (
    <TempoTravellerPage
      pageType="rental"
      title="Tempo Traveller Rental in Vizag"
      description="Hire AC 12, 17 and 18 seater tempo travellers in Vizag for family groups, weddings and outstation trips with verified drivers. Book online 24/7."
      keywords="tempo traveller in vizag, tempo traveller hire vizag, tempo traveller rent in vizag, van rental, van hire, traveller van rental, 17 seater vehicle, tempo traveller rental vizag, mini bus rental vizag"
      url="https://vizagtaxihub.com/tempo-traveller-rental-vizag"
      color="from-blue-600 to-blue-800"
      icon={<Bus className="h-8 w-8 text-blue-600 mb-4" />}
      headline="Tempo Traveller Rental in Vizag"
      subtitle="AC 12, 17 and 18 seater tempo travellers for family groups, weddings and outstation trips, with a professional driver."
    />
  );
};

export default TempoTravellerRentalPage;
