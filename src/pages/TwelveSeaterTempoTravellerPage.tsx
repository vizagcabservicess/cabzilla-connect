import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Users } from 'lucide-react';

const TwelveSeaterTempoTravellerPage = () => {
  return (
    <TempoTravellerPage
      pageType="12-seater"
      title="12 Seater Tempo Traveller in Vizag"
      description="Book 12 seater tempo traveller in Vizag for group travel. AC mini bus rental with professional driver. Best 12 seater tempo traveller rates in Visakhapatnam."
      keywords="12 seater tempo traveller vizag, 12 seater mini bus vizag, small group travel vizag, tempo traveller 12 seater vizag, mini bus 12 seater vizag, group travel 12 seater vizag, tempo traveller booking vizag, tempo traveller rates vizag"
      url="https://vizagtaxihub.com/12-seater-tempo-traveller-vizag"
      color="from-purple-600 to-purple-800"
      icon={<Users className="h-8 w-8 text-purple-600 mb-4" />}
    />
  );
};

export default TwelveSeaterTempoTravellerPage;

