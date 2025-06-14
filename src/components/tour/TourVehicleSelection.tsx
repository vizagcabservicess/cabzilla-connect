
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Vehicle, VehicleWithPricing } from '@/types/vehicle';

interface TourVehicleSelectionProps {
  pricing: { [vehicleId: string]: number };
  onVehicleSelect: (vehicle: VehicleWithPricing) => void;
  selectedVehicle: VehicleWithPricing | null;
  onBookNow: () => void;
}

export const TourVehicleSelection = ({
  pricing,
  onVehicleSelect,
  selectedVehicle,
}: TourVehicleSelectionProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesWithPricing, setVehiclesWithPricing] = useState<VehicleWithPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    // Only filter out vehicles with no price
    if (vehicles.length > 0 && pricing) {
      const vehiclesWithPrices = vehicles
        .map((vehicle) => {
          const price = pricing[vehicle.vehicle_id] || 0;
          return {
            ...vehicle,
            price,
          };
        })
        .filter((v) => v.price > 0);

      setVehiclesWithPricing(vehiclesWithPrices);
      setIsLoading(false);
    }
  }, [vehicles, pricing]);

  const loadVehicles = async () => {
    try {
      // @ts-ignore
      const { vehicleAPI } = await import('@/services/api/vehicleAPI');
      const response = await vehicleAPI.getVehicles();
      setVehicles(response.vehicles || []);
    } catch (error) {
      setVehicles([]);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base md:text-[16px]">Select Your Vehicle</CardTitle>
      </CardHeader>
      <CardContent className="px-3 py-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 017-7.938V4a8 8 0 100 16v-1.062A8.001 8.001 0 014 12z"></path>
            </svg>
          </div>
        ) : (
          <div className="space-y-2">
            {vehiclesWithPricing.length > 0 ? (
              vehiclesWithPricing.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className={`border rounded-md px-3 py-2 cursor-pointer transition-all text-sm ${
                    selectedVehicle?.id === vehicle.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={vehicle.name}
                  onClick={() => onVehicleSelect(vehicle)}
                >
                  <div className="flex justify-between items-center">
                    <div className="truncate max-w-[12rem]">
                      <h4 className="font-semibold text-xs md:text-sm text-gray-900 truncate">
                        {vehicle.name}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {vehicle.capacity} passengers
                      </p>
                    </div>
                    <div className="text-right pl-4">
                      <div className="text-[15px] font-bold text-blue-600">
                        ₹{vehicle.price.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[11px] text-gray-500">Total</div>
                    </div>
                  </div>
                  {/* Star rating removed per user */}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-xs">
                No vehicles available for this tour
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
