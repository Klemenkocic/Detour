import { City, OpenDataSoftCity } from '../types/trip';

export class CityDiscoveryService {
  private readonly API_BASE = 'https://data.opendatasoft.com/api/explore/v2.1';
  private readonly DATASET = 'geonames-all-cities-with-a-population-1000@public';
  private readonly CORRIDOR_WIDTH_KM = 150;

  async discoverCitiesInCorridor(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ): Promise<City[]> {
    console.log('🔍 Discovering cities in corridor...');
    
    try {
      // Try multiple discovery methods
      const cities: City[] = [];
      
      // Method 1: Fetch from OpenDataSoft API
      try {
        const allCities = await this.fetchEuropeanCities();
        const citiesInCorridor = this.filterCitiesByCorridor(
          allCities,
          { lat: startLat, lng: startLng },
          { lat: endLat, lng: endLng }
        );
        cities.push(...citiesInCorridor);
      } catch (error) {
        console.warn('⚠️ OpenDataSoft API failed, continuing with other methods:', error);
      }
      
      // Method 2: Use Google Places API for additional cities
      if (window.google?.maps) {
        const googleCities = await this.discoverCitiesWithGooglePlaces(
          { lat: startLat, lng: startLng },
          { lat: endLat, lng: endLng }
        );
        
        // Merge with existing cities, avoiding duplicates
        googleCities.forEach(googleCity => {
          if (!cities.some(c => c.name.toLowerCase() === googleCity.name.toLowerCase())) {
            cities.push(googleCity);
          }
        });
      }
      
      // Calculate importance scores
      const scoredCities = cities.map(city => ({
        ...city,
        importance: this.calculateImportance(city)
      }));
      
      console.log(`✅ Found ${scoredCities.length} cities in corridor`);
      return scoredCities;
      
    } catch (error) {
      console.error('❌ City discovery failed:', error);
      throw error;
    }
  }

  private async fetchEuropeanCities(): Promise<City[]> {
    // Return cached cities if available
    if (this.cachedEuropeanCities.length > 0) {
      console.log('📦 Using cached European cities');
      return this.cachedEuropeanCities;
    }
    
    const url = `${this.API_BASE}/catalog/datasets/${this.DATASET}/records`;
    const allCities: City[] = [];
    
    // We need to fetch multiple pages to get all European cities
    // The API returns max 100 per request
    for (let offset = 0; offset < 1000; offset += 100) {
      const params = new URLSearchParams({
        select: 'name,ascii_name,coordinates,population,cou_name_en',
        where: "population >= 100000 AND timezone LIKE 'Europe/%'",
        order_by: 'population DESC',
        limit: '100',
        offset: offset.toString()
      });

      // Add API key if available
      const apiKey = import.meta.env.VITE_OPENDATASOFT_API_KEY;
      const headers: HeadersInit = {
        'Accept': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Apikey ${apiKey}`;
      }

      console.log(`📡 Fetching European cities from OpenDataSoft (offset ${offset})...`);
      
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid API response format');
      }

      console.log(`📊 Page returned ${data.results.length} cities`);
      
      // Transform and add to our collection
      const pageCities = data.results
        .filter((city: OpenDataSoftCity) => 
          city.coordinates && 
          city.population >= 100000 &&
          (city.name || city.ascii_name) // Ensure city has a name
        )
        .map((city: OpenDataSoftCity) => ({
          name: city.name || city.ascii_name || 'Unknown',
          location: {
            lat: city.coordinates.lat,
            lng: city.coordinates.lon
          },
          population: city.population || 0,
          country: city.cou_name_en || '',
          importance: 0 // Will be calculated later
        }));
      
      allCities.push(...pageCities);
      
      // If we got less than 100, we've reached the end
      if (data.results.length < 100) {
        break;
      }
    }
    
    console.log(`✅ Total: ${allCities.length} European cities with 100k+ population`);
    
    // Log some cities from different countries to verify diversity
    const countryCounts: Record<string, number> = {};
    allCities.forEach(city => {
      countryCounts[city.country] = (countryCounts[city.country] || 0) + 1;
    });
    const countryList = Object.keys(countryCounts).map(country => ({
      country,
      count: countryCounts[country]
    }));
    console.log('Cities by country:', countryList.slice(0, 10));
    
    // Cache the cities for future use
    this.cachedEuropeanCities = allCities;
    
    return allCities;
  }

  private filterCitiesByCorridor(
    cities: City[],
    start: google.maps.LatLngLiteral,
    end: google.maps.LatLngLiteral
  ): City[] {
    console.log(`🔍 Filtering ${cities.length} cities by corridor...`);
    console.log(`📍 Start: ${start.lat}, ${start.lng}`);
    console.log(`📍 End: ${end.lat}, ${end.lng}`);
    
    const filtered = cities.filter(city => {
      const distance = this.distanceFromLine(city.location, start, end);
      const position = this.positionAlongRoute(city.location, start, end);
      
      // City must be within corridor width and along the route
      const inCorridor = distance <= this.CORRIDOR_WIDTH_KM && position >= -0.1 && position <= 1.1;
      
      // Only log major cities to reduce console spam
      if (distance <= this.CORRIDOR_WIDTH_KM && city.population > 200000) {
        const emoji = inCorridor ? '✅' : '❌';
        console.log(`${emoji} ${city.name}: ${Math.round(distance)}km from line, position ${position.toFixed(2)}`);
      }
      
      return inCorridor;
    });
    
    console.log(`📊 Filtered to ${filtered.length} cities in corridor`);
    return filtered;
  }

  private calculateImportance(city: City): number {
    let score = 0;
    
    // Base score from population
    if (city.population >= 2000000) {
      score = 250; // Mega cities
    } else if (city.population >= 1000000) {
      score = 200; // Major cities
    } else if (city.population >= 500000) {
      score = 160; // Regional capitals
    } else if (city.population >= 200000) {
      score = 130; // Significant cities
    } else {
      score = 100; // Base score for 100k+ cities
    }
    
    // Tourist destination bonus
    const touristCities = [
      'Paris', 'London', 'Berlin', 'Rome', 'Madrid', 'Barcelona', 'Amsterdam',
      'Vienna', 'Prague', 'Budapest', 'Milan', 'Venice', 'Florence', 'Munich',
      'Zurich', 'Geneva', 'Lyon', 'Nice', 'Salzburg', 'Bruges', 'Krakow'
    ];
    
    if (touristCities.some(tourist => 
      city.name.toLowerCase().includes(tourist.toLowerCase())
    )) {
      score += 50;
    }
    
    // Capital city bonus
    const capitals = [
      'Paris', 'London', 'Berlin', 'Rome', 'Madrid', 'Amsterdam', 'Vienna',
      'Prague', 'Budapest', 'Warsaw', 'Brussels', 'Bern', 'Stockholm',
      'Copenhagen', 'Oslo', 'Helsinki', 'Dublin', 'Lisbon', 'Athens'
    ];
    
    if (capitals.some(capital => 
      city.name.toLowerCase().includes(capital.toLowerCase())
    )) {
      score += 30;
    }
    
    return score;
  }

  // Geometric calculations
  private distanceFromLine(
    point: google.maps.LatLngLiteral,
    lineStart: google.maps.LatLngLiteral,
    lineEnd: google.maps.LatLngLiteral
  ): number {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx: number, yy: number;

    if (param < 0) {
      xx = lineStart.lat;
      yy = lineStart.lng;
    } else if (param > 1) {
      xx = lineEnd.lat;
      yy = lineEnd.lng;
    } else {
      xx = lineStart.lat + param * C;
      yy = lineStart.lng + param * D;
    }

    return this.haversineDistance({ lat: xx, lng: yy }, point);
  }

  private positionAlongRoute(
    point: google.maps.LatLngLiteral,
    lineStart: google.maps.LatLngLiteral,
    lineEnd: google.maps.LatLngLiteral
  ): number {
    const A = point.lat - lineStart.lat;
    const B = point.lng - lineStart.lng;
    const C = lineEnd.lat - lineStart.lat;
    const D = lineEnd.lng - lineStart.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return 0;
    
    return dot / lenSq;
  }

  private haversineDistance(
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

  private async discoverCitiesWithGooglePlaces(
    start: google.maps.LatLngLiteral,
    end: google.maps.LatLngLiteral
  ): Promise<City[]> {
    console.log('🔍 Using Google Places to discover additional cities...');
    const cities: City[] = [];
    
    if (!window.google?.maps?.places) {
      console.warn('⚠️ Google Places API not available');
      return cities;
    }

    // Create points along the route
    const numPoints = 5;
    const points: google.maps.LatLngLiteral[] = [];
    
    for (let i = 0; i <= numPoints; i++) {
      const ratio = i / numPoints;
      points.push({
        lat: start.lat + (end.lat - start.lat) * ratio,
        lng: start.lng + (end.lng - start.lng) * ratio
      });
    }

    // Search for cities near each point
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    
    for (const point of points) {
      try {
        const results = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
          service.nearbySearch({
            location: point,
            radius: 100000, // 100km radius
            type: 'locality'
          }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              resolve([]);
            }
          });
        });

        results.forEach(place => {
          if (place.name && place.geometry?.location) {
            const city: City = {
              name: place.name,
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              population: 0, // Google doesn't provide population
              country: '',
              importance: 0 // Will be calculated later
            };
            
            // Check if within corridor
            const distance = this.distanceFromLine(city.location, start, end);
            const position = this.positionAlongRoute(city.location, start, end);
            
            if (distance <= this.CORRIDOR_WIDTH_KM && position >= -0.1 && position <= 1.1) {
              cities.push(city);
            }
          }
        });
      } catch (error) {
        console.warn('⚠️ Google Places search failed for point:', error);
      }
    }

    console.log(`📍 Found ${cities.length} additional cities via Google Places`);
    return cities;
  }

  async findAlternativeCities(
    currentCity: City,
    maxDistance: number = 150
  ): Promise<City[]> {
    console.log(`🔍 Finding alternatives to ${currentCity.name} within ${maxDistance}km...`);
    
    const alternatives: City[] = [];
    
    try {
      // Method 1: Try OpenDataSoft API first
      if (this.cachedEuropeanCities.length > 0) {
        // Use cached cities if available
        const nearbyCities = this.cachedEuropeanCities.filter(city => {
          const distance = this.haversineDistance(currentCity.location, city.location);
          return distance <= maxDistance && city.name !== currentCity.name;
        });
        
        alternatives.push(...nearbyCities);
      } else {
        // Fetch from API if no cache
        const allCities = await this.fetchEuropeanCities();
        this.cachedEuropeanCities = allCities; // Cache for future use
        
        const nearbyCities = allCities.filter(city => {
          const distance = this.haversineDistance(currentCity.location, city.location);
          return distance <= maxDistance && city.name !== currentCity.name;
        });
        
        alternatives.push(...nearbyCities);
      }
      
      // Method 2: Supplement with Google Places
      if (window.google?.maps?.places) {
        const googleCities = await this.fetchGooglePlacesNearby(currentCity.location, maxDistance * 1000);
        
        // Merge, avoiding duplicates
        googleCities.forEach(googleCity => {
          if (!alternatives.some(c => c.name.toLowerCase() === googleCity.name.toLowerCase())) {
            alternatives.push(googleCity);
          }
        });
      }
      
      // Calculate importance for all cities
      const scoredAlternatives = alternatives.map(city => ({
        ...city,
        importance: this.calculateImportance(city)
      }));
      
      // Sort by importance and distance
      scoredAlternatives.sort((a, b) => {
        const distA = this.haversineDistance(currentCity.location, a.location);
        const distB = this.haversineDistance(currentCity.location, b.location);
        
        // Prefer important cities even if slightly farther
        const scoreA = a.importance - distA * 0.5;
        const scoreB = b.importance - distB * 0.5;
        
        return scoreB - scoreA;
      });
      
      console.log(`✅ Found ${scoredAlternatives.length} alternative cities`);
      return scoredAlternatives;
      
    } catch (error) {
      console.error('❌ Error finding alternative cities:', error);
      return alternatives;
    }
  }

  private async fetchGooglePlacesNearby(
    center: google.maps.LatLngLiteral,
    radius: number
  ): Promise<City[]> {
    const cities: City[] = [];
    
    if (!window.google?.maps?.places) {
      return cities;
    }
    
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    
    try {
      const results = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
        service.nearbySearch({
          location: center,
          radius: radius,
          type: 'locality'
        }, (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });
      
      results.forEach(place => {
        if (place.name && place.geometry?.location) {
          cities.push({
            name: place.name,
            location: {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            },
            population: 0,
            country: '',
            importance: 0 // Will be calculated
          });
        }
      });
    } catch (error) {
      console.warn('⚠️ Google Places search failed:', error);
    }
    
    return cities;
  }

  private cachedEuropeanCities: City[] = [];

  async getAllEuropeanCities(): Promise<City[]> {
    // Return cached cities if available
    if (this.cachedEuropeanCities.length > 0) {
      return this.cachedEuropeanCities;
    }
    
    // Otherwise fetch and cache them
    try {
      const cities = await this.fetchEuropeanCities();
      this.cachedEuropeanCities = cities;
      return cities;
    } catch (error) {
      console.error('Failed to fetch European cities:', error);
      return [];
    }
  }
} 