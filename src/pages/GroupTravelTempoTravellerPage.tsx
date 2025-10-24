import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Users } from 'lucide-react';

const GroupTravelTempoTravellerPage = () => {
  return (
    <TempoTravellerPage
      pageType="group-travel"
      title="Group Travel Tempo Traveller in Vizag"
      description="Book group travel tempo traveller in Vizag. 17 seater AC mini bus for corporate events, family trips. Best group travel rates in Visakhapatnam."
      keywords="group travel tempo traveller vizag, corporate tempo traveller vizag, family group travel vizag, wedding tempo traveller vizag, pilgrimage tempo traveller vizag, outstation group travel vizag, tempo traveller booking vizag, tempo traveller rates vizag"
      url="https://vizagtaxihub.com/group-travel-tempo-traveller-vizag"
      color="from-orange-600 to-orange-800"
      icon={<Users className="h-8 w-8 text-orange-600 mb-4" />}
    />
  );
};

export default GroupTravelTempoTravellerPage;

