
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Car, MapPin, Loader2 } from 'lucide-react';
import { fetchLocalFares, fetchAirportFares } from '@/services/fareManagementService';
import { tourAPI } from '@/services/api/tourAPI';

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
}

const RateCardPanel: React.FC<RateCardPanelProps> = ({ vehicleId, vehicleName = 'Vehicle' }) => {
  const [rates, setRates] = useState<VehicleRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRate, setSelectedRate] = useState<VehicleRate | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        setLoading(true);
        
        const [localFares, airportFares, tourFares] = await Promise.all([
          fetchLocalFares(vehicleId).catch(() => []),
          fetchAirportFares(vehicleId).catch(() => []),
          tourAPI.getTourFares().catch(() => [])
        ]);

        const formattedRates: VehicleRate[] = [];

        // Add local package rates
        if (localFares.length > 0) {
          const localFare = localFares[0];
          if (localFare.price4hrs40km) {
            formattedRates.push({
              tripType: "Local (4hrs/40km)",
              baseFare: `₹${localFare.price4hrs40km}`,
              distanceIncluded: "40 km included",
              notes: "AC, Driver, Fuel included"
            });
          }
          if (localFare.price8hrs80km) {
            formattedRates.push({
              tripType: "Local (8hrs/80km)",
              baseFare: `₹${localFare.price8hrs80km}`,
              distanceIncluded: "80 km included",
              notes: "AC, Driver, Fuel included"
            });
          }
          if (localFare.pricePerKm) {
            formattedRates.push({
              tripType: "Outstation",
              baseFare: `₹${localFare.pricePerKm}/km`,
              distanceIncluded: "Per km basis",
              notes: "AC, Driver, Night charges apply"
            });
          }
        }

        // Add airport rates
        if (airportFares.length > 0) {
          const airportFare = airportFares[0];
          formattedRates.push({
            tripType: "Airport Transfer",
            baseFare: `₹${airportFare.basePrice || airportFare.pickupPrice || 800}`,
            distanceIncluded: "One way",
            notes: "AC, Driver, Tolls included"
          });
        }

        // Add tour rates for this vehicle
        tourFares.forEach(tour => {
          if (tour.pricing && tour.pricing[vehicleId]) {
            formattedRates.push({
              tripType: tour.tourName,
              baseFare: `₹${tour.pricing[vehicleId]}`,
              distanceIncluded: `${tour.distance || 120} km`,
              notes: `${tour.days || 1} day tour - AC, Driver, Fuel included`
            });
          }
        });

        // Fallback rates if no data found
        if (formattedRates.length === 0) {
          formattedRates.push(
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
              baseFare: "₹800",
              distanceIncluded: "One way",
              notes: "AC, Driver, Tolls included"
            }
          );
        }

        setRates(formattedRates);
        setSelectedRate(formattedRates[0]);
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Rates...
          </CardTitle>
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
