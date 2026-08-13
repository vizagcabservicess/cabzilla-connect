import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Users } from 'lucide-react';

const TwelveSeaterTempoTravellerPage = () => {
  return (
    <TempoTravellerPage
      pageType="12-seater"
      title="12 Seater Tempo Traveller in Vizag"
      description="Book 12 seater tempo traveller in Vizag and 12 seater van rental for medium groups. AC mini van for rental with professional driver. Call +91 9966363662."
      keywords="12 seater tempo traveller in vizag, 12 seater van rental, mini van for rental, tour van rental, 12 seater mini bus vizag, tempo traveller 12 seater vizag"
      url="https://vizagtaxihub.com/12-seater-tempo-traveller-vizag"
      color="from-purple-600 to-purple-800"
      icon={<Users className="h-8 w-8 text-purple-600 mb-4" />}
      headline="12 Seater Tempo Traveller in Vizag"
      subtitle="12 seater van rental and mini van for rental — ideal for families and small groups with AC comfort and a professional driver."
    />
  );
};

export default TwelveSeaterTempoTravellerPage;
