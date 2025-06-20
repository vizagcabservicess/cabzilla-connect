import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { fetchLocalFares, fetchAirportFares } from '@/services/fareManagementService';
import { tourAPI } from '@/services/api/tourAPI';

interface RateCardProps {
  vehicleId?: string;
}

interface FareRow {
  tripType: string;
  baseFare: string;
  distance: string;
  duration: string;
}

const RateCard: React.FC<RateCardProps> = ({ vehicleId }) => {
  const [fares, setFares] = useState<FareRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllFares = async () => {
      try {
        setLoading(true);
        const fareRows: FareRow[] = [];

        if (vehicleId) {
          // Fetch vehicle-specific fares
          const [localFares, airportFares, tourFares] = await Promise.all([
            fetchLocalFares(vehicleId).catch(() => []),
            fetchAirportFares(vehicleId).catch(() => []),
            tourAPI.getTourFares().catch(() => [])
          ]);

          // DEBUGGING: Log the received data
          console.log('Fetched localFares:', JSON.stringify(localFares, null, 2));
          console.log('Fetched tourFares:', JSON.stringify(tourFares, null, 2));

          // Add local fares
          if (localFares.length > 0 && vehicleId) {
            const localFare = localFares.find(f => f.vehicle_id === vehicleId);
            if (localFare && localFare.price_4hrs_40km && parseFloat(localFare.price_4hrs_40km) > 0) {
              fareRows.push({
                tripType: "City Tour (4hr/40km)",
                baseFare: `₹${parseFloat(localFare.price_4hrs_40km).toFixed(0)}`,
                distance: `Extra @ ₹${parseFloat(localFare.price_extra_km).toFixed(0)}/km`,
                duration: `Extra @ ₹${parseFloat(localFare.price_extra_hour).toFixed(0)}/hr`
              });
            }
            if (localFare && localFare.price_8hrs_80km && parseFloat(localFare.price_8hrs_80km) > 0) {
              fareRows.push({
                tripType: "City Tour (8hr/80km)",
                baseFare: `₹${parseFloat(localFare.price_8hrs_80km).toFixed(0)}`,
                distance: `Extra @ ₹${parseFloat(localFare.price_extra_km).toFixed(0)}/km`,
                duration: `Extra @ ₹${parseFloat(localFare.price_extra_hour).toFixed(0)}/hr`
              });
            }
          }

          // Fetch outstation rates
          try {
            const outstationResponse = await fetch(`https://www.vizagup.com/api/admin/vehicle-pricing.php?vehicleId=${vehicleId}&tripType=outstation`);
            if (outstationResponse.ok) {
              const outstationData = await outstationResponse.json();
              if (outstationData.status === 'success' && outstationData.data) {
                const vehicleData = outstationData.data.find((v: any) => v.vehicleId === vehicleId);
                if (vehicleData?.pricing?.outstation?.pricePerKm) {
                  fareRows.push({
                    tripType: "Outstation",
                    baseFare: `₹${vehicleData.pricing.outstation.pricePerKm}/km`,
                    distance: "Min 300 km",
                    duration: "Per Day"
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error fetching outstation fares:', error);
          }

          // Add airport fares
          if (airportFares.length > 0) {
            const airportFare = airportFares[0];
            const airportPrice = airportFare.basePrice || airportFare.pickupPrice || airportFare.tier1Price;
            if (airportPrice && airportPrice > 0) {
              fareRows.push({
                tripType: "Airport Transfer",
                baseFare: `₹${airportPrice}`,
                distance: "One way",
                duration: "N/A"
              });
            }
          }

          // Add tour fares
          if (tourFares.length > 0) {
            tourFares.forEach(tour => {
              if (tour.pricing && tour.pricing[vehicleId]) {
                const tourPrice = tour.pricing[vehicleId];
                if (tourPrice > 0) {
                  let durationText = 'N/A';
                  if (tour.timeDuration && tour.timeDuration.trim().length > 0) {
                    durationText = tour.timeDuration.trim();
                  } else if (tour.days && tour.days > 0) {
                    durationText = tour.days === 1 ? 'Full Day' : `${tour.days} Days`;
                  }
                  
                  let distanceText = tour.distance ? `${tour.distance} km` : 'N/A';
                  
                  fareRows.push({
                    tripType: tour.tourName,
                    baseFare: `₹${tourPrice}`,
                    distance: distanceText,
                    duration: durationText
                  });
                }
              }
            });
          }
        }

        // Fallback data if no vehicle ID or no fares found
        if (fareRows.length === 0) {
          fareRows.push(
            {
              tripType: "City Tour",
              baseFare: "₹12/km",
              distance: "Min 80 km",
              duration: "4 hours"
            },
            {
              tripType: "Outstation",
              baseFare: "₹18/km",
              distance: "Min 300 km",
              duration: "Per Day"
            },
            {
              tripType: "Airport Transfer",
              baseFare: "₹15/km",
              distance: "One way",
              duration: "N/A"
            }
          );
        }

        setFares(fareRows);
      } catch (error) {
        console.error('Error fetching fares:', error);
        // Set fallback fares on error
        setFares([
          {
            tripType: "Contact for Rates",
            baseFare: "Call for pricing",
            distance: "Varies",
            duration: "Contact us for current rates"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllFares();
  }, [vehicleId]);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Rate Card...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Rate Card</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-gray-700">Trip Type</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Base Fare</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Distance</th>
                <th className="text-left py-3 px-2 font-medium text-gray-700">Duration</th>
              </tr>
            </thead>
            <tbody>
              {fares.map((fare, index) => (
                <tr key={index} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{fare.tripType}</td>
                  <td className="py-3 px-2 text-blue-600 font-semibold">{fare.baseFare}</td>
                  <td className="py-3 px-2 text-gray-600">{fare.distance}</td>
                  <td className="py-3 px-2 text-gray-600">{fare.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RateCard;
