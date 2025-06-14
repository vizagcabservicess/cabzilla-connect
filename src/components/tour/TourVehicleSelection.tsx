import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Star } from 'lucide-react';
import { Vehicle, VehicleWithPricing } from '@/types/vehicle';
import { vehicleAPI } from '@/services/api/vehicleAPI';

interface TourVehicleSelectionProps {
  pricing: { [vehicleId: string]: number };
  onVehicleSelect: (vehicle: VehicleWithPricing) => void;
  selectedVehicle: VehicleWithPricing | null;
  onBookNow?: () => void;
}

export const TourVehicleSelection = ({
  pricing,
  onVehicleSelect,
  selectedVehicle,
  onBookNow
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
      const response = await vehicleAPI.getVehicles();
      setVehicles(response.vehicles || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Select Your Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-2">
            {vehiclesWithPricing.length > 0 ? (
              vehiclesWithPricing.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all
                    text-sm
                    ${selectedVehicle?.id === vehicle.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'}
                  `}
                  onClick={() => onVehicleSelect(vehicle)}
                  title={vehicle.name}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold truncate w-36" style={{ fontSize: '1rem', lineHeight: '1.1' }}>
                        {vehicle.name}
                      </h4>
                      <p className="text-xs text-gray-500">{vehicle.capacity} passengers</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-extrabold text-blue-600">
                        ₹{vehicle.price.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No vehicles available for this tour
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
