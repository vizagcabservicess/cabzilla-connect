
interface Window {
  localPackagePriceCache?: Record<string, {
    price: number;
    timestamp: number;
    isFallback?: boolean;
    source?: string;
    error?: string;
  }>;
}
