
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
  selectedVehicle
}: TourVehicleSelectionProps) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesWithPricing, setVehiclesWithPricing] = useState<VehicleWithPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (vehicles.length > 0 && pricing) {
      const vehiclesWithPrices = vehicles.map(vehicle => {
        const price = pricing[vehicle.vehicle_id] || 0;
        return {
          ...vehicle,
          price
        };
      }).filter(v => v.price > 0);
      
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
      <CardHeader>
        <CardTitle>Select Your Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <svg className="animate-spin h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 017-7.938V4a8 8 0 100 16v-1.062A8.001 8.001 0 014 12z"></path>
            </svg>
          </div>
        ) : (
          <div className="space-y-3">
            {vehiclesWithPricing.length > 0 ? (
              vehiclesWithPricing.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedVehicle?.id === vehicle.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onVehicleSelect(vehicle)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-base md:text-[16px] text-gray-900">{vehicle.name}</h4>
                      <p className="text-xs text-gray-600">{vehicle.capacity} passengers</p>
                      {/* Star rating removed */}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        ₹{vehicle.price.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No vehicles available for this tour
              </div>
            )}
          </div>
        )}
        {/* Book Now button removed from here */}
      </CardContent>
    </Card>
  );
};
