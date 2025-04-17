
interface PackagePriceCache {
  price: number;
  timestamp: number;
}

interface Window {
  localPackagePriceCache: Record<string, PackagePriceCache>;
  dispatchEvent(event: Event): boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
