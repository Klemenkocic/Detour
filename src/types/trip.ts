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
    tripType: 'ONE_WAY' | 'TWO_WAY';
  }

  // Enhanced trip planning types
  export interface PopularAttraction {
    name: string;
    placeId: string;
    location: google.maps.LatLngLiteral;
    rating: number;
    types: string[];
    photoUrl?: string;
    openingHours?: string[];
    priceLevel?: number;
    userRatingsTotal?: number;
  }

  export interface DayItinerary {
    day: number;
    date: string;
    city: string;
    cityPlaceId: string;
    location: google.maps.LatLngLiteral;
    drivingFromPrevious?: {
      duration: number; // seconds
      distance: number; // meters
      startTime: string;
      arrivalTime: string;
    };
    attractions: PopularAttraction[];
    accommodation?: {
      name: string;
      placeId: string;
      location: google.maps.LatLngLiteral;
      rating: number;
      pricePerNight: number;
      type: string;
      bookingUrl?: string;
      photos?: string[];
    };
    schedule: {
      time: string;
      activity: string;
      location?: string;
      duration?: number; // minutes
      type: 'drive' | 'attraction' | 'meal' | 'accommodation' | 'free';
    }[];
  }

  export interface EnhancedTripData {
    totalDays: number;
    totalDistance: number; // meters
    totalDrivingTime: number; // seconds
    dailyItineraries: DayItinerary[];
    route: {
      waypoints: google.maps.LatLngLiteral[];
      cities: string[];
    };
    costs: {
      accommodation: number;
      estimated: number;
      breakdown: { [key: string]: number };
    };
    feasible: boolean;
    warnings: string[];
    tripSettings: {
      startCity: string;
      endCity: string;
      startDate: string;
      endDate: string;
      transportMode: 'CAR' | 'RV' | 'PUBLIC';
      tripType: 'ONE_WAY' | 'TWO_WAY';
      budget: number;
    };
    carSettings?: {
      startTime: string;
      endTime: string;
      maxDailyHours: number;
      accommodationType: string;
    };
  }

  export interface TripSidebarProps {
    tripData: EnhancedTripData | null;
    isVisible: boolean;
    onClose: () => void;
    onSettingsChange: (settings: any) => void;
    onDaySettingsChange: (day: number, settings: any) => void;
  }

// Core types for the trip planning system
export interface City {
  name: string;
  location: google.maps.LatLngLiteral;
  population: number;
  country: string;
  importance: number; // 0-300 score based on population and tourist value
}

export interface RouteSegment {
  from: City;
  to: City;
  googleRoute: google.maps.DirectionsResult | null;
  distance: number; // meters
  duration: number; // seconds
  segmentIndex: number;
}

export interface CityStay {
  city: City;
  days: number;
  startDay: number;
  endDay: number;
}

export interface TripPlan {
  id?: string;
  cities: City[];
  segments: RouteSegment[];
  cityStays: CityStay[];
  totalDays: number;
  totalDistance: number; // meters
  totalDrivingTime: number; // seconds
  startDate: Date;
  endDate: Date;
  premium?: boolean;
}

export interface TripRequest {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  mode: 'CAR' | 'RV' | 'PUBLIC';
  budget: number;
}

// API Response types
export interface OpenDataSoftCity {
  name: string;
  ascii_name: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  population: number;
  cou_name_en: string;
  timezone: string;
}

// UI State types
export interface TripPlannerState {
  isLoading: boolean;
  error: string | null;
  currentTripPlan: TripPlan | null;
  selectedCityIndex: number | null;
}