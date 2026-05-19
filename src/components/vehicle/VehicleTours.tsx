
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { tourAPI } from '@/services/api/tourAPI';

interface VehicleToursProps {
  vehicleId: string;
  vehicleName?: string;
}

interface TourData {
  tourId: string;
  tourName: string;
  distance?: number;
  days?: number;
  description?: string;
  imageUrl?: string;
  pricing: { [vehicleId: string]: number };
  timeDuration?: string;
}

const VehicleTours: React.FC<VehicleToursProps> = ({ vehicleId, vehicleName = 'Vehicle' }) => {
  const [tours, setTours] = useState<TourData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false);
      setTours([]);
      return;
    }

    let cancelled = false;

    const runFetch = async () => {
      try {
        setLoading(true);
        const tourData = await tourAPI.getTourFares();
        if (cancelled) return;
        const vehicleTours = tourData.filter(
          (tour) => tour.pricing && tour.pricing[vehicleId]
        );
        setTours(vehicleTours);
      } catch (error) {
        console.error('Error fetching tours:', error);
        if (!cancelled) setTours([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    /** Defer work until idle so LCP / hydration are less likely to contend with JSON + setState. */
    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? (cb: () => void) =>
            window.requestIdleCallback(() => cb(), { timeout: 2000 })
        : (cb: () => void) => window.setTimeout(cb, 0);

    schedule(() => {
      if (!cancelled) void runFetch();
    });

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  /** Same shell + `grid gap-3` as loaded state so CLS does not spike when data arrives. */
  if (loading) {
    return (
      <Card className="mb-8">
        <CardHeader className="space-y-1 p-4 sm:p-5 pb-3">
          <CardTitle className="text-xl font-semibold">
            Available Tours for {vehicleName}
          </CardTitle>
          <p className="text-sm text-gray-600">Perfect destinations for your {vehicleName}</p>
        </CardHeader>
        <CardContent className="p-0 px-4 pb-4 pt-0 sm:px-5">
          <div className="grid gap-3" aria-busy="true" aria-label="Loading tours">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-h-[14rem] animate-pulse rounded-lg border border-gray-200 p-3 sm:p-4 sm:min-h-[15rem]"
              >
                <div className="mb-2 flex justify-between gap-4">
                  <div className="h-5 flex-1 rounded bg-gray-200" />
                  <div className="h-8 w-24 shrink-0 rounded bg-gray-200" />
                </div>
                <div className="mb-3 space-y-2">
                  <div className="h-3 w-full rounded bg-gray-100" />
                  <div className="h-3 w-[85%] rounded bg-gray-100" />
                </div>
                <div className="mb-3 flex flex-wrap gap-6 border-b border-gray-100 pb-3">
                  <div className="h-4 w-24 rounded bg-gray-100" />
                  <div className="h-4 w-20 rounded bg-gray-100" />
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="h-4 flex-1 rounded bg-gray-100" />
                  <div className="h-9 w-28 shrink-0 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tours.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader className="space-y-1 p-4 sm:p-5">
          <CardTitle className="text-xl font-semibold">Available Tours</CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-4 pb-4 pt-0 sm:px-5">
          <p className="text-gray-600 text-center py-6">
            No tours available for {vehicleName} at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader className="space-y-1 p-4 sm:p-5 pb-3">
        <CardTitle className="text-xl font-semibold">
          Available Tours for {vehicleName}
        </CardTitle>
        <p className="text-sm text-gray-600">Perfect destinations for your {vehicleName}</p>
      </CardHeader>
      <CardContent className="p-0 px-4 pb-4 pt-0 sm:px-5">
        <div className="grid gap-3">
          {tours.map((tour) => (
            <div
              key={tour.tourId}
              className="min-h-[14rem] border border-gray-200 rounded-lg p-3 sm:p-4 sm:min-h-[15rem] hover:shadow-md transition-shadow"
            >
              {/* Title + price: one row so meta stats get full width below */}
              <div className="flex justify-between items-start gap-4 mb-2">
                <h4 className="font-semibold text-gray-900 min-w-0 flex-1 leading-snug pr-2">
                  {tour.tourName}
                </h4>
                <div className="text-right shrink-0">
                  <Badge className="bg-green-100 text-green-800 border-green-200 mb-1">
                    ₹{tour.pricing[vehicleId].toLocaleString()}
                  </Badge>
                  <p className="text-xs text-gray-500">Total package</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {tour.description || `Explore ${tour.tourName} with comfortable ${vehicleName}`}
              </p>

              {/* Distance / days / duration — full width, aligned, no awkward wraps */}
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-600 border-b border-gray-100 pb-3 mb-3">
                {tour.distance != null && tour.distance !== undefined && (
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <MapPin className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    <span className="tabular-nums">{tour.distance} km</span>
                  </span>
                )}
                {tour.days != null && tour.days !== undefined && (
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <Calendar className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    <span className="tabular-nums">
                      {tour.days} day{tour.days > 1 ? 's' : ''}
                    </span>
                  </span>
                )}
                {tour.timeDuration && tour.timeDuration.trim() !== '' && (
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <Clock className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
                    <span>{tour.timeDuration.trim()}</span>
                  </span>
                )}
              </div>

              <div className="flex w-full flex-nowrap items-center justify-between gap-3 pt-2">
                <p className="min-w-0 flex-1 text-sm text-gray-600 pr-2">
                  <span className="font-medium">Includes:</span>{' '}
                  AC, Driver, Fuel, Parking
                </p>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link to={getTourUrl(tour)} className="whitespace-nowrap">
                    View Details
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleTours;
