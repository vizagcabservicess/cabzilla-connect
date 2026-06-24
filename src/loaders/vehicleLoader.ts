import {
  getVehicleData,
  mergeVehicleCatalog,
  resolveVehicleOverviewText,
  tryLoadVehiclesFromPublicJson,
} from '@/services/vehicleDataService';
import { getVehicleImageUrlForDisplay, findVehicleByRouteSlug } from '@/utils/vehicleUrlUtils';

export interface VehicleLoaderData {
  vehicle: {
    id: string;
    name: string;
    capacity: number;
    pricePerKm?: number;
    fuelType?: string;
    image?: string;
    tags: string[];
    overview?: string;
    inclusions?: string[];
    exclusions?: string[];
    features?: string[];
  };
  similarVehicles: Array<{
    id: string;
    name: string;
    capacity: string;
    price: string;
    image: string;
  }>;
}

export async function vehicleLoader({
  params,
}: {
  params: { vehicleSlug?: string };
}): Promise<VehicleLoaderData | { error: string }> {
  const vehicleSlug = params.vehicleSlug;
  if (!vehicleSlug) {
    return { error: 'Vehicle not provided' };
  }

  try {
    // API/admin DB is source of truth for description; JSON is fallback for missing fleet rows.
    const apiVehicles = await getVehicleData(true, false);
    const jsonVehicles = await tryLoadVehiclesFromPublicJson();
    const allVehicles =
      jsonVehicles && jsonVehicles.length > 0
        ? mergeVehicleCatalog(apiVehicles, jsonVehicles)
        : apiVehicles;

    const foundVehicle = findVehicleByRouteSlug(allVehicles, vehicleSlug);

    if (!foundVehicle) {
      return { error: `Vehicle "${vehicleSlug}" not found` };
    }

    const overviewText = resolveVehicleOverviewText(foundVehicle);

    const vehicle = {
      id: foundVehicle.id || vehicleSlug,
      name: foundVehicle.name,
      capacity: foundVehicle.capacity,
      pricePerKm: foundVehicle.pricePerKm,
      fuelType: foundVehicle.fuelType,
      image: getVehicleImageUrlForDisplay(foundVehicle),
      overview: overviewText,
      tags: [
        'Comfort Ride',
        foundVehicle.ac ? 'AC' : 'Non-AC',
        foundVehicle.capacity > 4 ? 'Family Friendly' : 'Compact',
      ],
      inclusions:
        foundVehicle.inclusions ||
        foundVehicle.amenities ||
        ['Driver', 'Fuel', foundVehicle.ac ? 'AC' : 'Non-AC', 'Tolls', 'Parking'],
      exclusions:
        foundVehicle.exclusions || [
          'Personal expenses',
          'Extra meals',
          'Additional sightseeing',
          'Shopping expenses',
        ],
      features: foundVehicle.amenities || [
        foundVehicle.ac ? 'AC' : 'Non-AC',
        'Music System',
        'Charging Point',
      ],
    };

    const similarVehicles = allVehicles
      .filter((v) => v.id !== foundVehicle.id && v.isActive !== false)
      .slice(0, 3)
      .map((v) => ({
        id: v.id,
        name: v.name,
        capacity: `${v.capacity} Passengers`,
        price: `₹${v.pricePerKm || 12}/km`,
        image: getVehicleImageUrlForDisplay(v),
      }));

    return { vehicle, similarVehicles };
  } catch (err) {
    console.error('Vehicle loader error:', err);
    return { error: 'Failed to load vehicle details' };
  }
}
