
export interface HourlyPackage {
  id: string;
  name: string;
  hours: number;
  kilometers: number;
  basePrice: number;
}

export const hourlyPackages: HourlyPackage[] = [
  {
    id: '8hrs-80km',
    name: '8 Hours, 80 KM',
    hours: 8,
    kilometers: 80,
    basePrice: 1500
  },
  {
    id: '10hrs-100km',
    name: '10 Hours, 100 KM',
    hours: 10,
    kilometers: 100,
    basePrice: 1800
  }
];

export const hourlyPackageOptions = [
  { value: '8hrs-80km', label: '8 Hours, 80 KM' },
  { value: '10hrs-100km', label: '10 Hours, 100 KM' }
];

export function getLocalPackagePrice(packageId: string, cabType: string): number {
  const packageRates: Record<string, Record<string, number>> = {
    'sedan': {
      '8hrs-80km': 1200,
      '10hrs-100km': 1500
    },
    'ertiga': {
      '8hrs-80km': 1800,
      '10hrs-100km': 2100
    },
    'innova crysta': {
      '8hrs-80km': 2200,
      '10hrs-100km': 2500
    }
  };
  
  // Default to sedan if cab type is not found
  const ratesForCab = packageRates[cabType.toLowerCase()] || packageRates['sedan'];
  
  // Default to 8hrs-80km if package is not found
  return ratesForCab[packageId] || ratesForCab['8hrs-80km'];
}
