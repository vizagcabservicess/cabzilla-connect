
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
        console.log(`Fetching rates for vehicle: ${vehicleId}`);
        
        const [localFares, airportFares, tourFares] = await Promise.all([
          fetchLocalFares(vehicleId).catch((err) => {
            console.error('Local fares fetch failed:', err);
            return [];
          }),
          fetchAirportFares(vehicleId).catch((err) => {
            console.error('Airport fares fetch failed:', err);
            return [];
          }),
          tourAPI.getTourFares().catch((err) => {
            console.error('Tour fares fetch failed:', err);
            return [];
          })
        ]);

        console.log('Fetched data:', { localFares, airportFares, tourFares });

        const formattedRates: VehicleRate[] = [];

        // Add local package rates
        if (localFares.length > 0) {
          const localFare = localFares[0];
          console.log('Processing local fare:', localFare);
          
          if (localFare.price4hrs40km && localFare.price4hrs40km > 0) {
            formattedRates.push({
              tripType: "City Tour",
              baseFare: `₹${localFare.price4hrs40km}`,
              distanceIncluded: "4hrs/40km",
              notes: "AC, Driver, Fuel, Parking extra"
            });
          }
          
          if (localFare.price8hrs80km && localFare.price8hrs80km > 0) {
            formattedRates.push({
              tripType: "Local (8hrs/80km)",
              baseFare: `₹${localFare.price8hrs80km}`,
              distanceIncluded: "8hrs/80km",
              notes: "AC, Driver, Fuel included"
            });
          }
          
          if (localFare.pricePerKm && localFare.pricePerKm > 0) {
            formattedRates.push({
              tripType: "Local Per KM",
              baseFare: `₹${localFare.pricePerKm}/km`,
              distanceIncluded: "Min 80 km",
              notes: "AC Included, Driver, Parking extra"
            });
          }
        }

        // Add outstation rates - fetch from the pricing API
        try {
          const outstationResponse = await fetch(`https://www.vizagup.com/api/admin/vehicle-pricing.php?vehicleId=${vehicleId}&tripType=outstation`);
          if (outstationResponse.ok) {
            const outstationData = await outstationResponse.json();
            console.log('Outstation data:', outstationData);
            
            if (outstationData.status === 'success' && outstationData.data) {
              const vehicleData = outstationData.data.find((v: any) => v.vehicleId === vehicleId);
              if (vehicleData?.pricing?.outstation) {
                const outstation = vehicleData.pricing.outstation;
                if (outstation.pricePerKm && outstation.pricePerKm > 0) {
                  formattedRates.push({
                    tripType: "Outstation",
                    baseFare: `₹${outstation.pricePerKm}/km`,
                    distanceIncluded: "Min 300 km",
                    notes: "AC Included, Driver, Night charges apply"
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching outstation fares:', error);
        }

        // Add airport rates with proper vehicle-specific data
        if (airportFares.length > 0) {
          const airportFare = airportFares[0];
          console.log('Processing airport fare:', airportFare);
          
          const airportPrice = airportFare.basePrice || airportFare.pickupPrice || airportFare.tier1Price || 0;
          if (airportPrice > 0) {
            formattedRates.push({
              tripType: "Airport Transfer",
              baseFare: `₹${airportPrice}`,
              distanceIncluded: "One way",
              notes: "AC Included, Driver, Tolls included"
            });
          }
        }

        // Add tour rates for this vehicle
        if (tourFares.length > 0) {
          console.log('Processing tour fares:', tourFares);
          
          tourFares.forEach(tour => {
            if (tour.pricing && tour.pricing[vehicleId]) {
              const tourPrice = tour.pricing[vehicleId];
              if (tourPrice > 0) {
                formattedRates.push({
                  tripType: tour.tourName,
                  baseFare: `₹${tourPrice}`,
                  distanceIncluded: `${tour.distance || 260} km`,
                  notes: `Full day - AC, Driver, Fuel, Parking included`
                });
              }
            }
          });
        }

        console.log('Final formatted rates:', formattedRates);

        // Only add fallback if we have no rates at all
        if (formattedRates.length === 0) {
          console.log('No rates found, using fallback');
          formattedRates.push({
            tripType: "Standard Rate",
            baseFare: "₹12/km",
            distanceIncluded: "Min 8 km",
            notes: "AC, Driver, Fuel included"
          });
        }

        setRates(formattedRates);
        setSelectedRate(formattedRates[0]);
      } catch (error) {
        console.error('Error fetching rates:', error);
        // Set minimal fallback only on error
        const fallbackRates: VehicleRate[] = [{
          tripType: "Contact for Rates",
          baseFare: "Call for pricing",
          distanceIncluded: "Varies",
          notes: "Contact us for current rates"
        }];
        setRates(fallbackRates);
        setSelectedRate(fallbackRates[0]);
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
