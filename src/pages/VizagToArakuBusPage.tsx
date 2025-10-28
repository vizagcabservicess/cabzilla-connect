import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Bus } from 'lucide-react';

const VizagToArakuBusPage = () => {
  return (
    <TempoTravellerPage
      pageType="vizag-araku-bus"
      title="Vizag to Araku Bus Service"
      description="Book Vizag to Araku bus service with tempo traveller. Comfortable bus travel from Visakhapatnam to Araku Valley. AC tempo traveller for Araku route, group bookings, sightseeing tours. Best Vizag to Araku bus service with professional drivers."
      keywords="vizag to araku bus, vizag araku bus service, bus from vizag to araku, araku bus booking, vizag araku transport, araku valley bus, vizag araku tempo traveller, araku bus rental"
      url="https://vizagtaxihub.com/vizag-to-araku-bus"
      color="from-blue-600 to-blue-800"
      icon={<Bus className="h-8 w-8 text-blue-600 mb-4" />}
    />
  );
};

export default VizagToArakuBusPage;




