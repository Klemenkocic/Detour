import { useState, useCallback, useRef } from 'react';

interface PlaceResult {
  name: string;
  location: google.maps.LatLngLiteral;
  country: string;
  placeId: string;
}

interface SearchResult {
  results: PlaceResult[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  fromCache?: boolean;
}

class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key: string, value: T): void {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Remove oldest if at capacity
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

// Global cache instance
const searchCache = new LRUCache<PlaceResult[]>(50);

export function useCitySearch() {
  const [searchResult, setSearchResult] = useState<SearchResult>({
    results: [],
    status: 'idle',
    error: null,
  });

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentRequestRef = useRef<number>(0);

  const searchCities = useCallback(async (query: string): Promise<void> => {
    // Clear previous timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Increment request counter to cancel previous requests
    currentRequestRef.current += 1;
    const requestId = currentRequestRef.current;

    if (query.length < 2) {
      setSearchResult({
        results: [],
        status: 'idle',
        error: null,
      });
      return;
    }

    // Check cache first
    const cacheKey = query.toLowerCase().trim();
    const cachedResults = searchCache.get(cacheKey);
    
    if (cachedResults) {
      setSearchResult({
        results: cachedResults,
        status: 'success',
        error: null,
        fromCache: true,
      });
      return;
    }

    // Set loading state
    setSearchResult(prev => ({
      ...prev,
      status: 'loading',
      error: null,
    }));

    // Debounce API call
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        if (!window.google?.maps?.places?.AutocompleteService) {
          throw new Error('Google Places API not available');
        }

        const service = new google.maps.places.AutocompleteService();
        
        // Use any type to avoid Google Maps API type issues
        const predictions = await new Promise<any[]>(
          (resolve, reject) => {
            (service as any).getQueryPredictions(
              {
                input: query,
              },
              (predictions: any, status: any) => {
                if (status === 'OK') {
                  resolve(predictions || []);
                } else if (status === 'ZERO_RESULTS') {
                  resolve([]);
                } else {
                  reject(new Error(`Places API error: ${status}`));
                }
              }
            );
          }
        );

        // Check if this request is still current
        if (requestId !== currentRequestRef.current) {
          return;
        }

        // Transform predictions to our format
        const results: PlaceResult[] = predictions.slice(0, 10).map((prediction: any) => ({
          name: prediction.structured_formatting?.main_text || prediction.description || 'Unknown',
          location: { lat: 0, lng: 0 }, // Will be geocoded if needed
          country: prediction.structured_formatting?.secondary_text?.split(',').pop()?.trim() || '',
          placeId: prediction.place_id || '',
        }));

        // Cache the results
        searchCache.set(cacheKey, results);

        setSearchResult({
          results,
          status: 'success',
          error: null,
          fromCache: false,
        });

      } catch (error) {
        // Check if this request is still current
        if (requestId !== currentRequestRef.current) {
          return;
        }

        console.error('City search error:', error);
        setSearchResult({
          results: [],
          status: 'error',
          error: error instanceof Error ? error.message : 'Search failed',
        });
      }
    }, 600);
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  return {
    searchResult,
    searchCities,
    cleanup,
  };
}

export default useCitySearch; 