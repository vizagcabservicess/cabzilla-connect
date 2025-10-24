import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Bus } from 'lucide-react';

const MiniBusTravelsPage = () => {
  return (
    <TempoTravellerPage
      pageType="mini-bus"
      title="Mini Bus Travels in Vizag"
      description="Book mini bus travels in Vizag for group transport. AC mini bus rental with professional driver, modern amenities, GPS tracking. Perfect for group travel, corporate events, family trips, outstation tours. Best mini bus rental rates in Visakhapatnam."
      keywords="mini bus travels vizag, mini bus rental vizag, group transport vizag, mini bus hire vizag, mini bus booking vizag, mini bus service vizag, tempo traveller vizag, group travel vizag"
      url="https://vizagtaxihub.com/mini-bus-travels-vizag"
      color="from-teal-600 to-teal-800"
      icon={<Bus className="h-8 w-8 text-teal-600 mb-4" />}
    />
  );
};

export default MiniBusTravelsPage;

