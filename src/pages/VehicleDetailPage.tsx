import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Car, Users, Fuel, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ImageGallery from '@/components/vehicle/ImageGallery';
import RateCardPanel from '@/components/vehicle/RateCardPanel';
import VehicleTabs from '@/components/vehicle/VehicleTabs';
import RateCard from '@/components/vehicle/RateCard';
import SimilarVehicles from '@/components/vehicle/SimilarVehicles';
import VehicleTours from '@/components/vehicle/VehicleTours';
import { getVehicleData } from '@/services/vehicleDataService';
import { GalleryItem } from '@/types/cab';
import { vehicleGalleryAPI } from '@/services/api/vehicleGalleryAPI';

interface VehicleData {
  id: string;
  name: string;
  capacity: number;
  fuelType?: string;
  gallery?: GalleryItem[];
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
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);

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

        const allVehicles = await getVehicleData(true, true);
        
        const foundVehicle = allVehicles.find(v => 
          v.id === vehicleId || 
          v.vehicleId === vehicleId ||
          v.name?.toLowerCase().replace(/\s+/g, '_') === vehicleId
        );

        if (!foundVehicle) {
          setError(`Vehicle with ID "${vehicleId}" not found`);
          setLoading(false);
          return;
        }

        const vehicleData: VehicleData = {
          id: foundVehicle.id || vehicleId,
          name: foundVehicle.name,
          capacity: foundVehicle.capacity,
          fuelType: foundVehicle.fuelType,
          tags: ['Comfort Ride', foundVehicle.ac ? 'AC' : 'Non-AC', foundVehicle.capacity > 4 ? 'Family Friendly' : 'Compact'],
          overview: foundVehicle.description,
          inclusions: foundVehicle.inclusions || foundVehicle.amenities || ['Driver', 'Fuel', foundVehicle.ac ? 'AC' : 'Non-AC', 'Tolls', 'Parking'],
          exclusions: foundVehicle.exclusions || ['Personal expenses', 'Extra meals', 'Additional sightseeing', 'Shopping expenses'],
          features: foundVehicle.amenities || [foundVehicle.ac ? 'AC' : 'Non-AC', 'Music System', 'Charging Point', 'Water']
        };

        setVehicle(vehicleData);

        // Load gallery images from database
        const gallery = await vehicleGalleryAPI.getGallery(vehicleData.id);
        console.log('Loaded gallery for vehicle details:', gallery);
        
        // If no gallery images found, use the main vehicle image as fallback
        if (gallery.length === 0 && foundVehicle.image) {
          setGalleryImages([{ url: foundVehicle.image, alt: foundVehicle.name }]);
        } else {
          setGalleryImages(gallery);
        }

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
          <Link to="/" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
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
          <Link to="/" className="text-blue-600 hover:underline">← Back to Vehicles</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Link 
          to="/" 
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Vehicles
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ImageGallery images={galleryImages} vehicleName={vehicle.name} />

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{vehicle.name}</h1>
                  
                  {/* Vehicle Tags displayed prominently next to vehicle name */}
                  {vehicle.tags && vehicle.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {vehicle.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} className="bg-blue-100 text-blue-800 border-blue-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
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

            <VehicleTabs 
              overview={vehicle.overview} 
              inclusions={vehicle.inclusions}
              exclusions={vehicle.exclusions}
              features={vehicle.features}
              tags={[]} // Empty array since tags are now displayed at the top
            />

            <RateCard vehicleId={vehicle.id} />

            <VehicleTours vehicleId={vehicle.id} vehicleName={vehicle.name} />

            <SimilarVehicles vehicles={similarVehicles} />
          </div>

          <div className="lg:col-span-1">
            <RateCardPanel vehicleId={vehicle.id} vehicleName={vehicle.name} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailPage;
