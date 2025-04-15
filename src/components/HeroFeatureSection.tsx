
import React from 'react';
import { Calendar, MessageCircle, Truck, Clock, CreditCard, Shield } from 'lucide-react';

export const HeroFeatureSection: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h5 className="text-cabBlue-600 font-medium text-sm uppercase tracking-wider mb-2">
            Why Choose Us
          </h5>
          <h2 className="text-3xl font-bold text-cabGray-800">
            The Premier Cab Service Experience
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-6 bg-white rounded-xl border border-cabGray-100 shadow-card hover:shadow-elevated transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-cabBlue-100 flex items-center justify-center text-cabBlue-600 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-cabGray-800 mb-2">{feature.title}</h3>
              <p className="text-cabGray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const features = [
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Transparent Pricing",
    description: "No hidden charges or surprises. Our pricing is transparent with all charges clearly mentioned before booking."
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Safety First",
    description: "All our cabs undergo regular safety checks and our drivers are trained professionals with verified backgrounds."
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "24/7 Availability",
    description: "Our cabs are available round the clock. Book a ride anytime, anywhere with just a few clicks."
  }
];

export default HeroFeatureSection;
