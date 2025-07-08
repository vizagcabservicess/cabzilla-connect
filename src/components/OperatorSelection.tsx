import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  Building2, 
  Star, 
  Car, 
  MapPin, 
  Search, 
  Filter,
  ArrowRight,
  Clock,
  Shield,
  Wifi,
  Navigation
} from 'lucide-react';
import { OperatorCard } from '@/types/adminProfile';
import { adminProfileAPI } from '@/services/api/adminProfileAPI';
import { cn } from '@/lib/utils';

interface OperatorSelectionProps {
  onOperatorSelect: (operator: OperatorCard) => void;
  selectedTripType?: 'local' | 'outstation' | 'airport';
}

export function OperatorSelection({ onOperatorSelect, selectedTripType }: OperatorSelectionProps) {
  const [operators, setOperators] = useState<OperatorCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'name'>('rating');
  const [filterVehicleType, setFilterVehicleType] = useState<string>('');

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      setIsLoading(true);
      const data = await adminProfileAPI.getPublicOperators();
      setOperators(data);
    } catch (error) {
      console.error('Error fetching operators:', error);
      toast.error('Failed to load operators');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedOperators = operators
    .filter(operator => {
      const matchesSearch = operator.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           operator.displayName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesVehicleType = !filterVehicleType || 
                                operator.vehicleTypes.some(type => 
                                  type.toLowerCase().includes(filterVehicleType.toLowerCase())
                                );
      return matchesSearch && matchesVehicleType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.rating - a.rating;
        case 'price':
          return a.startingFare - b.startingFare;
        case 'name':
          return a.businessName.localeCompare(b.businessName);
        default:
          return 0;
      }
    });

  const getVehicleTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('sedan')) return '🚗';
    if (lowerType.includes('suv')) return '🚙';
    if (lowerType.includes('hatchback')) return '🚕';
    if (lowerType.includes('tempo')) return '🚐';
    return '🚗';
  };

  const getAmenityIcon = (amenity: string) => {
    const lowerAmenity = amenity.toLowerCase();
    if (lowerAmenity.includes('ac')) return '❄️';
    if (lowerAmenity.includes('wifi')) return <Wifi className="h-3 w-3" />;
    if (lowerAmenity.includes('gps')) return <Navigation className="h-3 w-3" />;
    if (lowerAmenity.includes('24')) return <Clock className="h-3 w-3" />;
    if (lowerAmenity.includes('professional')) return <Shield className="h-3 w-3" />;
    return '✓';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Taxi Operator</h2>
        <p className="text-gray-600">Select from our trusted partners for your {selectedTripType} trip</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search operators..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: 'rating' | 'price' | 'name') => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="price">Best Price</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterVehicleType} onValueChange={setFilterVehicleType}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="sedan">Sedan</SelectItem>
                  <SelectItem value="suv">SUV</SelectItem>
                  <SelectItem value="hatchback">Hatchback</SelectItem>
                  <SelectItem value="tempo">Tempo Traveller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Operators Grid */}
      <div className="space-y-4">
        {filteredAndSortedOperators.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No operators found</h3>
              <p className="text-gray-600">Try adjusting your search filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedOperators.map((operator) => (
            <Card 
              key={operator.id} 
              className={cn(
                "hover:shadow-lg transition-shadow cursor-pointer border-l-4",
                operator.rating >= 4.5 ? "border-l-green-500" : 
                operator.rating >= 4.0 ? "border-l-blue-500" : "border-l-gray-300"
              )}
              onClick={() => onOperatorSelect(operator)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {operator.businessName.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{operator.businessName}</h3>
                        <p className="text-gray-600">{operator.displayName}</p>
                      </div>
                    </div>
                    
                    {operator.description && (
                      <p className="text-gray-600 mb-3 text-sm">{operator.description}</p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="font-semibold">{operator.rating.toFixed(1)}</span>
                      <span className="text-gray-600 text-sm">({operator.totalRatings})</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{operator.startingFare}
                      <span className="text-sm font-normal text-gray-600"> onwards</span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Types */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Available Vehicles</h4>
                  <div className="flex flex-wrap gap-2">
                    {operator.vehicleTypes.map((type, index) => (
                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                        <span>{getVehicleTypeIcon(type)}</span>
                        {type}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                    <Car className="h-4 w-4" />
                    <span>{operator.vehicleCount} vehicles available</span>
                  </div>
                </div>

                {/* Service Areas */}
                {operator.serviceAreas.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Service Areas</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{operator.serviceAreas.slice(0, 3).join(', ')}</span>
                      {operator.serviceAreas.length > 3 && (
                        <span className="text-gray-500">+{operator.serviceAreas.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {operator.amenities.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features</h4>
                    <div className="flex flex-wrap gap-2">
                      {operator.amenities.slice(0, 4).map((amenity, index) => (
                        <div key={index} className="flex items-center gap-1 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                          {getAmenityIcon(amenity)}
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Trusted by customers • Quick booking
                  </div>
                  <Button className="flex items-center gap-2">
                    View Vehicles
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}