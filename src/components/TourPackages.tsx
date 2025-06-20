
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tourAPI } from '@/services/api/tourAPI';

interface TourPackagesProps {
  selectedTourId?: string | null;
  selectedVehicle?: string | null;
}

interface TourData {
  tourId: string;
  tourName: string;
  distance: number;
  days: number;
  description: string;
  imageUrl: string;
  pricing: { [vehicleId: string]: number };
  isActive: boolean;
}

export const TourPackages: React.FC<TourPackagesProps> = ({ 
  selectedTourId, 
  selectedVehicle 
}) => {
  const [tours, setTours] = useState<TourData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoading(true);
        const tourFares = await tourAPI.getTourFares();
        
        const transformedTours: TourData[] = tourFares.map(tour => ({
          tourId: tour.tourId,
          tourName: tour.tourName,
          distance: tour.distance || 260,
          days: tour.days || 1,
          description: tour.description || '',
          imageUrl: tour.imageUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop",
          pricing: tour.pricing || {},
          isActive: true
        }));

        setTours(transformedTours);
      } catch (error) {
        console.error('Error fetching tours:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTours();
  }, []);

  // Auto-scroll to selected tour when component mounts
  useEffect(() => {
    if (selectedTourId && tours.length > 0) {
      const tourElement = document.getElementById(`tour-${selectedTourId}`);
      if (tourElement) {
        tourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedTourId, tours]);

  const handleBookTour = (tourId: string) => {
    navigate(`/tours/${tourId}`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tours.map((tour) => {
        const minPrice = Math.min(...Object.values(tour.pricing).filter(price => price > 0));
        const isSelected = selectedTourId === tour.tourId;
        
        return (
          <Card 
            key={tour.tourId} 
            id={`tour-${tour.tourId}`}
            className={`overflow-hidden hover:shadow-lg transition-shadow ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={tour.imageUrl} 
                alt={tour.tourName}
                className="w-full h-full object-cover"
              />
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Badge variant="default" className="bg-blue-600">
                    Selected
                  </Badge>
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-2">{tour.tourName}</h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{tour.description}</p>
              
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {tour.distance} km
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {tour.days} day{tour.days > 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-blue-600">
                    ₹{minPrice.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 ml-1">onwards</span>
                </div>
                <Button 
                  onClick={() => handleBookTour(tour.tourId)}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                >
                  Book Now
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
