import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Bus } from 'lucide-react';

const EighteenSeaterTempoTravellerPage = () => {
  return (
    <TempoTravellerPage
      pageType="18-seater-tempo-traveller"
      title="18 Seater Tempo Traveller"
      description="Spacious 18-seater tempo traveller for large group travel in Visakhapatnam. Perfect for corporate outings, family trips, and group tours with maximum comfort and safety."
      keywords="18 seater tempo traveller, large group travel, corporate transport, family trips, group tours, Visakhapatnam tempo traveller, spacious tempo traveller"
      url="https://vizagtaxihub.com/18-seater-tempo-traveller-vizag"
      color="bg-green-600"
      icon={<Bus className="h-6 w-6" />}
    />
  );
};

export default EighteenSeaterTempoTravellerPage;
