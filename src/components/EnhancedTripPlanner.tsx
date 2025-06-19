import React from 'react';
import { EnhancedTripData, DayItinerary, PopularAttraction, TripDraft } from '../types/trip';

interface TripPlannerProps {
  route: google.maps.DirectionsResult | null;
  tripDetails: {
    tripType: 'ONE_WAY' | 'TWO_WAY';
    mode: 'CAR' | 'RV' | 'PUBLIC';
    startDate: string;
    endDate: string;
    budget: number;
    carSettings?: {
      startTime: string;
      endTime: string;
      maxDailyHours: number;
      accommodationType: string;
    };
  };
  onTripCalculated: (tripData: EnhancedTripData) => void;
}

export class EnhancedTripPlanner {
  private placesService: google.maps.places.PlacesService | null = null;

  constructor() {
    // Don't initialize Google Maps services in constructor
    // They will be initialized lazily when needed
  }

  private initializePlacesService(): boolean {
    // Check if Google Maps API is available
    if (typeof window === 'undefined' || !window.google?.maps) {
      console.warn('Google Maps API not loaded yet');
      return false;
    }

    if (!this.placesService) {
      try {
        // Initialize Places service with a dummy map element
        const mapDiv = document.createElement('div');
        const map = new google.maps.Map(mapDiv);
        this.placesService = new google.maps.places.PlacesService(map);
        return true;
      } catch (error) {
        console.error('Failed to initialize Places service:', error);
        return false;
      }
    }
    return true;
  }

  async calculateEnhancedTrip(
    route: google.maps.DirectionsResult,
    tripDetails: {
      tripType: 'ONE_WAY' | 'TWO_WAY';
      mode: 'CAR' | 'RV' | 'PUBLIC';
      startDate: string;
      endDate: string;
      budget: number;
      carSettings?: {
        startTime: string;
        endTime: string;
        maxDailyHours: number;
        accommodationType: string;
      };
    }
  ): Promise<EnhancedTripData> {
    // Initialize Places service if needed
    this.initializePlacesService();

    const leg = route.routes[0].legs[0];
    const startDate = new Date(tripDetails.startDate);
    const endDate = new Date(tripDetails.endDate);
    
    // Calculate available days
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    console.log(`🗓️ Enhanced Trip Planning: ${totalDays} days available`);
    
    // Get intermediate cities and attractions along the route
    const waypointCities = await this.findIntermediateCities(leg, totalDays);
    
    // Create daily itineraries
    const dailyItineraries = await this.createDailyItineraries(
      waypointCities,
      startDate,
      totalDays,
      tripDetails
    );

    // Calculate costs and feasibility
    const costs = this.calculateCosts(dailyItineraries, tripDetails.budget);
    const { feasible, warnings } = this.validateTrip(dailyItineraries, tripDetails, totalDays);

    return {
      totalDays,
      totalDistance: leg.distance?.value || 0,
      totalDrivingTime: leg.duration?.value || 0,
      dailyItineraries,
      route: {
        waypoints: waypointCities.map(city => city.location),
        cities: waypointCities.map(city => city.name)
      },
      costs,
      feasible,
      warnings,
      tripSettings: {
        startCity: leg.start_address || 'Start',
        endCity: leg.end_address || 'End',
        startDate: tripDetails.startDate,
        endDate: tripDetails.endDate,
        transportMode: tripDetails.mode,
        tripType: tripDetails.tripType,
        budget: tripDetails.budget
      },
      carSettings: tripDetails.carSettings
    };
  }

  private async findIntermediateCities(
    leg: google.maps.DirectionsLeg,
    totalDays: number
  ): Promise<Array<{ name: string; location: google.maps.LatLngLiteral; placeId: string }>> {
    const cities = [];
    const totalDistance = leg.distance?.value || 0;
    
    // Add start city
    cities.push({
      name: this.extractCityName(leg.start_address || 'Start'),
      location: {
        lat: leg.start_location.lat(),
        lng: leg.start_location.lng()
      },
      placeId: 'start_city'
    });

    // Calculate intermediate stops based on available days
    const intermediateStops = Math.max(0, totalDays - 2); // Exclude start and end days
    
    if (intermediateStops > 0) {
      const segmentDistance = totalDistance / (intermediateStops + 1);
      
      for (let i = 1; i <= intermediateStops; i++) {
        // Find cities along the route using Places API
        const searchLocation = this.interpolateLocation(
          leg.start_location,
          leg.end_location,
          i / (intermediateStops + 1)
        );
        
        const nearbyCity = await this.findNearbyCity(searchLocation);
        if (nearbyCity) {
          cities.push(nearbyCity);
        }
      }
    }

    // Add end city
    cities.push({
      name: this.extractCityName(leg.end_address || 'End'),
      location: {
        lat: leg.end_location.lat(),
        lng: leg.end_location.lng()
      },
      placeId: 'end_city'
    });

    return cities;
  }

  private async findNearbyCity(
    location: google.maps.LatLng
  ): Promise<{ name: string; location: google.maps.LatLngLiteral; placeId: string } | null> {
    return new Promise((resolve) => {
      if (!this.placesService || !window.google?.maps) {
        // Fallback to a generic city name based on location
        resolve({
          name: `Stop ${Math.random().toString(36).substr(2, 5)}`,
          location: { lat: location.lat(), lng: location.lng() },
          placeId: 'generic_' + Math.random().toString(36).substr(2, 9)
        });
        return;
      }

      const request: google.maps.places.PlaceSearchRequest = {
        location: location,
        radius: 50000, // 50km radius
        type: 'locality'
      };

      this.placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]) {
          const place = results[0];
          resolve({
            name: place.name || 'Unknown City',
            location: {
              lat: place.geometry?.location?.lat() || location.lat(),
              lng: place.geometry?.location?.lng() || location.lng()
            },
            placeId: place.place_id || 'unknown'
          });
        } else {
          // Fallback to a generic city name based on location
          resolve({
            name: `Stop ${Math.random().toString(36).substr(2, 5)}`,
            location: { lat: location.lat(), lng: location.lng() },
            placeId: 'generic_' + Math.random().toString(36).substr(2, 9)
          });
        }
      });
    });
  }

  private async createDailyItineraries(
    cities: Array<{ name: string; location: google.maps.LatLngLiteral; placeId: string }>,
    startDate: Date,
    totalDays: number,
    tripDetails: any
  ): Promise<DayItinerary[]> {
    const itineraries: DayItinerary[] = [];
    
    // Distribute days across cities based on importance and attractions
    const daysPerCity = this.distributeDaysAcrossCities(cities, totalDays);
    
    let currentDay = 1;
    let currentDate = new Date(startDate);

    for (let cityIndex = 0; cityIndex < cities.length; cityIndex++) {
      const city = cities[cityIndex];
      const daysInCity = daysPerCity[cityIndex];
      
      // Get popular attractions for this city
      const attractions = await this.getPopularAttractions(city.location, city.name);
      
      for (let dayInCity = 0; dayInCity < daysInCity; dayInCity++) {
        const isFirstDayInCity = dayInCity === 0;
        const isLastDay = currentDay === totalDays;
        
        // Calculate driving info if coming from previous city
        let drivingFromPrevious;
        if (isFirstDayInCity && cityIndex > 0) {
          const prevCity = cities[cityIndex - 1];
          drivingFromPrevious = await this.calculateDriving(
            prevCity.location,
            city.location,
            tripDetails.carSettings?.startTime || '09:00'
          );
        }

        // Create accommodation if staying overnight (not last day)
        let accommodation;
        if (!isLastDay || (isLastDay && dayInCity < daysInCity - 1)) {
          accommodation = this.generateAccommodation(city, tripDetails);
        }

        // Create daily schedule
        const schedule = this.createDaySchedule(
          attractions,
          drivingFromPrevious,
          accommodation,
          isFirstDayInCity,
          tripDetails
        );

        itineraries.push({
          day: currentDay,
          date: currentDate.toLocaleDateString(),
          city: city.name,
          cityPlaceId: city.placeId,
          location: city.location,
          drivingFromPrevious,
          attractions: attractions.slice(0, 3), // Top 3 attractions per day
          accommodation,
          schedule
        });

        currentDay++;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return itineraries;
  }

  private distributeDaysAcrossCities(
    cities: Array<{ name: string; location: google.maps.LatLngLiteral; placeId: string }>,
    totalDays: number
  ): number[] {
    // Simple distribution: more days for middle cities, minimum 1 day each
    const distribution = new Array(cities.length).fill(1);
    let remainingDays = totalDays - cities.length;

    // Distribute remaining days, giving preference to middle cities
    while (remainingDays > 0) {
      for (let i = 1; i < cities.length - 1 && remainingDays > 0; i++) {
        distribution[i]++;
        remainingDays--;
      }
      
      // If still have days, distribute to start and end
      if (remainingDays > 0) {
        distribution[0]++;
        remainingDays--;
      }
      if (remainingDays > 0 && cities.length > 1) {
        distribution[cities.length - 1]++;
        remainingDays--;
      }
    }

    return distribution;
  }

  private async getPopularAttractions(
    location: google.maps.LatLngLiteral,
    cityName: string
  ): Promise<PopularAttraction[]> {
    return new Promise((resolve) => {
      if (!this.placesService || !window.google?.maps) {
        resolve(this.getMockAttractions(cityName));
        return;
      }

      const request: google.maps.places.PlaceSearchRequest = {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 10000, // 10km radius
        type: 'tourist_attraction'
      };

      this.placesService.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          const attractions: PopularAttraction[] = results
            .slice(0, 5) // Top 5 attractions
            .map(place => ({
              name: place.name || 'Unknown Attraction',
              placeId: place.place_id || 'unknown',
              location: {
                lat: place.geometry?.location?.lat() || location.lat,
                lng: place.geometry?.location?.lng() || location.lng
              },
              rating: place.rating || 4.0,
              types: place.types || ['tourist_attraction'],
              photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400 }),
              priceLevel: place.price_level,
              userRatingsTotal: place.user_ratings_total
            }));
          
          resolve(attractions);
        } else {
          resolve(this.getMockAttractions(cityName));
        }
      });
    });
  }

  private getMockAttractions(cityName: string): PopularAttraction[] {
    // Mock attractions based on city name patterns
    const baseAttractions = [
      { name: `${cityName} Historic Center`, type: 'tourist_attraction' },
      { name: `${cityName} Cathedral`, type: 'church' },
      { name: `${cityName} Museum`, type: 'museum' },
      { name: `${cityName} Castle`, type: 'tourist_attraction' },
      { name: `${cityName} Park`, type: 'park' }
    ];

    return baseAttractions.map((attr, index) => ({
      name: attr.name,
      placeId: `mock_${cityName}_${index}`,
      location: { lat: 0, lng: 0 }, // Would be set properly with real API
      rating: 3.5 + Math.random() * 1.5,
      types: [attr.type],
      userRatingsTotal: Math.floor(Math.random() * 1000) + 100
    }));
  }

  private async calculateDriving(
    from: google.maps.LatLngLiteral,
    to: google.maps.LatLngLiteral,
    startTime: string
  ): Promise<{ duration: number; distance: number; startTime: string; arrivalTime: string }> {
    // Mock calculation - in real implementation, use Directions API
    const mockDuration = 3600 + Math.random() * 7200; // 1-3 hours
    const mockDistance = 50000 + Math.random() * 200000; // 50-250km
    
    const start = new Date();
    const [hours, minutes] = startTime.split(':');
    start.setHours(parseInt(hours), parseInt(minutes));
    
    const arrival = new Date(start.getTime() + mockDuration * 1000);
    
    return {
      duration: mockDuration,
      distance: mockDistance,
      startTime: startTime,
      arrivalTime: arrival.toTimeString().slice(0, 5)
    };
  }

  private generateAccommodation(city: any, tripDetails: any) {
    const types = ['hotel', 'motel', 'lodge', 'inn'];
    const selectedType = tripDetails.carSettings?.accommodationType || 'hotel';
    
    return {
      name: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} ${city.name}`,
      placeId: `accommodation_${city.placeId}`,
      location: city.location,
      rating: 3.5 + Math.random() * 1.5,
      pricePerNight: 60 + Math.random() * 140, // €60-200 range
      type: selectedType,
      bookingUrl: `https://booking.com/search?destination=${encodeURIComponent(city.name)}`
    };
  }

  private createDaySchedule(
    attractions: PopularAttraction[],
    drivingFromPrevious: any,
    accommodation: any,
    isFirstDayInCity: boolean,
    tripDetails: any
  ) {
    const schedule = [];
    
    // Add driving if coming from previous city
    if (drivingFromPrevious) {
      schedule.push({
        time: drivingFromPrevious.startTime,
        activity: 'Drive from previous city',
        duration: Math.round(drivingFromPrevious.duration / 60),
        type: 'drive' as const
      });
    }
    
    // Add attractions throughout the day
    const startHour = drivingFromPrevious ? 
      parseInt(drivingFromPrevious.arrivalTime.split(':')[0]) + 1 : 10;
    
    attractions.slice(0, 2).forEach((attraction, index) => {
      const hour = startHour + index * 3;
      schedule.push({
        time: `${hour < 10 ? '0' + hour : hour}:00`,
        activity: `Visit ${attraction.name}`,
        location: attraction.name,
        duration: 120, // 2 hours
        type: 'attraction' as const
      });
    });
    
    // Add meals
    schedule.push({
      time: '12:30',
      activity: 'Lunch',
      duration: 60,
      type: 'meal' as const
    });
    
    schedule.push({
      time: '19:00',
      activity: 'Dinner',
      duration: 90,
      type: 'meal' as const
    });
    
    // Add accommodation check-in
    if (accommodation) {
      schedule.push({
        time: '21:00',
        activity: `Check into ${accommodation.name}`,
        location: accommodation.name,
        type: 'accommodation' as const
      });
    }
    
    return schedule.sort((a, b) => a.time.localeCompare(b.time));
  }

  private calculateCosts(itineraries: DayItinerary[], budget: number) {
    const accommodationCost = itineraries.reduce((sum, day) => 
      sum + (day.accommodation?.pricePerNight || 0), 0
    );
    
    const estimatedFoodCost = itineraries.length * 40; // €40 per day for food
    const estimatedFuelCost = 200; // Mock fuel cost
    
    return {
      accommodation: accommodationCost,
      estimated: accommodationCost + estimatedFoodCost + estimatedFuelCost,
      breakdown: {
        accommodation: accommodationCost,
        food: estimatedFoodCost,
        fuel: estimatedFuelCost
      }
    };
  }

  private validateTrip(
    itineraries: DayItinerary[],
    tripDetails: any,
    totalDays: number
  ): { feasible: boolean; warnings: string[] } {
    const warnings: string[] = [];
    let feasible = true;
    
    // Check budget constraints
    const totalCost = itineraries.reduce((sum, day) => 
      sum + (day.accommodation?.pricePerNight || 0), 0
    );
    
    if (totalCost > tripDetails.budget) {
      warnings.push(`Accommodation costs (€${Math.round(totalCost)}) exceed budget (€${tripDetails.budget})`);
      feasible = false;
    }
    
    // Check if trip duration is reasonable
    if (totalDays > 30) {
      warnings.push('Trip duration exceeds maximum recommended length of 30 days');
      feasible = false;
    }
    
    return { feasible, warnings };
  }

  // Helper methods
  private extractCityName(address: string): string {
    // Extract city name from full address
    const parts = address.split(',');
    return parts[0]?.trim() || address;
  }

  private interpolateLocation(
    start: google.maps.LatLng,
    end: google.maps.LatLng,
    ratio: number
  ): google.maps.LatLng {
    if (!window.google?.maps) {
      // Fallback calculation if Google Maps not available
      const lat = start.lat() + (end.lat() - start.lat()) * ratio;
      const lng = start.lng() + (end.lng() - start.lng()) * ratio;
      return { lat: () => lat, lng: () => lng } as google.maps.LatLng;
    }
    
    const lat = start.lat() + (end.lat() - start.lat()) * ratio;
    const lng = start.lng() + (end.lng() - start.lng()) * ratio;
    return new google.maps.LatLng(lat, lng);
  }
}

export default EnhancedTripPlanner; 