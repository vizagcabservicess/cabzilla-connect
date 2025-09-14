import React from 'react';
import { Link } from 'react-router-dom';
import { popularRoutes } from '@/lib/routeData';
import { slugify } from '@/lib/utils';

interface PopularDestinationsProps {
  title?: string;
  limit?: number;
  showFares?: boolean;
}

export const PopularDestinations: React.FC<PopularDestinationsProps> = ({ 
  title = "Popular Destinations from Visakhapatnam",
  limit = 8,
  showFares = true
}) => {
  // Get most popular routes (you can customize this logic)
  const popularDestinations = popularRoutes.slice(0, limit);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {popularDestinations.map((route, index) => {
          const routeSlug = `${slugify(route.from)}-to-${slugify(route.to)}`;
          return (
            <Link
              key={index}
              to={`/outstation-taxi/${routeSlug}`}
              className="block p-4 bg-gray-50 rounded-lg hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all duration-200 group"
            >
              <div className="text-center">
                <h4 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                  {route.to}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {route.distance} • {route.time}
                </p>
                {showFares && (
                  <p className="text-sm font-medium text-blue-600 mt-2">
                    From ₹{route.fares.sedan.replace('₹', '')}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      <div className="text-center mt-6">
        <Link
          to="/outstation-taxi"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          View All Routes
          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
};

