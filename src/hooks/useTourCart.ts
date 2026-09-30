import { useCallback, useEffect, useState } from 'react';
import {
  readTourCart,
  tourCartHas,
  VTH_ADD_TOUR_TO_WIDGET_EVENT,
  VTH_TOUR_CART_CHANGED_EVENT,
  type TourCartChangedDetail,
  type TourWidgetAddPayload,
} from '@/lib/addTourToBookingWidget';

export function useTourCart() {
  const [items, setItems] = useState<TourWidgetAddPayload[]>(() => readTourCart());

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = (event as CustomEvent<TourCartChangedDetail> | undefined)?.detail;
      if (detail && Array.isArray(detail.items)) {
        setItems(detail.items);
        return;
      }
      setItems(readTourCart());
    };
    window.addEventListener(VTH_TOUR_CART_CHANGED_EVENT, sync);
    window.addEventListener(VTH_ADD_TOUR_TO_WIDGET_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(VTH_TOUR_CART_CHANGED_EVENT, sync);
      window.removeEventListener(VTH_ADD_TOUR_TO_WIDGET_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const has = useCallback(
    (tourId: string, tourName?: string) => tourCartHas(tourId, items, tourName),
    [items]
  );

  return { items, has };
}
