import React from 'react';
import { Bus } from 'lucide-react';
import TempoTravellerPage from './TempoTravellerPage';

const UrbaniaRentalVizagPage = () => {
  return (
    <TempoTravellerPage
      pageType="urbania"
      title="Force Urbania Rental in Vizag"
      description="Rent a Force Urbania luxury AC van in Vizag for weddings, corporate groups and Araku trips with an experienced driver. Book online with Vizag Taxi Hub."
      keywords="urbania rental vizag, force urbania vizag, force urbania for rent vizag, urbania hire visakhapatnam, premium van hire vizag, corporate urbania vizag, wedding urbania vizag"
      url="https://vizagtaxihub.com/urbania-rental-vizag"
      color="from-slate-800 to-slate-900"
      icon={<Bus className="h-8 w-8 text-slate-700 mb-4" />}
      headline="Force Urbania Rental in Vizag"
      subtitle="Luxury AC Urbania for weddings, corporate groups and outstation trips, with a professional driver."
    />
  );
};

export default UrbaniaRentalVizagPage;
