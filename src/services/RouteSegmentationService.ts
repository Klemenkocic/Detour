import { City, RouteSegment } from '../types/trip';

export class RouteSegmentationService {
  async createRouteSegments(cities: City[]): Promise<RouteSegment[]> {
    console.log('🛣️ Creating route segments...');
    
    if (cities.length < 2) {
      throw new Error('Need at least 2 cities to create route segments');
    }
    
    const segments: RouteSegment[] = [];
    
    for (let i = 0; i < cities.length - 1; i++) {
      const fromCity = cities[i];
      const toCity = cities[i + 1];
      
      console.log(`📍 Creating segment: ${fromCity.name} → ${toCity.name}`);
      
      try {
        const googleRoute = await this.fetchGoogleRoute(fromCity.location, toCity.location);
        
        segments.push({
          from: fromCity,
          to: toCity,
          googleRoute,
          distance: googleRoute?.routes[0]?.legs[0]?.distance?.value || 0,
          duration: googleRoute?.routes[0]?.legs[0]?.duration?.value || 0,
          segmentIndex: i
        });
        
        const distanceKm = Math.round((googleRoute?.routes[0]?.legs[0]?.distance?.value || 0) / 1000);
        const durationHours = Math.round((googleRoute?.routes[0]?.legs[0]?.duration?.value || 0) / 3600 * 10) / 10;
        console.log(`✅ Segment created: ${distanceKm}km, ${durationHours}h`);
        
      } catch (error) {
        console.error(`❌ Failed to create segment ${fromCity.name} → ${toCity.name}:`, error);
        
        // Create fallback segment with estimated values
        const estimatedDistance = this.estimateDistance(fromCity.location, toCity.location);
        segments.push({
          from: fromCity,
          to: toCity,
          googleRoute: null,
          distance: estimatedDistance * 1000, // Convert to meters
          duration: estimatedDistance * 40, // Rough estimate: 40 seconds per km
          segmentIndex: i
        });
      }
    }
    
    console.log(`✅ Created ${segments.length} route segments`);
    return segments;
  }

  private async fetchGoogleRoute(
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral
  ): Promise<google.maps.DirectionsResult> {
    return new Promise((resolve, reject) => {
      if (!window.google?.maps) {
        reject(new Error('Google Maps not available'));
        return;
      }

      const directionsService = new google.maps.DirectionsService();
      
      directionsService.route({
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false,
        avoidHighways: false,
        avoidTolls: false,
        region: 'EU' // Optimize for European routes
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  private estimateDistance(
    coord1: google.maps.LatLngLiteral,
    coord2: google.maps.LatLngLiteral
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1.3; // Add 30% for road distance vs straight line
  }
} 