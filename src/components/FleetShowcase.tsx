import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Users, MapPin, CheckCircle, Fuel, Star, Shield } from 'lucide-react';
import { getVehicleData } from '@/services/vehicleDataService';

export function FleetShowcase() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All Categories');

  useEffect(() => {
    async function fetchVehicles() {
      setLoading(true);
      try {
        const data = await getVehicleData(false, false);
        setVehicles(data || []);
      } catch (e) {
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    }
    fetchVehicles();
  }, []);

  const categories = ["All Categories", "Sedan", "SUV", "Tempo Travellers"];

  // Helper to get vehicle type/category
  function getType(vehicle: any) {
    if (vehicle.vehicleType) return vehicle.vehicleType.toLowerCase();
    if (vehicle.cabTypeId) return vehicle.cabTypeId.toLowerCase();
    return 'other';
  }

  // Helper to get price (per KM or base price)
  function getPrice(vehicle: any) {
    if (vehicle.pricePerKm) return `₹${vehicle.pricePerKm}`;
    if (vehicle.basePrice) return `₹${vehicle.basePrice}`;
    if (vehicle.price) return `₹${vehicle.price}`;
    return '₹--';
  }

  // Helper to get amenities
  function getAmenities(vehicle: any) {
    if (Array.isArray(vehicle.amenities)) return vehicle.amenities;
    if (typeof vehicle.amenities === 'string') return vehicle.amenities.split(',').map((a: string) => a.trim());
    return [];
  }

  // Helper to get description
  function getDescription(vehicle: any) {
    return vehicle.description || '';
  }

  // Helper to get capacity
  function getCapacity(vehicle: any) {
    return vehicle.capacity ? `${vehicle.capacity} Pax` : '';
  }

  // Helper to get category
  function getCategory(vehicle: any) {
    return getType(vehicle).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  // Helper to get bg gradient
  function getBgGradient(type: string) {
    if (type.toLowerCase().includes('sedan')) return 'from-blue-50 to-indigo-50';
    if (type.toLowerCase().includes('suv') || type.toLowerCase().includes('ertiga') || type.toLowerCase().includes('innova')) return 'from-purple-50 to-violet-50';
    if (type.toLowerCase().includes('tempo')) return 'from-red-50 to-rose-50';
    return 'from-gray-50 to-gray-100';
  }

  // Filtering logic
  const filteredVehicles = activeCategory === 'All Categories'
    ? vehicles
    : vehicles.filter((v) => {
        const type = getType(v);
        if (activeCategory === 'Sedan') return type.includes('sedan');
        if (activeCategory === 'SUV') return type.includes('suv') || type.includes('ertiga') || type.includes('innova');
        if (activeCategory === 'Tempo Travellers') return type.includes('tempo') || type.includes('traveller');
        return true;
      });

  return (
    <section className="px-4 py-4 pb-2 md:py-12 bg-gray-50">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-4 md:mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-4">
            <Car className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">OUR FLEET</span>
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 leading-tight">
            Choose Your Perfect Ride
          </h2>
          <p className="text-gray-600 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-6">
            From economy to luxury, find the perfect vehicle for your journey with our well-maintained fleet.
          </p>
          {/* Category Filter (not functional, just UI) */}
          <div className="flex flex-wrap justify-center gap-2 mb-4 md:mb-8">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    : "border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
        {/* Vehicles Grid */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Car className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredVehicles.map((vehicle, index) => (
              <Card key={vehicle.id || index} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white rounded-3xl overflow-hidden relative">
                {/* Vehicle Image Section */}
                <div className={`relative h-40 md:h-48 bg-gradient-to-br ${getBgGradient(getType(vehicle))} p-6 flex items-center justify-center`}>
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <Badge variant="outline" className="bg-white/90 text-blue-600 border-blue-200 text-xs font-medium">
                      <Users className="h-3 w-3 mr-1" />
                      {getCapacity(vehicle)}
                    </Badge>
                    <Badge variant="outline" className="bg-white/90 text-blue-600 border-blue-200 text-xs font-medium">
                      {getCategory(vehicle)}
                    </Badge>
                  </div>
                  {/* Vehicle Image or Icon */}
                  {vehicle.image && typeof vehicle.image === 'string' && vehicle.image.trim() !== '' ? (
                    <img
                      src={vehicle.image}
                      alt={vehicle.name}
                      className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                      style={{ zIndex: 1 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm z-10">
                      <Car className="h-10 w-10 md:h-12 md:w-12 text-gray-700" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 flex items-center text-gray-700">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm font-medium">Visakhapatnam</span>
                  </div>
                </div>
                <CardContent className="p-5 md:p-6">
                  {/* Vehicle Info */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-base font-medium text-gray-900">{vehicle.name}</div>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{getDescription(vehicle)}</p>
                    </div>
                  </div>
                  {/* Pricing */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="bg-blue-50 px-4 py-2 rounded-xl">
                      <span className="text-base font-medium text-blue-600">{getPrice(vehicle)}</span>
                      <span className="text-sm text-blue-500 ml-1">/ per KM</span>
                    </div>
                    <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs">
                      {getCategory(vehicle)}
                    </Badge>
                  </div>
                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {getAmenities(vehicle).map((feature: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  {/* Minimum Booking Info */}
                  <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
                    ℹ️ Minimum 300 km for outstation
                  </p>
                  {/* Book Button */}
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3 font-medium shadow-lg hover:shadow-xl transition-all">
                    Book Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {/* Bottom Info */}
        <div className="text-center mt-8 bg-white rounded-2xl p-6">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Safety Guaranteed</span>
          </div>
          <p className="text-sm text-gray-500">
            All vehicles are regularly sanitized and maintained for your safety and comfort.
          </p>
        </div>
      </div>
    </section>
  );
}
