import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchLocalFares, fetchAirportFares } from '@/services/fareManagementService';
import { tourAPI } from '@/services/api/tourAPI';
import { getTourUrl } from '@/utils/tourUrlUtils';

interface RateCardProps {
  vehicleId?: string;
  vehicleName?: string;
}

interface FareRow {
  tripType: string;
  baseFare: string;
  distance: string;
  duration: string;
  bookingType?: 'local' | 'airport' | 'outstation' | 'tour';
  tourId?: string;
  tourName?: string;
}

const RateCard: React.FC<RateCardProps> = ({ vehicleId, vehicleName }) => {
  const [fares, setFares] = useState<FareRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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

          // Add local fare (8hrs/80km only - City Tour 4hr/40km removed)
          if (localFares.length > 0 && vehicleId) {
            const localFare = localFares.find(f => f.vehicle_id === vehicleId) || localFares[0];
            const price8hr = localFare?.price_8hrs_80km ?? localFare?.price8hrs80km;
            const extraKm = localFare?.price_extra_km ?? localFare?.priceExtraKm ?? 0;
            const extraHr = localFare?.price_extra_hour ?? localFare?.priceExtraHour ?? 0;
            if (localFare && price8hr && parseFloat(String(price8hr)) > 0) {
              fareRows.push({
                tripType: "Local (8hrs/80km)",
                baseFare: `₹${parseFloat(String(price8hr)).toFixed(0)}`,
                distance: `Extra @ ₹${parseFloat(String(extraKm)).toFixed(0)}/km`,
                duration: `Extra @ ₹${parseFloat(String(extraHr)).toFixed(0)}/hr`,
                bookingType: "local"
              });
            }
          }

          // Fetch outstation rates
          try {
            const outstationResponse = await fetch(`https://www.vizagtaxihub.com/api/admin/vehicle-pricing.php?vehicleId=${vehicleId}&tripType=outstation`);
            if (outstationResponse.ok) {
              const outstationData = await outstationResponse.json();
              if (outstationData.status === 'success' && outstationData.data) {
                const vehicleData = outstationData.data.find((v: any) => v.vehicleId === vehicleId);
                if (vehicleData?.pricing?.outstation?.pricePerKm) {
                  fareRows.push({
                    tripType: "Outstation",
                    baseFare: `₹${vehicleData.pricing.outstation.pricePerKm}/km`,
                    distance: "Min 300 km",
                    duration: "13 hours",
                    bookingType: "outstation"
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
              duration: "N/A",
              bookingType: "airport"
            });
          }
          }

          // Add tour fares with proper duration display
          if (tourFares.length > 0) {
            tourFares.forEach(tour => {
              if (tour.pricing && tour.pricing[vehicleId]) {
                const tourPrice = tour.pricing[vehicleId];
                if (tourPrice > 0) {
                  // Get duration from timeDuration field, fallback to "Full Day"
                  let durationText = 'Full Day';
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
                    duration: durationText,
                    bookingType: "tour",
                    tourId: tour.tourId,
                    tourName: tour.tourName
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
              tripType: "Local (8hrs/80km)",
              baseFare: "₹12/km",
              distance: "Min 80 km",
              duration: "8 hours",
              bookingType: "local"
            },
            {
              tripType: "Outstation",
              baseFare: "₹18/km",
              distance: "Min 300 km",
              duration: "13 hours",
              bookingType: "outstation"
            },
            {
              tripType: "Airport Transfer",
              baseFare: "₹15/km",
              distance: "One way",
              duration: "N/A",
              bookingType: "airport"
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

  const handleRowClick = (fare: FareRow) => {
    if (fare.bookingType === 'tour' && (fare.tourId || fare.tourName)) {
      navigate(getTourUrl({ tourId: fare.tourId, tourName: fare.tourName || fare.tripType }));
    } else if (fare.bookingType === 'outstation') {
      navigate('/outstation-taxi', {
        state: { selectedVehicle: vehicleId, vehicleName }
      });
    } else if (fare.bookingType === 'airport') {
      navigate('/airport-taxi', {
        state: { selectedVehicle: vehicleId, vehicleName }
      });
    } else if (fare.bookingType === 'local') {
      navigate('/local-taxi', {
        state: { selectedVehicle: vehicleId, vehicleName }
      });
    }
  };

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
                <tr
                  key={index}
                  className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => handleRowClick(fare)}
                  role="button"
                  aria-label={`${fare.tripType}: ${fare.baseFare}, ${fare.distance}. Click to book.`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRowClick(fare);
                    }
                  }}
                >
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
