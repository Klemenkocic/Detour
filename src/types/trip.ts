// src/types/trip.ts
export type Place = {
    label: string;
    placeId: string;
    location: google.maps.LatLngLiteral;
  };
  
  export interface TripDraft {
    start: Place | null;
    end:   Place | null;
    startDate: string | null;
    endDate:   string | null;
    mode: 'CAR' | 'RV' | 'PUBLIC';
    budget: number;
  }