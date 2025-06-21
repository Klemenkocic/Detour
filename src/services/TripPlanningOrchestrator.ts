import { TripRequest, TripPlan, City } from '../types/trip';
import { CityDiscoveryService } from './CityDiscoveryService';
import { RouteBuilderService } from './RouteBuilderService';
import { DayAllocationService } from './DayAllocationService';
import { RouteSegmentationService } from './RouteSegmentationService';

export class TripPlanningOrchestrator {
  private cityDiscovery: CityDiscoveryService;
  private routeBuilder: RouteBuilderService;
  private dayAllocation: DayAllocationService;
  private routeSegmentation: RouteSegmentationService;

  constructor() {
    this.cityDiscovery = new CityDiscoveryService();
    this.routeBuilder = new RouteBuilderService();
    this.dayAllocation = new DayAllocationService();
    this.routeSegmentation = new RouteSegmentationService();
  }

  async planTrip(request: TripRequest): Promise<TripPlan> {
    console.log('🚀 ===== TRIP PLANNING ORCHESTRATOR =====');
    console.log(`📍 Route: ${request.origin} → ${request.destination}`);
    console.log(`📅 Dates: ${request.startDate} to ${request.endDate}`);
    
    try {
      // Step 1: Geocode start and end locations
      const startCoords = await this.geocodeLocation(request.origin);
      const endCoords = await this.geocodeLocation(request.destination);
      
      // Extract clean city names without street addresses
      const startCityName = this.extractCityName(request.origin);
      const endCityName = this.extractCityName(request.destination);
      
      const startCity: City = {
        name: startCityName,
        location: startCoords,
        population: 0, // Will be updated if found in API
        country: '',
        importance: 0 // Start city always gets 0 importance (departure only)
      };
      
      const endCity: City = {
        name: endCityName,
        location: endCoords,
        population: 0,
        country: '',
        importance: 250 // End city gets very high importance to ensure adequate time
      };
      
      // Step 2: Calculate trip duration
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      console.log(`🗓️ Trip duration: ${totalDays} days`);
      
      // Step 3: Discover cities in corridor
      const citiesInCorridor = await this.cityDiscovery.discoverCitiesInCorridor(
        startCoords.lat,
        startCoords.lng,
        endCoords.lat,
        endCoords.lng
      );
      
      // Step 4: Build optimal route
      const optimalRoute = this.routeBuilder.buildOptimalRoute(
        startCity,
        endCity,
        citiesInCorridor
      );
      
      // Step 5: Allocate days
      const cityStays = this.dayAllocation.allocateDays(optimalRoute, totalDays);
      
      // Step 6: Create route segments
      const segments = await this.routeSegmentation.createRouteSegments(optimalRoute);
      
      // Step 7: Calculate totals
      const totalDistance = segments.reduce((sum, seg) => sum + seg.distance, 0);
      const totalDrivingTime = segments.reduce((sum, seg) => sum + seg.duration, 0);
      
      const tripPlan: TripPlan = {
        cities: optimalRoute,
        segments,
        cityStays,
        totalDays,
        totalDistance,
        totalDrivingTime,
        startDate,
        endDate
      };
      
      console.log('✅ Trip planning complete!');
      console.log(`📊 Summary: ${optimalRoute.length} cities, ${segments.length} segments, ${Math.round(totalDistance/1000)}km total`);
      
      return tripPlan;
      
    } catch (error) {
      console.error('❌ Trip planning failed:', error);
      throw error;
    }
  }

  private async geocodeLocation(address: string): Promise<google.maps.LatLngLiteral> {
    return new Promise((resolve, reject) => {
      if (!window.google?.maps) {
        reject(new Error('Google Maps not available'));
        return;
      }

      const geocoder = new google.maps.Geocoder();
      
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          reject(new Error(`Geocoding failed for ${address}: ${status}`));
        }
      });
    });
  }

  private extractCityName(address: string): string {
    // Extract city name from full address
    const parts = address.split(',').map(p => p.trim());
    
    // If address contains street number or street keywords, skip first part
    if (parts.length >= 2) {
      const firstPart = parts[0].toLowerCase();
      const hasStreetIndicators = /\d/.test(firstPart) || 
                                 firstPart.includes('rue') || 
                                 firstPart.includes('ul') ||
                                 firstPart.includes('street') ||
                                 firstPart.includes('avenue') ||
                                 firstPart.includes('boulevard') ||
                                 firstPart.includes('place');
      
      if (hasStreetIndicators) {
        // For "31 Rue de Rivoli, 75004 Paris, France" return "Paris"
        if (parts.length >= 2 && /^\d{4,5}/.test(parts[1])) {
          // Second part starts with postal code
          const secondPart = parts[1];
          const postalMatch = secondPart.match(/^\d{4,5}\s+(.+)$/);
          if (postalMatch && postalMatch[1]) {
            return postalMatch[1];
          }
          // If no city after postal code, check next part
          if (parts.length >= 3) {
            return parts[2];
          }
        }
        return parts[1];
      }
    }
    
    return parts[0];
  }
} 