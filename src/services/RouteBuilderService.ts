import { City } from '../types/trip';

export class RouteBuilderService {
  private readonly MAX_DRIVING_DISTANCE_KM = 400;
  private readonly MIN_DRIVING_DISTANCE_KM = 100; // Increased to avoid too many stops

  buildOptimalRoute(
    startCity: City,
    endCity: City,
    availableCities: City[]
  ): City[] {
    console.log('🛣️ Building optimal route...');
    console.log(`📍 From: ${startCity.name} to ${endCity.name}`);
    
    // Remove end city from available cities if it exists
    const filteredCities = availableCities.filter(city => 
      city.name.toLowerCase() !== endCity.name.toLowerCase()
    );
    
    const route: City[] = [startCity];
    let currentCity = startCity;
    const maxStops = 10; // Prevent infinite loops
    let stops = 0;
    
    // Keep adding cities until we reach the destination
    while (currentCity.name !== endCity.name && stops < maxStops) {
      const nextCity = this.findBestNextCity(
        currentCity,
        endCity,
        filteredCities,
        route
      );
      
      if (!nextCity) {
        // No viable next city found, go directly to end
        console.log('⚠️ No intermediate city found, going directly to destination');
        break;
      }
      
      // Check if we should go directly to destination instead
      const distanceToNext = this.calculateDistance(currentCity.location, nextCity.location);
      const distanceToEnd = this.calculateDistance(currentCity.location, endCity.location);
      
      // If destination is closer than next city and within driving range, go directly
      if (distanceToEnd < distanceToNext && distanceToEnd <= this.MAX_DRIVING_DISTANCE_KM) {
        console.log(`📍 Destination is closer (${Math.round(distanceToEnd)}km), skipping ${nextCity.name}`);
        break;
      }
      
      route.push(nextCity);
      currentCity = nextCity;
      stops++;
    }
    
    // Add end city if not already there
    if (route[route.length - 1].name !== endCity.name) {
      route.push(endCity);
    }
    
    console.log('✅ Route built:', route.map(c => c.name).join(' → '));
    return route;
  }

  private findBestNextCity(
    currentCity: City,
    endCity: City,
    availableCities: City[],
    currentRoute: City[]
  ): City | null {
    // Filter candidate cities
    const candidates = availableCities.filter(city => {
      // Skip if already in route
      if (currentRoute.some(r => r.name === city.name)) {
        return false;
      }
      
      // Skip if it's the current city
      if (city.name === currentCity.name) {
        return false;
      }
      
      const distance = this.calculateDistance(currentCity.location, city.location);
      const progress = this.calculateProgress(currentCity, city, endCity);
      
      // Must make progress toward destination (allow small negative progress for important cities)
      if (progress < -0.1) {
        return false;
      }
      
      // Must be within reasonable driving distance
      if (distance < this.MIN_DRIVING_DISTANCE_KM || distance > this.MAX_DRIVING_DISTANCE_KM) {
        return false;
      }
      
      // Additional check: Don't go past the destination
      const distanceToEnd = this.calculateDistance(currentCity.location, endCity.location);
      const candidateToEnd = this.calculateDistance(city.location, endCity.location);
      
      // If the candidate is farther from destination than we currently are by more than 50km, skip it
      if (candidateToEnd > distanceToEnd + 50) {
        console.log(`⚠️ ${city.name} would take us ${Math.round(candidateToEnd - distanceToEnd)}km past destination`);
        return false;
      }
      
      return true;
    });
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Score each candidate
    const scoredCandidates = candidates.map(city => ({
      city,
      score: this.calculateCityScore(city, currentCity, endCity)
    }));
    
    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    return scoredCandidates[0].city;
  }

  private calculateCityScore(
    city: City,
    currentCity: City,
    endCity: City
  ): number {
    const distance = this.calculateDistance(currentCity.location, city.location);
    const progress = this.calculateProgress(currentCity, city, endCity);
    const importance = city.importance;
    
    // Scoring formula:
    // - Progress toward destination (0-1) * 200 (heavily weighted)
    // - City importance (0-300)
    // - Distance penalty (prefer 150-250km range)
    
    // If we're backtracking, heavily penalize
    if (progress < 0) {
      return -1000 + importance; // Very low score, but still consider importance
    }
    
    let score = progress * 200 + importance;
    
    // Distance penalty
    if (distance < 150) {
      score -= (150 - distance) * 0.5; // Too close
    } else if (distance > 250) {
      score -= (distance - 250) * 0.5; // Too far
    }
    
    return score;
  }

  private calculateProgress(
    from: City,
    to: City,
    destination: City
  ): number {
    const currentDistance = this.calculateDistance(from.location, destination.location);
    const nextDistance = this.calculateDistance(to.location, destination.location);
    
    // Progress is how much closer we get to destination
    const progress = (currentDistance - nextDistance) / currentDistance;
    
    // Also check if we're moving in the right general direction
    // Calculate if the city is "ahead" of us on the route
    const fromToDestVector = {
      lat: destination.location.lat - from.location.lat,
      lng: destination.location.lng - from.location.lng
    };
    const fromToCityVector = {
      lat: to.location.lat - from.location.lat,
      lng: to.location.lng - from.location.lng
    };
    
    // Dot product to check if we're going in roughly the right direction
    const dotProduct = fromToDestVector.lat * fromToCityVector.lat + 
                      fromToDestVector.lng * fromToCityVector.lng;
    
    // If dot product is negative, we're going backwards
    if (dotProduct < 0) {
      return -1; // Strong negative progress for backtracking
    }
    
    return progress;
  }

  private calculateDistance(
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
    return R * c;
  }
} 