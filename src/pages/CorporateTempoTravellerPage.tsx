import React from 'react';
import TempoTravellerPage from './TempoTravellerPage';
import { Building } from 'lucide-react';

const CorporateTempoTravellerPage = () => {
  return (
    <TempoTravellerPage
      pageType="corporate"
      title="Corporate Tempo Traveller in Vizag"
      description="Book corporate tempo traveller in Vizag for business travel. 17 seater AC mini bus with professional driver. Best corporate transport rates in Visakhapatnam."
      keywords="corporate tempo traveller vizag, business travel vizag, corporate transport vizag, tempo traveller for business vizag, corporate events vizag, business meetings vizag, corporate outstation travel vizag, tempo traveller booking vizag, tempo traveller rates vizag"
      url="https://vizagtaxihub.com/corporate-tempo-traveller-vizag"
      color="from-indigo-600 to-indigo-800"
      icon={<Building className="h-8 w-8 text-indigo-600 mb-4" />}
    />
  );
};

export default CorporateTempoTravellerPage;

