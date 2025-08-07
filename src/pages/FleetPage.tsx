import { useState, useEffect } from 'react';
import { Search, MapPin, Users, Calendar, Star, Phone, Car, CheckCircle, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getVehicleData } from '@/services/vehicleDataService';
import { Link } from 'react-router-dom';

export default function FleetPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ["All Categories", "Sedan", "SUV", "Tempo Travellers"];

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
  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCategory(vehicle).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || 
                           (selectedCategory === 'Sedan' && getType(vehicle).includes('sedan')) ||
                           (selectedCategory === 'SUV' && (getType(vehicle).includes('suv') || getType(vehicle).includes('ertiga') || getType(vehicle).includes('innova'))) ||
                           (selectedCategory === 'Tempo Travellers' && (getType(vehicle).includes('tempo') || getType(vehicle).includes('traveller')));
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Our Fleet
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Discover our diverse range of well-maintained vehicles, perfect for every journey
          </p>
          
          {/* Search Bar */}
          <div className="max-w-md mx-auto relative mb-8">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-10">
            <Car className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((vehicle, index) => {
              const vehicleSlug = vehicle.id ? vehicle.id.toString().trim().toLowerCase().replace(/\s+/g, '-') : '';
              return (
                <Link
                  key={vehicle.id || index}
                  to={`/vehicle/${vehicleSlug}`}
                  style={{ textDecoration: 'none' }}
                  className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white rounded-3xl overflow-hidden relative"
                >
                  <Card className="border-0 bg-white rounded-3xl overflow-hidden relative">
                    {/* Vehicle Image Section */}
                    <div className={`relative h-40 md:h-48 bg-gradient-to-br ${getBgGradient(getType(vehicle))} p-6 flex items-center justify-center`}>
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <Badge variant="outline" className="bg-white/90 text-blue-600 border-blue-200 text-xs font-medium">
                          <Users className="h-3 w-3 mr-1" />
                          {getCapacity(vehicle)}
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
                        </div>
                      </div>
                      {/* Pricing */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-blue-50 px-4 py-2 rounded-xl">
                          <span className="text-base font-medium text-blue-600">{getPrice(vehicle)}</span>
                          <span className="text-sm text-blue-500 ml-1">/ per KM</span>
                        </div>
                        <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {getCapacity(vehicle)}
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
                      <Button
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-3 font-medium shadow-lg hover:shadow-xl transition-all"
                        asChild
                      >
                        <Link to={`/vehicle/${vehicleSlug}`}>Book Now</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && filteredVehicles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No vehicles found matching your search.</p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need a Custom Solution?</h2>
          <p className="text-lg mb-8 opacity-90">
            Contact us for special requirements or long-term rental options
          </p>
          <Button variant="secondary" size="lg" className="rounded-full">
            Contact Our Fleet Manager
          </Button>
        </div>
      </div>

      {/* Safety Info Section */}
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
            <Shield className="h-5 w-5" />
            <span className="font-medium">Safety Guaranteed</span>
          </div>
          <p className="text-sm text-gray-500">
            All vehicles are regularly sanitized and maintained for your safety and comfort.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}