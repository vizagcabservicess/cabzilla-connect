import { getVehicleData } from '@/services/vehicleDataService';
import { getVehicleUrl, getVehicleImageUrl } from '@/utils/vehicleUrlUtils';

export interface VehicleLoaderData {
  vehicle: {
    id: string;
    name: string;
    capacity: number;
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
    const allVehicles = await getVehicleData(false, false);
    const foundVehicle = allVehicles.find((v) => {
      const vehicleUrl = getVehicleUrl(v);
      const urlSlug = vehicleUrl.replace('/vehicle/', '');
      return urlSlug === vehicleSlug;
    });

    if (!foundVehicle) {
      return { error: `Vehicle "${vehicleSlug}" not found` };
    }

    const vehicle = {
      id: foundVehicle.id || vehicleSlug,
      name: foundVehicle.name,
      capacity: foundVehicle.capacity,
      fuelType: foundVehicle.fuelType,
      image: getVehicleImageUrl(foundVehicle) || foundVehicle.image,
      tags: [
        'Comfort Ride',
        foundVehicle.ac ? 'AC' : 'Non-AC',
        foundVehicle.capacity > 4 ? 'Family Friendly' : 'Compact',
      ],
      overview: foundVehicle.description,
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
        image: getVehicleImageUrl(v) || 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=300&h=200&fit=crop',
      }));

    return { vehicle, similarVehicles };
  } catch (err) {
    console.error('Vehicle loader error:', err);
    return { error: 'Failed to load vehicle details' };
  }
}
