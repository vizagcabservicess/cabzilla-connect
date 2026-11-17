import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTourUrl } from '@/utils/tourUrlUtils';
import { tourAPI } from '@/services/api/tourAPI';
import {
  getFleetFareLookupIds,
  pickFleetPricingAmount,
} from '@/utils/vehicleUrlUtils';

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

type TourWithPrice = TourData & { displayPrice: number };

function tourTypeLabel(tourName: string): string {
  const name = tourName.toLowerCase();
  if (name.includes('araku') || name.includes('lambasingi') || name.includes('vanajangi')) return 'HILL STATION';
  if (name.includes('borra') || name.includes('cave')) return 'ADVENTURE';
  if (name.includes('temple') || name.includes('simhachalam') || name.includes('annavaram') || name.includes('arasavalli')) return 'PILGRIMAGE';
  if (name.includes('beach') || name.includes('rushikonda')) return 'BEACH';
  return 'TOUR';
}

const VehicleTours: React.FC<VehicleToursProps> = ({ vehicleId, vehicleName = 'Vehicle' }) => {
  const [tours, setTours] = useState<TourWithPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false);
      setTours([]);
      return;
    }

    let cancelled = false;
    const fareLookupIds = getFleetFareLookupIds(vehicleId, vehicleName);

    const runFetch = async () => {
      try {
        setLoading(true);
        const tourData = await tourAPI.getTourFares();
        if (cancelled) return;
        const vehicleTours = tourData
          .map((tour) => {
            const displayPrice = pickFleetPricingAmount(tour.pricing, fareLookupIds);
            if (!displayPrice) return null;
            return { ...tour, displayPrice };
          })
          .filter((tour): tour is TourWithPrice => tour !== null);
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
  }, [vehicleId, vehicleName]);

  if (loading) {
    return (
      <section className="mb-8">
        <div className="mb-3 h-6 w-56 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      </section>
    );
  }

  if (tours.length === 0) {
    return null;
  }

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900">Tours by {vehicleName}</h2>
        <p className="text-xs text-slate-500">Sightseeing from Visakhapatnam. Price is the {vehicleName} fare.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {tours.map((tour) => {
          const days = tour.days != null ? `${tour.days} ${tour.days === 1 ? 'day' : 'days'}` : '';
          const distance = tour.distance != null ? `${tour.distance} km` : '';
          const meta = [days, distance].filter(Boolean).join(' · ');
          return (
            <Link
              key={tour.tourId}
              to={getTourUrl(tour)}
              className="group relative block h-72 overflow-hidden rounded-2xl shadow-[0_12px_30px_-18px_rgba(15,23,42,0.45)]"
            >
              <img
                src={tour.imageUrl || `/tours/${tour.tourId}.jpg`}
                alt={tour.tourName}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop';
                }}
              />
              <span className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.72)_46%,transparent)] px-3 pb-3 pt-16 text-white">
                <span className="flex items-center gap-1 text-[11px] text-white/80">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {tourTypeLabel(tour.tourName)}
                </span>
                <span className="mt-1 flex items-end justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-snug">{tour.tourName}</span>
                    {meta ? <span className="mt-0.5 block text-[11px] text-white/75">{meta}</span> : null}
                  </span>
                  <span className="shrink-0 text-lg font-bold">₹{tour.displayPrice.toLocaleString('en-IN')}</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default VehicleTours;
