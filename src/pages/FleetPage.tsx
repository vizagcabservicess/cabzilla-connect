import { useState } from 'react';
import { Search, MapPin, Users, Calendar, Star, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const fleetData = [
  {
    id: 1,
    name: 'Maruti Suzuki Swift Dzire',
    category: 'Sedan',
    capacity: '4+1',
    luggage: '2 Bags',
    fuel: 'Petrol/Diesel',
    features: ['AC', 'Music System', 'GPS'],
    image: '/placeholder.svg',
    pricePerKm: '₹12',
    available: true
  },
  {
    id: 2,
    name: 'Toyota Innova Crysta',
    category: 'SUV',
    capacity: '7+1',
    luggage: '4 Bags',
    fuel: 'Diesel',
    features: ['AC', 'Music System', 'GPS', 'Leather Seats'],
    image: '/placeholder.svg',
    pricePerKm: '₹18',
    available: true
  },
  {
    id: 3,
    name: 'Tempo Traveller',
    category: 'Mini Bus',
    capacity: '12+1',
    luggage: '8 Bags',
    fuel: 'Diesel',
    features: ['AC', 'Music System', 'GPS', 'Push Back Seats'],
    image: '/placeholder.svg',
    pricePerKm: '₹25',
    available: false
  }
];

export default function FleetPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Sedan', 'SUV', 'Mini Bus', 'Luxury'];

  const filteredFleet = fleetData.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || vehicle.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFleet.map((vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={vehicle.image}
                  alt={vehicle.name}
                  className="w-full h-48 object-cover"
                />
                <Badge
                  className={`absolute top-3 right-3 ${
                    vehicle.available
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {vehicle.available ? 'Available' : 'Booked'}
                </Badge>
              </div>
              
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-2">{vehicle.name}</h3>
                <Badge variant="secondary" className="mb-4">{vehicle.category}</Badge>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    <span>{vehicle.capacity} Seater</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{vehicle.luggage} Luggage</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{vehicle.fuel}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {vehicle.features.map((feature, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-primary">{vehicle.pricePerKm}</span>
                    <span className="text-sm text-muted-foreground">/km</span>
                  </div>
                  <Button className="rounded-full">
                    <Phone className="h-4 w-4 mr-2" />
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredFleet.length === 0 && (
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
    </div>
  );
}