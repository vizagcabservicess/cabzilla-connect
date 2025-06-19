import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchVehicleDetails } from '@/services/api/vehicleAPI';
import ImageGallery from '@/components/vehicle/ImageGallery';
import FareSummary from '@/components/vehicle/FareSummary';
// Placeholder imports for subcomponents
// import VehicleTabs from '@/components/vehicle/VehicleTabs';
// import FeatureChecklist from '@/components/vehicle/FeatureChecklist';
// import RateCard from '@/components/vehicle/RateCard';
// import SimilarVehicles from '@/components/vehicle/SimilarVehicles';

const VehicleDetailPage = () => {
  const { vehicleId } = useParams();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchVehicleDetails(vehicleId as string)
      .then(data => {
        setVehicle(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load vehicle details');
        setLoading(false);
      });
  }, [vehicleId]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!vehicle) return <div className="p-8 text-center">Vehicle not found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Image Gallery */}
      <ImageGallery images={vehicle.images} vehicleName={vehicle.name} />

      {/* Title, tags, icons */}
      <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">{vehicle.name}</h1>
        <div className="flex gap-2 mt-2 md:mt-0">
          {vehicle.tags?.map((tag: string, idx: number) => (
            <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">{tag}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 mb-6 text-gray-600">
        <span>🚗 {vehicle.fuelType}</span>
        <span>👥 {vehicle.capacity} Passengers</span>
      </div>

      {/* Fare Summary */}
      <FareSummary fare={vehicle.fareSummary} />

      {/* Tabs: Overview, Vehicle Specs, Inclusions & Exclusions */}
      {/* <VehicleTabs overview={vehicle.overview} specs={vehicle.specs} inclusions={vehicle.inclusions} /> */}
      <div className="mb-8 bg-white rounded shadow p-6">Tabs Placeholder</div>

      {/* Feature Checklist */}
      {/* <FeatureChecklist features={vehicle.features} /> */}
      <div className="mb-8 bg-white rounded shadow p-6">Feature Checklist Placeholder</div>

      {/* Rate Card */}
      {/* <RateCard rates={vehicle.rateCard} /> */}
      <div className="mb-8 bg-white rounded shadow p-6">Rate Card Placeholder</div>

      {/* Similar Vehicles */}
      {/* <SimilarVehicles vehicles={vehicle.similarVehicles} /> */}
      <div className="mb-8 bg-white rounded shadow p-6">Similar Vehicles Placeholder</div>
    </div>
  );
};

export default VehicleDetailPage; 