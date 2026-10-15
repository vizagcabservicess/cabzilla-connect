import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'vth.tour.cart.v1';

export type TripTour = {
  id: string;
  name: string;
  days?: number;
  image?: string;
  minPrice?: number;
  timeDuration?: string;
};

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export async function readTripCart(): Promise<TripTour[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const rows = JSON.parse(raw) as TripTour[];
    return Array.isArray(rows) ? rows.filter((row) => row?.id && row.name) : [];
  } catch {
    return [];
  }
}

async function writeTripCart(rows: TripTour[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(rows));
  notify();
}

export async function toggleTripTour(tour: TripTour): Promise<TripTour[]> {
  const current = await readTripCart();
  const next = current.some((item) => item.id === tour.id)
    ? current.filter((item) => item.id !== tour.id)
    : [...current, tour];
  await writeTripCart(next);
  return next;
}

export async function removeTripTour(id: string): Promise<TripTour[]> {
  const next = (await readTripCart()).filter((item) => item.id !== id);
  await writeTripCart(next);
  return next;
}

export async function clearTripCart(): Promise<void> {
  await writeTripCart([]);
}

export async function moveTripTour(index: number, to: number): Promise<TripTour[]> {
  const current = await readTripCart();
  if (to < 0 || to >= current.length || index === to) return current;
  const next = [...current];
  const [row] = next.splice(index, 1);
  next.splice(to, 0, row);
  await writeTripCart(next);
  return next;
}

export function tripShareUrl(tours: TripTour[]): string {
  const params = new URLSearchParams();
  params.set('buildTrip', '1');
  if (tours.length > 0) {
    params.set('tours', tours.map((tour) => tour.id).join(','));
    params.set('names', tours.map((tour) => tour.name).join('|'));
  }
  return `https://vizagtaxihub.com/?${params.toString()}`;
}

export function useTripCart(): {
  items: TripTour[];
  toggle: (tour: TripTour) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  move: (index: number, to: number) => Promise<void>;
  has: (id: string) => boolean;
} {
  const [items, setItems] = useState<TripTour[]>([]);
  const reload = useCallback(() => {
    void readTripCart().then(setItems);
  }, []);

  useEffect(() => {
    reload();
    listeners.add(reload);
    return () => {
      listeners.delete(reload);
    };
  }, [reload]);

  const toggle = useCallback(async (tour: TripTour) => {
    const next = await toggleTripTour(tour);
    setItems(next);
  }, []);
  const remove = useCallback(async (id: string) => {
    setItems(await removeTripTour(id));
  }, []);
  const clear = useCallback(async () => {
    await clearTripCart();
    setItems([]);
  }, []);
  const move = useCallback(async (index: number, to: number) => {
    setItems(await moveTripTour(index, to));
  }, []);

  return {
    items,
    toggle,
    remove,
    clear,
    move,
    has: (id: string) => items.some((item) => item.id === id),
  };
}
