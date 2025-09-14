import React from 'react';
import { Link } from 'react-router-dom';
import { popularRoutes } from '@/lib/routeData';
import { slugify } from '@/lib/utils';

interface RelatedRoutesProps {
  currentRoute?: {
    from: string;
    to: string;
  };
  limit?: number;
}

export const RelatedRoutes: React.FC<RelatedRoutesProps> = ({ 
  currentRoute, 
  limit = 4 
}) => {
  // Get routes from the same origin or popular routes
  const getRelatedRoutes = () => {
    if (!currentRoute) {
      // Show most popular routes
      return popularRoutes.slice(0, limit);
    }

    // Get routes from the same origin
    const sameOriginRoutes = popularRoutes.filter(
      route => route.from === currentRoute.from && route.to !== currentRoute.to
    );

    // If not enough same origin routes, add other popular routes
    if (sameOriginRoutes.length < limit) {
      const otherRoutes = popularRoutes.filter(
        route => route.from !== currentRoute.from
      );
      return [...sameOriginRoutes, ...otherRoutes].slice(0, limit);
    }

    return sameOriginRoutes.slice(0, limit);
  };

  const relatedRoutes = getRelatedRoutes();

  if (relatedRoutes.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 rounded-lg p-6 mt-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        {currentRoute ? `Other Routes from ${currentRoute.from}` : 'Popular Routes'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {relatedRoutes.map((route, index) => {
          const routeSlug = `${slugify(route.from)}-to-${slugify(route.to)}`;
          return (
            <Link
              key={index}
              to={`/outstation-taxi/${routeSlug}`}
              className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {route.from} to {route.to}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {route.distance} • {route.time}
                  </p>
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                    {route.description}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-sm font-medium text-blue-600">
                    From ₹{route.fares.sedan.replace('₹', '')}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

