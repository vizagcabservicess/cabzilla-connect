
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Calendar, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { tourAPI } from '@/services/api/tourAPI';

interface VehicleToursProps {
  vehicleId: string;
  vehicleName?: string;
}

interface TourData {
  tourId: string;
  tourName: string;
  distance?: number;
  days?: number;
  description?: string;
  imageUrl?: string;
  pricing: { [vehicleId: string]: number };
  timeDuration?: string;
}

const VehicleTours: React.FC<VehicleToursProps> = ({ vehicleId, vehicleName = 'Vehicle' }) => {
  const [tours, setTours] = useState<TourData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoading(true);
        const tourData = await tourAPI.getTourFares();
        
        // Filter tours that have pricing for this vehicle
        const vehicleTours = tourData.filter(tour => 
          tour.pricing && tour.pricing[vehicleId]
        );
        
        setTours(vehicleTours);
      } catch (error) {
        console.error('Error fetching tours:', error);
        setTours([]);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchTours();
    }
  }, [vehicleId]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Tours...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tours.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Available Tours</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">
            No tours available for {vehicleName} at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Available Tours for {vehicleName}
        </CardTitle>
        <p className="text-gray-600">Perfect destinations for your {vehicleName}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {tours.map((tour) => (
            <div key={tour.tourId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{tour.tourName}</h4>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {tour.description || `Explore ${tour.tourName} with comfortable ${vehicleName}`}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {tour.distance && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{tour.distance} km</span>
                      </div>
                    )}
                    {tour.days && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{tour.days} day{tour.days > 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {tour.timeDuration && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{tour.timeDuration}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <Badge className="bg-green-100 text-green-800 border-green-200 mb-2">
                    ₹{tour.pricing[vehicleId].toLocaleString()}
                  </Badge>
                  <p className="text-xs text-gray-500">Total package</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Includes:</span> AC, Driver, Fuel, Parking
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/tours/${tour.tourId}`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleTours;
