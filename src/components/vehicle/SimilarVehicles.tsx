
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SimilarVehiclesProps {
  vehicles?: {
    id: string;
    name: string;
    capacity: string;
    image?: string;
    price: string;
  }[];
}

const SimilarVehicles: React.FC<SimilarVehiclesProps> = ({ 
  vehicles = [
    {
      id: "honda-amaze",
      name: "Honda Amaze",
      capacity: "4 Passengers",
      price: "₹12/km",
      image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=200&fit=crop"
    },
    {
      id: "innova-crysta",
      name: "Innova Crysta", 
      capacity: "7 Passengers",
      price: "₹22/km",
      image: "https://images.unsplash.com/photo-1570294917816-eceb74fccfa9?w=300&h=200&fit=crop"
    },
    {
      id: "swift-dzire",
      name: "Swift Dzire",
      capacity: "4 Passengers", 
      price: "₹13/km",
      image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop"
    }
  ]
}) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Similar Vehicles</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vehicles.map((vehicle, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                {vehicle.image ? (
                  <img 
                    src={vehicle.image} 
                    alt={vehicle.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = '<div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center"><svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg></div>';
                    }}
                  />
                ) : (
                  <Car className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-2">{vehicle.name}</h4>
              
              <div className="flex items-center text-gray-600 mb-3">
                <Users className="h-4 w-4 mr-1" />
                <span className="text-sm">{vehicle.capacity}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                  {vehicle.price}
                </Badge>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/vehicle/${vehicle.id}`}>View Details</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SimilarVehicles;
