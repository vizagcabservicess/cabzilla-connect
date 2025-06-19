
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Car, Users, Fuel, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ImageGallery from '@/components/vehicle/ImageGallery';
import RateCardPanel from '@/components/vehicle/RateCardPanel';
import VehicleTabs from '@/components/vehicle/VehicleTabs';
import FeatureChecklist from '@/components/vehicle/FeatureChecklist';
import RateCard from '@/components/vehicle/RateCard';
import SimilarVehicles from '@/components/vehicle/SimilarVehicles';
import { getVehicleData } from '@/services/vehicleDataService';
import { fareAPI } from '@/services/api/fareAPI';

interface VehicleData {
  id: string;
  name: string;
  capacity: number;
  fuelType?: string;
  images?: string[];
  tags?: string[];
  overview?: string;
  specs?: {
    seatingCapacity?: string;
    fuelType?: string;
    transmission?: string;
    luggage?: string;
    airConditioning?: string;
  };
  inclusions?: string[];
  exclusions?: string[];
  features?: string[];
}

const VehicleDetailPage = () => {
  const { vehicleId } = useParams();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarVehicles, setSimilarVehicles] = useState<any[]>([]);

  useEffect(() => {
    const loadVehicleData = async () => {
      if (!vehicleId) {
        setError('Vehicle ID not provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch all vehicles from vehicle management
        const allVehicles = await getVehicleData(true, true); // Force refresh and include inactive
        
        // Find the specific vehicle
        const foundVehicle = allVehicles.find(v => 
          v.id === vehicleId || 
          v.vehicle_id === vehicleId ||
          v.name?.toLowerCase().replace(/\s+/g, '_') === vehicleId
        );

        if (!foundVehicle) {
          setError(`Vehicle with ID "${vehicleId}" not found`);
          setLoading(false);
          return;
        }

        // Transform the vehicle data to match our interface
        const vehicleData: VehicleData = {
          id: foundVehicle.id || vehicleId,
          name: foundVehicle.name || 'Unknown Vehicle',
          capacity: foundVehicle.capacity || 4,
          fuelType: foundVehicle.fuelType || 'Petrol',
          images: foundVehicle.images || [
            "https://images.unsplash.com/photo-1549399683-cfa5c8b75ee6?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=600&fit=crop"
          ],
          tags: ['Comfort Ride', 'AC', foundVehicle.capacity > 4 ? 'Family Friendly' : 'Compact'],
          overview: foundVehicle.description || `The ${foundVehicle.name} is a reliable vehicle with comfortable seating for ${foundVehicle.capacity} passengers. Perfect for your travel needs with modern amenities and excellent fuel efficiency.`,
          specs: {
            seatingCapacity: `${foundVehicle.capacity} Passengers`,
            fuelType: foundVehicle.fuelType || 'Petrol',
            transmission: 'Manual',
            luggage: `${Math.floor(foundVehicle.capacity / 2)} Medium Bags`,
            airConditioning: foundVehicle.ac ? 'Full AC' : 'Non-AC'
          },
          inclusions: foundVehicle.amenities || [
            'Driver', 'Fuel', foundVehicle.ac ? 'AC' : 'Non-AC', 'Tolls', 'Parking'
          ],
          exclusions: [
            'Personal expenses', 'Extra meals', 'Additional sightseeing', 'Shopping expenses'
          ],
          features: foundVehicle.amenities || [
            foundVehicle.ac ? 'AC' : 'Non-AC', 'Music System', 'Charging Point', 'Water'
          ]
        };

        setVehicle(vehicleData);

        // Get similar vehicles (exclude current vehicle)
        const similar = allVehicles
          .filter(v => v.id !== vehicleId && v.isActive !== false)
          .slice(0, 3)
          .map(v => ({
            id: v.id,
            name: v.name,
            capacity: `${v.capacity} Passengers`,
            price: `₹${v.pricePerKm || 12}/km`,
            image: v.image || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=200&fit=crop"
          }));
        
        setSimilarVehicles(similar);

      } catch (err) {
        console.error('Error loading vehicle data:', err);
        setError('Failed to load vehicle details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadVehicleData();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading vehicle details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
          <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
            <ImageGallery images={vehicle.images || []} vehicleName={vehicle.name} />

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
            <RateCard />

            {/* Similar Vehicles */}
            <SimilarVehicles vehicles={similarVehicles} />
          </div>

          {/* Sidebar - Rate Card Panel */}
          <div className="lg:col-span-1">
            <RateCardPanel vehicleId={vehicle.id} vehicleName={vehicle.name} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;
