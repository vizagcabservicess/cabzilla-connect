
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, Users, MapPin } from 'lucide-react';
import { fareAPI } from '@/services/api/fareAPI';

interface RateCardPanelProps {
  vehicleId: string;
  vehicleName?: string;
}

interface VehicleRate {
  tripType: string;
  baseFare: string | number;
  distanceIncluded: string;
  notes: string;
  farePerKm?: number;
  minimumFare?: number;
}

const RateCardPanel: React.FC<RateCardPanelProps> = ({ vehicleId, vehicleName = 'Vehicle' }) => {
  const [rates, setRates] = useState<VehicleRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRate, setSelectedRate] = useState<VehicleRate | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        
        // Fetch vehicle-specific rates from fare management
        const response = await fareAPI.getVehiclePricing();
        
        // Filter rates for this specific vehicle
        const vehicleRates = response.filter((rate: any) => 
          rate.vehicleId === vehicleId || rate.vehicleType === vehicleId
        );

        if (vehicleRates.length > 0) {
          const formattedRates = vehicleRates.map((rate: any) => ({
            tripType: rate.tripType || 'Local',
            baseFare: rate.baseFare || rate.fare || rate.price || 0,
            distanceIncluded: rate.distanceIncluded || rate.minimumDistance || 'Per KM',
            notes: rate.notes || rate.description || 'Standard pricing',
            farePerKm: rate.farePerKm || rate.pricePerKm,
            minimumFare: rate.minimumFare || rate.baseFare
          }));
          setRates(formattedRates);
          setSelectedRate(formattedRates[0]);
        } else {
          // Fallback: Create default rates for the vehicle
          const defaultRates: VehicleRate[] = [
            {
              tripType: "Local Trip",
              baseFare: "₹12/km",
              distanceIncluded: "Min 8 km",
              notes: "AC, Driver, Fuel included"
            },
            {
              tripType: "Outstation",
              baseFare: "₹18/km",
              distanceIncluded: "Min 300 km",
              notes: "AC, Driver, Night charges apply"
            },
            {
              tripType: "Airport Transfer",
              baseFare: "₹15/km",
              distanceIncluded: "One way",
              notes: "AC, Driver, Tolls included"
            }
          ];
          setRates(defaultRates);
          setSelectedRate(defaultRates[0]);
        }
      } catch (error) {
        console.error('Error fetching rates:', error);
        // Set default rates on error
        const defaultRates: VehicleRate[] = [
          {
            tripType: "Local Trip",
            baseFare: "₹12/km",
            distanceIncluded: "Min 8 km", 
            notes: "AC, Driver, Fuel included"
          }
        ];
        setRates(defaultRates);
        setSelectedRate(defaultRates[0]);
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchRates();
    }
  }, [vehicleId]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg">Loading Rates...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full sticky top-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5" />
          {vehicleName} Rates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rate Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Trip Type</label>
          <div className="grid gap-2">
            {rates.map((rate, index) => (
              <div
                key={index}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedRate?.tripType === rate.tripType
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedRate(rate)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{rate.tripType}</span>
                  <Badge variant="outline" className="text-xs">
                    {rate.baseFare}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">{rate.distanceIncluded}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Rate Details */}
        {selectedRate && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Base Fare</span>
              <span className="font-semibold text-blue-600">{selectedRate.baseFare}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Distance</span>
              <span className="text-sm">{selectedRate.distanceIncluded}</span>
            </div>
            
            <div className="text-xs text-gray-600 leading-relaxed">
              {selectedRate.notes}
            </div>
          </div>
        )}

        {/* Book Now Button */}
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3">
          <MapPin className="h-4 w-4 mr-2" />
          Book {vehicleName}
        </Button>
        
        <div className="text-center">
          <p className="text-xs text-gray-500">Instant confirmation • 24/7 support</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RateCardPanel;
