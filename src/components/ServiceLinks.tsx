import React from 'react';
import { Link } from 'react-router-dom';

interface ServiceLinksProps {
  currentService?: string;
  title?: string;
}

export const ServiceLinks: React.FC<ServiceLinksProps> = ({ 
  currentService,
  title = "Our Services"
}) => {
  const services = [
    {
      name: 'Local Taxi',
      href: '/local-taxi',
      description: 'City rides and local trips',
      icon: '🚗'
    },
    {
      name: 'Outstation Taxi',
      href: '/outstation-taxi',
      description: 'Inter-city travel',
      icon: '🛣️'
    },
    {
      name: 'Airport Transfer',
      href: '/airport-taxi',
      description: 'Airport pickup & drop',
      icon: '✈️'
    },
    {
      name: 'Tour Packages',
      href: '/tours',
      description: 'Sightseeing packages',
      icon: '🏛️'
    },
    {
      name: 'Urbania Rental Vizag',
      href: '/urbania-rental-vizag',
      description: 'Premium Urbania van hire',
      icon: '🚐'
    },
    {
      name: 'Tempo Traveller Rental',
      href: '/tempo-traveller-rental-vizag',
      description: 'Group travel solutions',
      icon: '🚌'
    },
    {
      name: '17 Seater Tempo Traveller',
      href: '/17-seater-tempo-traveller-vizag',
      description: 'Large group transportation',
      icon: '🚐'
    },
    {
      name: '12 Seater Tempo Traveller',
      href: '/12-seater-tempo-traveller-vizag',
      description: 'Medium group travel',
      icon: '🚐'
    },
    {
      name: 'Group Travel',
      href: '/group-travel-tempo-traveller-vizag',
      description: 'Specialized group travel',
      icon: '👥'
    },
    {
      name: 'Corporate Transport',
      href: '/corporate-tempo-traveller-vizag',
      description: 'Business travel solutions',
      icon: '🏢'
    },
    {
      name: 'Wedding Transport',
      href: '/wedding-tempo-traveller-vizag',
      description: 'Special wedding services',
      icon: '💒'
    },
    {
      name: 'Pilgrimage Tours',
      href: '/pilgrimage-tempo-traveller-vizag',
      description: 'Religious journey transport',
      icon: '🕍'
    },
    {
      name: 'Mini Bus Travels',
      href: '/mini-bus-travels-vizag',
      description: 'Mini bus rental services',
      icon: '🚌'
    },
    {
      name: 'Fleet',
      href: '/fleet',
      description: 'Our vehicle fleet',
      icon: '🚙'
    },
    {
      name: 'Hire Driver',
      href: '/hire-driver',
      description: 'Professional drivers',
      icon: '👨‍✈️'
    }
  ];

  // Filter out current service if provided
  const filteredServices = currentService 
    ? services.filter(service => service.href !== currentService)
    : services;

  return (
    <div className="bg-gray-50 rounded-lg p-6 mt-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service, index) => (
          <Link
            key={index}
            to={service.href}
            className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{service.icon}</span>
              <div>
                <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                  {service.name}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {service.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

