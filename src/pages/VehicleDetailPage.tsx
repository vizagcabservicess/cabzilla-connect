
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchVehicleDetails } from '@/services/api/vehicleAPI';
import { ArrowLeft, Car, Users, Fuel } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ImageGallery from '@/components/vehicle/ImageGallery';
import FareSummary from '@/components/vehicle/FareSummary';
import VehicleTabs from '@/components/vehicle/VehicleTabs';
import FeatureChecklist from '@/components/vehicle/FeatureChecklist';
import RateCard from '@/components/vehicle/RateCard';
import SimilarVehicles from '@/components/vehicle/SimilarVehicles';

const VehicleDetailPage = () => {
  const { vehicleId } = useParams();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration
  const mockVehicle = {
    id: vehicleId,
    name: "Ertiga",
    images: [
      "https://images.unsplash.com/photo-1549399683-cfa5c8b75ee6?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop"
    ],
    tags: ["Comfort Ride", "Family Friendly", "AC"],
    fuelType: "Diesel",
    capacity: 6,
    fareSummary: {
      price: 6500,
      tour: "Arukahdy Tour",
      passengers: 6,
      bags: { large: 2, small: 2 }
    },
    overview: "The Ertiga is a versatile MPV with a spacious interior and comfortable seating for six passengers. It's ideal for families, business trips, or small group tours. The vehicle offers excellent fuel efficiency and a smooth ride experience with full air conditioning to keep you comfortable throughout your journey.",
    specs: {
      seatingCapacity: "6 Passengers",
      fuelType: "Diesel", 
      transmission: "Manual",
      luggage: "3 Medium Bags",
      airConditioning: "Full AC"
    },
    inclusions: [
      "Driver", "Fuel", "AC", "Tolls", "Parking", "Driver Food", "Entry Tickets"
    ],
    exclusions: [
      "Personal expenses", "Extra meals", "Additional sightseeing", "Shopping expenses"
    ],
    features: [
      "AC", "Music System", "Charging Point", "Water", "Bottle Water", 
      "Extra Legroom", "WiFi", "Entertainment System"
    ],
    rateCard: [
      {
        tripType: "City Tour",
        baseFare: "₹12/km",
        distanceIncluded: "Min 80 km",
        notes: "AC Included, Driver, Parking extra"
      },
      {
        tripType: "Outstation", 
        baseFare: "₹18/km",
        distanceIncluded: "Min 300 km",
        notes: "AC Included, Driver, Night charges apply"
      },
      {
        tripType: "Airport Transfer",
        baseFare: "₹15/km", 
        distanceIncluded: "One way",
        notes: "AC Included, Driver, Tolls included"
      },
      {
        tripType: "Araku Tour",
        baseFare: "₹6,500",
        distanceIncluded: "Full day", 
        notes: "AC, Driver, Fuel, Parking included"
      }
    ],
    similarVehicles: [
      {
        id: "honda-amaze",
        name: "Honda Amaze",
        capacity: "4 Passengers",
        price: "₹12/km"
      },
      {
        id: "innova-crysta", 
        name: "Innova Crysta",
        capacity: "7 Passengers",
        price: "₹22/km"
      },
      {
        id: "swift-dzire",
        name: "Swift Dzire", 
        capacity: "4 Passengers",
        price: "₹13/km"
      }
    ]
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Use mock data for now, replace with actual API call when ready
    setTimeout(() => {
      setVehicle(mockVehicle);
      setLoading(false);
    }, 500);
    
    /* 
    fetchVehicleDetails(vehicleId as string)
      .then(data => {
        setVehicle(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load vehicle details');
        setLoading(false);
      });
    */
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading vehicle details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/vehicles" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
        </div>
      </div>
    );
  }
  
  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Vehicle not found</p>
          <Link to="/vehicles" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Back Navigation */}
        <Link 
          to="/vehicles" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vehicles
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <ImageGallery images={vehicle.images} vehicleName={vehicle.name} />

            {/* Vehicle Header */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{vehicle.name}</h1>
                <div className="flex flex-wrap gap-2">
                  {vehicle.tags?.map((tag: string, idx: number) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-gray-600">
                <div className="flex items-center">
                  <Fuel className="h-4 w-4 mr-2" />
                  <span>{vehicle.fuelType}</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{vehicle.capacity} Passengers</span>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <VehicleTabs 
              overview={vehicle.overview} 
              specs={vehicle.specs} 
              inclusions={vehicle.inclusions}
              exclusions={vehicle.exclusions}
            />

            {/* Feature Checklist */}
            <FeatureChecklist features={vehicle.features} />

            {/* Rate Card */}
            <RateCard rates={vehicle.rateCard} />

            {/* Similar Vehicles */}
            <SimilarVehicles vehicles={vehicle.similarVehicles} />
          </div>

          {/* Sidebar - Fare Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <FareSummary fare={vehicle.fareSummary} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;
