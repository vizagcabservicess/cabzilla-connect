import { Car } from 'lucide-react';

export function AxisFloatingBookBar() {
  const scrollToBooking = () => {
    document.getElementById('booking-widget')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="pointer-events-none fixed bottom-8 left-1/2 z-[90] hidden -translate-x-1/2 lg:block">
      <div className="pointer-events-auto flex items-center gap-4 rounded-full border border-gray-200/90 bg-white/95 px-5 py-2.5 shadow-[0_12px_40px_rgba(15,23,42,0.14)] backdrop-blur-sm">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <Car className="h-4 w-4" aria-hidden />
        </span>
        <span className="whitespace-nowrap text-sm font-medium text-gray-800">
          Book your ride instantly
        </span>
        <button
          type="button"
          onClick={scrollToBooking}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Book Now
        </button>
      </div>
    </div>
  );
}
