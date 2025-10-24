import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { MapPin } from 'lucide-react';

const PilgrimageTempoTravellerPage = () => {
  return (
    <TempoTravellerPage
      pageType="pilgrimage"
      title="Pilgrimage Tempo Traveller in Vizag"
      description="Book pilgrimage tempo traveller in Vizag for religious tours. 17 seater AC mini bus with professional driver. Best pilgrimage transport rates in Visakhapatnam."
      keywords="pilgrimage tempo traveller vizag, religious tours vizag, tempo traveller for pilgrimage vizag, temple tours vizag, religious trips vizag, pilgrimage outstation travel vizag, tempo traveller booking vizag, tempo traveller rates vizag"
      url="https://vizagtaxihub.com/pilgrimage-tempo-traveller-vizag"
      color="from-yellow-600 to-yellow-800"
      icon={<MapPin className="h-8 w-8 text-yellow-600 mb-4" />}
    />
  );
};

export default PilgrimageTempoTravellerPage;

