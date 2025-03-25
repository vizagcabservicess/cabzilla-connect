import { useState, useEffect } from "react";
import { TourInfo, TourPackage } from "@/types/cab";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Info, MapPin, Clock, Users, Star, Check, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Car } from 'lucide-react';

interface TourPackagesSectionProps {
  onPackageSelect: (tourId: string, packageId: string) => void;
}

// Sample tour data - replace with API call in production
const sampleTours: TourInfo[] = [
  {
    id: "tour-1",
    name: "Araku Valley Explorer",
    distance: 120,
    days: 2,
    description: "Explore the beautiful Araku Valley with scenic views and tribal culture",
    image: "https://images.unsplash.com/photo-1625813506062-0aeb18f5a213?q=80&w=2070",
    locations: ["Araku Valley", "Borra Caves", "Tribal Museum"],
    startingPrice: 4999
  },
  {
    id: "tour-2",
    name: "Vizag City Tour",
    distance: 50,
    days: 1,
    description: "Discover the highlights of Visakhapatnam in a comprehensive day tour",
    image: "https://images.unsplash.com/photo-1617653695386-1d78957d33d8?q=80&w=2070",
    locations: ["RK Beach", "Kailasagiri", "Submarine Museum"],
    startingPrice: 2499
  },
  {
    id: "tour-3",
    name: "Coastal Explorer",
    distance: 150,
    days: 3,
    description: "Experience the stunning coastline with beaches and seaside attractions",
    image: "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?q=80&w=2036",
    locations: ["Rishikonda Beach", "Yarada Beach", "Ramakrishna Beach"],
    startingPrice: 6999
  },
  {
    id: "tour-4",
    name: "Spiritual Journey",
    distance: 200,
    days: 2,
    description: "Visit sacred temples and spiritual sites around Visakhapatnam",
    image: "https://images.unsplash.com/photo-1545413669-df79116b2bdf?q=80&w=2071",
    locations: ["Simhachalam Temple", "ISKCON Temple", "Kambalakonda"],
    startingPrice: 5499
  }
];

// Sample packages
const samplePackages: TourPackage[] = [
  {
    id: "pkg-1",
    tourId: "tour-1",
    name: "Standard Araku Package",
    description: "2 days, 1 night tour of Araku Valley with comfortable sedan car",
    days: 2,
    price: 4999,
    cabType: "sedan",
    highlights: ["Borra Caves visit", "Coffee plantation tour", "Tribal museum entry"]
  },
  {
    id: "pkg-2",
    tourId: "tour-1",
    name: "Premium Araku Experience",
    description: "2 days, 1 night tour with premium SUV and enhanced itinerary",
    days: 2,
    price: 7999,
    cabType: "innova",
    highlights: ["Borra Caves visit", "Coffee plantation tour", "Tribal museum entry", "Chaparai waterfalls"]
  },
  {
    id: "pkg-3",
    tourId: "tour-2",
    name: "Vizag Day Trip",
    description: "Full day tour of Visakhapatnam's top attractions",
    days: 1,
    price: 2499,
    cabType: "sedan",
    highlights: ["RK Beach", "Kailasagiri Hill", "Submarine Museum", "VMRDA Park"]
  },
  {
    id: "pkg-4",
    tourId: "tour-3",
    name: "Basic Coastal Tour",
    description: "3 day coastal tour in comfortable sedan",
    days: 3,
    price: 6999,
    cabType: "sedan",
    highlights: ["Beach hopping", "Seafood experiences", "Coastal village visits"]
  },
  {
    id: "pkg-5",
    tourId: "tour-3",
    name: "Deluxe Coastal Adventure",
    description: "3 day premium coastal tour with SUV",
    days: 3,
    price: 9999,
    cabType: "innova",
    highlights: ["Beach hopping", "Water sports", "Seafood experiences", "Coastal village visits"]
  },
  {
    id: "pkg-6",
    tourId: "tour-4",
    name: "Spiritual Retreat",
    description: "2 day tour of spiritual and religious sites",
    days: 2,
    price: 5499,
    cabType: "ertiga",
    highlights: ["Temple visits", "Morning prayers", "Spiritual lectures", "Meditation sessions"]
  }
];

export function TourPackagesSection({ onPackageSelect }: TourPackagesSectionProps) {
  const [selectedTour, setSelectedTour] = useState<string | null>(null);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    // Filter packages based on selected tour
    if (selectedTour) {
      const filteredPackages = samplePackages.filter(pkg => pkg.tourId === selectedTour);
      setPackages(filteredPackages);
    } else {
      setPackages([]);
    }
  }, [selectedTour]);

  const handleSelectTour = (tourId: string) => {
    setSelectedTour(tourId);
  };

  const handleSelectPackage = (packageId: string) => {
    if (selectedTour) {
      onPackageSelect(selectedTour, packageId);
    }
  };

  const getCabTypeLabel = (cabType: string) => {
    switch(cabType) {
      case 'sedan': return 'Sedan';
      case 'innova': return 'SUV (Innova)';
      case 'ertiga': return 'MUV (Ertiga)';
      default: return cabType.charAt(0).toUpperCase() + cabType.slice(1);
    }
  };

  return (
    <div className="w-full">
      <h2 className={cn(
        "font-semibold mb-4",
        isMobile ? "text-lg" : "text-xl"
      )}>
        Select a Tour Package
      </h2>
      
      <ScrollArea className={cn(
        "pb-4 -mx-1",
        isMobile ? "h-[350px]" : ""
      )}>
        <div className={cn(
          "grid gap-4 px-1",
          isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {sampleTours.map((tour) => (
            <div 
              key={tour.id}
              className={cn(
                "border rounded-lg overflow-hidden bg-white transition-all",
                selectedTour === tour.id ? "ring-2 ring-blue-500" : "",
                isMobile ? "shadow-sm" : "shadow-md hover:shadow-lg"
              )}
              onClick={() => handleSelectTour(tour.id)}
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={tour.image} 
                  alt={tour.name}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-500",
                    selectedTour === tour.id ? "scale-105" : ""
                  )}
                />
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center">
                  <Star className="h-3 w-3 mr-1 fill-white" />
                  4.8
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <h3 className="text-white font-bold text-lg">{tour.name}</h3>
                  <div className="flex items-center text-white/90 text-xs mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{tour.days} {tour.days === 1 ? 'day' : 'days'} tour</span>
                    <span className="mx-2">•</span>
                    <Users className="h-3 w-3 mr-1" />
                    <span>4-6 people</span>
                  </div>
                </div>
              </div>
              
              <div className="p-3">
                <div className="flex flex-wrap gap-2 mb-3">
                  {tour.locations?.slice(0, 3).map((location, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 rounded-full px-2 py-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1 text-blue-500" />
                      {location}
                    </span>
                  ))}
                </div>
                
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{tour.description}</p>
                
                <div className="flex justify-between items-end mt-auto">
                  <div>
                    <span className="text-xs text-gray-500">Starting from</span>
                    <p className="text-lg font-bold text-blue-600">₹{tour.startingPrice}</p>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant={selectedTour === tour.id ? "default" : "outline"}
                    className={cn(
                      "transition-all",
                      selectedTour === tour.id ? "bg-blue-500 hover:bg-blue-600" : ""
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTour(tour.id);
                    }}
                  >
                    {selectedTour === tour.id ? "Selected" : "View Packages"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {selectedTour && packages.length > 0 && (
        <div className="mt-6 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center text-gray-800">
              <Info className="h-4 w-4 mr-2 text-blue-500" />
              Available Packages
            </h3>
            
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-500"
                onClick={() => setSelectedTour(null)}
              >
                View All Tours
              </Button>
            )}
          </div>
          
          {isMobile ? (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <div key={pkg.id} className="border rounded-lg overflow-hidden bg-white">
                  <Accordion type="single" collapsible>
                    <AccordionItem value={pkg.id} className="border-none">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-base">{pkg.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center">
                              <CalendarIcon className="h-3 w-3 mr-1 text-blue-500" />
                              {pkg.days} {pkg.days === 1 ? 'day' : 'days'}
                            </span>
                            <span className="flex items-center">
                              <Car className="h-3 w-3 mr-1 text-blue-500" />
                              {getCabTypeLabel(pkg.cabType)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right pr-2">
                          <span className="text-xs text-gray-500">Price per package</span>
                          <p className="text-lg font-bold text-blue-600">₹{pkg.price}</p>
                        </div>
                      </div>
                      
                      <AccordionTrigger className="py-0 px-3 pb-2 text-xs text-blue-600 hover:no-underline">
                        View details
                      </AccordionTrigger>
                      
                      <AccordionContent className="pt-0 pb-3 px-3">
                        {pkg.description && (
                          <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                        )}
                        
                        {pkg.highlights && (
                          <div className="mb-3">
                            <h5 className="text-xs font-medium mb-2">Package Includes:</h5>
                            <ul className="text-xs space-y-1 text-gray-600">
                              {pkg.highlights.map((highlight, idx) => (
                                <li key={idx} className="flex items-center">
                                  <Check className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <Button 
                          onClick={() => handleSelectPackage(pkg.id)}
                          size="sm"
                          className="w-full mt-2"
                        >
                          Book This Package
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              ))}
            </div>
          ) : (
            <div className={cn(
              "grid gap-3",
              "grid-cols-1 md:grid-cols-2"
            )}>
              {packages.map((pkg) => (
                <div key={pkg.id} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-lg">{pkg.name}</h4>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      {getCabTypeLabel(pkg.cabType)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                  
                  <div className="flex items-center gap-3 mt-3 text-sm text-gray-700">
                    <span className="flex items-center">
                      <CalendarIcon className="h-4 w-4 text-blue-500 mr-1" />
                      {pkg.days} {pkg.days === 1 ? 'day' : 'days'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center">
                      <Users className="h-4 w-4 text-blue-500 mr-1" />
                      4-6 people
                    </span>
                  </div>
                  
                  {pkg.highlights && (
                    <div className="mt-3">
                      <h5 className="text-sm font-medium mb-1">Highlights:</h5>
                      <ul className="text-xs space-y-1 text-gray-600 grid grid-cols-2 gap-x-2">
                        {pkg.highlights.map((highlight, idx) => (
                          <li key={idx} className="flex items-start">
                            <Check className="h-3 w-3 text-green-500 mr-1 flex-shrink-0 mt-0.5" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <div>
                      <span className="text-xs text-gray-500">Package price</span>
                      <p className="text-xl font-bold text-blue-600">₹{pkg.price}</p>
                    </div>
                    
                    <Button 
                      onClick={() => handleSelectPackage(pkg.id)}
                      size="sm"
                      className="flex items-center"
                    >
                      Book Now
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
