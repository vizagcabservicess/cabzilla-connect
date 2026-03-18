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
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getVehicleUrl, getVehicleImageUrl } from '@/utils/vehicleUrlUtils';

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

  // Helper to get price (per KM or base price) - handles price_per_km and known fallbacks
  function getPrice(vehicle: any): string {
    const perKm = vehicle.pricePerKm ?? vehicle.price_per_km;
    if (perKm != null && perKm > 0) return `₹${Number(perKm)}`;
    if (vehicle.basePrice && vehicle.basePrice > 0) return `₹${vehicle.basePrice}`;
    if (vehicle.price && vehicle.price > 0) return `₹${vehicle.price}`;
    const name = String(vehicle.name || '').toLowerCase();
    if (name.includes('glanza') || name.includes('toyota glanza')) return '₹14';
    if (name.includes('swift') || name.includes('dzire') || name.includes('amaze')) return '₹14';
    if (name.includes('ertiga')) return '₹18';
    if (name.includes('innova')) return '₹20';
    if (name.includes('tempo')) return '₹35';
    if (name.includes('luxury')) return '₹25';
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
    <>
      <Helmet>
        <title>Our Fleet - Vizag Taxi Hub | Wide Range of Vehicles in Visakhapatnam</title>
        <meta name="description" content="Browse our comprehensive fleet of 50+ vehicles in Visakhapatnam. From economy sedans to luxury SUVs, tempo travellers to mini buses. All vehicles are well-maintained with professional drivers. Choose the perfect vehicle for your journey." />
        <meta name="keywords" content="fleet vizag taxi hub, vehicles visakhapatnam, car rental fleet, sedan suv tempo traveller, luxury cars vizag, taxi fleet" />
        <meta name="author" content="Vizag Taxi Hub" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://vizagtaxihub.com/fleet" />
        <meta property="og:title" content="Our Fleet - Vizag Taxi Hub | Wide Range of Vehicles in Visakhapatnam" />
        <meta property="og:description" content="Explore our diverse fleet of vehicles in Visakhapatnam. From sedans to SUVs, tempo travellers to luxury cars." />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://vizagtaxihub.com/fleet" />
        <meta property="twitter:title" content="Our Fleet - Vizag Taxi Hub | Wide Range of Vehicles in Visakhapatnam" />
        <meta property="twitter:description" content="Explore our diverse fleet of vehicles in Visakhapatnam. From sedans to SUVs, tempo travellers to luxury cars." />
        <meta property="twitter:image" content="/og-image.png" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://vizagtaxihub.com/fleet" />
      </Helmet>
      
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-20">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background py-16">
          <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Our Fleet
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Discover our diverse range of well-maintained vehicles, perfect for every journey
            </p>
            
            {/* Search Bar - Hidden */}
            {/* <div className="max-w-md mx-auto relative mb-8">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div> */}

            {/* Category Filters - Hidden */}
            {/* <div className="flex flex-wrap justify-center gap-2">
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
            </div> */}
          </div>
        </div>

        {/* Fleet Grid */}
        <div className="container mx-auto px-6 sm:px-8 lg:px-12 py-12">
          {loading ? (
            <div className="flex justify-center py-10">
              <Car className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle, index) => {
                const vehicleUrl = getVehicleUrl(vehicle);
                return (
                  <Link
                    key={vehicle.id || index}
                    to={vehicleUrl}
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
                        {/* Vehicle Image or Icon - use getVehicleImageUrl for absolute URLs and fallbacks */}
                        {(() => {
                          const imgUrl = getVehicleImageUrl(vehicle);
                          const placeholder = (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/80 rounded-2xl z-0">
                              <Car className="h-16 w-16 md:h-20 md:w-20 text-gray-400" />
                            </div>
                          );
                          if (imgUrl) {
                            return (
                              <>
                                <img
                                  src={imgUrl}
                                  alt={vehicle.name}
                                  className="absolute inset-0 w-full h-full object-cover rounded-2xl z-10"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                {placeholder}
                              </>
                            );
                          }
                          return placeholder;
                        })()}
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
                          <Link to={vehicleUrl}>Book Now</Link>
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

        {/* Tempo Traveller Services Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 py-16">
          <div className="container mx-auto px-6 sm:px-8 lg:px-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Specialized Tempo Traveller Services</h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Explore our comprehensive tempo traveller services designed for different travel needs and group sizes
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Link to="/tempo-traveller-rental-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Tempo Traveller Rental</h3>
                  <p className="text-sm text-gray-600">Best tempo traveller rental service in Vizag</p>
                </div>
              </Link>
              
              <Link to="/17-seater-tempo-traveller-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">17 Seater Tempo Traveller</h3>
                  <p className="text-sm text-gray-600">Perfect for large group travel</p>
                </div>
              </Link>
              
              <Link to="/12-seater-tempo-traveller-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">12 Seater Tempo Traveller</h3>
                  <p className="text-sm text-gray-600">Ideal for medium group travel</p>
                </div>
              </Link>
              
              <Link to="/group-travel-tempo-traveller-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-orange-200 transition-colors">
                    <Users className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Group Travel</h3>
                  <p className="text-sm text-gray-600">Specialized group travel solutions</p>
                </div>
              </Link>
              
              <Link to="/corporate-tempo-traveller-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
                    <Shield className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Corporate Transport</h3>
                  <p className="text-sm text-gray-600">Business travel and corporate events</p>
                </div>
              </Link>
              
              <Link to="/wedding-tempo-traveller-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-pink-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-pink-200 transition-colors">
                    <Star className="h-6 w-6 text-pink-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Wedding Transport</h3>
                  <p className="text-sm text-gray-600">Wedding party transportation</p>
                </div>
              </Link>
              
              <Link to="/pilgrimage-tempo-traveller-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-yellow-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-colors">
                    <MapPin className="h-6 w-6 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilgrimage Tours</h3>
                  <p className="text-sm text-gray-600">Religious and pilgrimage tours</p>
                </div>
              </Link>
              
              <Link to="/mini-bus-travels-vizag" className="group">
                <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="bg-teal-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-teal-200 transition-colors">
                    <Car className="h-6 w-6 text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Mini Bus Travels</h3>
                  <p className="text-sm text-gray-600">Mini bus rental services</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-primary text-primary-foreground py-16">
          <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
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
          <div className="container mx-auto px-6 sm:px-8 lg:px-12 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Safety Guaranteed</span>
            </div>
            <p className="text-sm text-gray-500">
              All vehicles are regularly sanitized and maintained for your safety and comfort.
            </p>
          </div>
        </div>
        </main>
        <Footer />
      </div>
    </>
  );
}