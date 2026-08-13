import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Bus } from 'lucide-react';

const MiniBusTravelsPage = () => {
  return (
    <TempoTravellerPage
      pageType="mini-bus"
      title="Mini Bus Travels in Vizag"
      description="Book mini bus travels in Vizag — hire minibus, bus on hire, and bus rental in Vizag with AC and driver. Minibus rental for groups and events. Call +91 9966363662."
      keywords="mini bus travels in vizag, hire minibus, bus on hire, bus rental in vizag, minibus rental, mini bus hire vizag, mini bus rental vizag, group transport vizag"
      url="https://vizagtaxihub.com/mini-bus-travels-vizag"
      color="from-teal-600 to-teal-800"
      icon={<Bus className="h-8 w-8 text-teal-600 mb-4" />}
      headline="Mini Bus Travels in Vizag — Bus on Hire"
      subtitle="Hire minibus and book bus rental in Vizag for groups, events, and outstation trips — AC comfort with professional drivers."
    />
  );
};

export default MiniBusTravelsPage;
