// src/types/trip.d.ts
export interface TripDraft {
    start: google.maps.PlaceResult | null;
    end:   google.maps.PlaceResult | null;
    startDate: string | null; // ISO yyyy-mm-dd
    endDate:   string | null;
    mode: 'CAR' | 'RV' | 'TRANSIT';
    budget: number; // USD per day
  }