import { useSyncExternalStore } from 'react';
import { TripPlan } from '../types/trip';

let current: TripPlan | null = null;
const listeners = new Set<() => void>();

export function setTripPlan(next: TripPlan) {
  current = next;
  listeners.forEach((l) => l());
}

export function useTripPlan(): TripPlan | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current
  );
} 