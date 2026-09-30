
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CabType } from '@/types/cab';
import { getVehicleData } from '@/services/vehicleDataService';
import { combinedTourPriceForVehicle, tourPriceForVehicle } from '@/lib/tourVehiclePrice';
import { vehicleMatchesPreferred } from '@/lib/addTourToBookingWidget';

interface VehicleWithPricing extends CabType {
  price: number;
}

interface TourVehicleSelectionProps {
  pricing: { [vehicleId: string]: number };
  onVehicleSelect: (vehicle: VehicleWithPricing) => void;
  selectedVehicle: VehicleWithPricing | null;
  onBookNow: () => void;
  tourDate?: Date; // Add tour date prop
  /** When set, list prices stay as the combined fare for these tours. */
  combinePricingFrom?: Array<{ pricing?: Record<string, number> }>;
}

export const TourVehicleSelection = ({
  pricing,
  onVehicleSelect,
  selectedVehicle,
  tourDate,
  combinePricingFrom,
}: TourVehicleSelectionProps) => {
  const [vehicles, setVehicles] = useState<CabType[]>([]);
  const [vehiclesWithPricing, setVehiclesWithPricing] = useState<VehicleWithPricing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (vehicles.length === 0) return;
    const priceSources =
      combinePricingFrom && combinePricingFrom.length > 0
        ? combinePricingFrom
        : [{ pricing }];
    const useCombined = priceSources.length > 1;

    const vehiclesWithPrices = vehicles
      .map((vehicle) => {
        const price = useCombined
          ? combinedTourPriceForVehicle(priceSources, vehicle)
          : tourPriceForVehicle(pricing, vehicle);
        return {
          ...vehicle,
          price,
        };
      })
      .filter((v) => {
        if (v.price <= 0) return false;

        if (tourDate && v.inactiveDates && Array.isArray(v.inactiveDates)) {
          const local = new Date(tourDate);
          const tourDateStr = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;

          for (const inactiveRange of v.inactiveDates) {
            if (inactiveRange.from && inactiveRange.to) {
              const fromDate = new Date(inactiveRange.from).toISOString().split('T')[0];
              const toDate = new Date(inactiveRange.to).toISOString().split('T')[0];

              if (tourDateStr >= fromDate && tourDateStr <= toDate) {
                return false;
              }
            }
          }
        }

        return true;
      });

    setVehiclesWithPricing(vehiclesWithPrices);
    setIsLoading(false);
  }, [vehicles, pricing, combinePricingFrom, tourDate]);

  const loadVehicles = async () => {
    try {
      // Use the proper vehicle data service that includes inactive dates
      const allVehicles = await getVehicleData(false, false); // Don't include inactive vehicles, don't force refresh
      setVehicles(allVehicles || []);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      setVehicles([]);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-semibold">Select vehicle</CardTitle>
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
              vehiclesWithPricing.map((vehicle) => {
                const isSelected = Boolean(
                  selectedVehicle &&
                    vehicleMatchesPreferred(vehicle, {
                      id: selectedVehicle.id || selectedVehicle.vehicleId || selectedVehicle.name,
                      name: selectedVehicle.name,
                    })
                );
                return (
                <div
                  key={vehicle.id}
                  className={`border rounded-md px-3 py-2 cursor-pointer transition-all text-sm ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={vehicle.name}
                  onMouseDown={(event) => event.preventDefault()}
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
                      <div className="text-[11px] text-gray-500">
                        {combinePricingFrom && combinePricingFrom.length > 1 ? 'Combined' : 'Total'}
                      </div>
                    </div>
                  </div>
                  {/* Star rating removed per user */}
                </div>
                );
              })
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
