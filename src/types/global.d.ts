
interface Window {
  localPackagePriceCache: Record<string, {
    price: number;
    timestamp: number;
  }>;
  dispatchEvent(event: Event): boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
