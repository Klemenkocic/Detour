import '../src/test/setup';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCitySearch } from '../src/hooks/useCitySearch';

// Mock timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.restoreAllMocks();
});

// Create a mock for getQueryPredictions
const mockGetQueryPredictions = vi.fn();

// Override the AutocompleteService constructor
beforeEach(() => {
  (globalThis as any).google = {
    maps: {
      places: {
        AutocompleteService: vi.fn().mockImplementation(() => ({
          getQueryPredictions: mockGetQueryPredictions
        }))
      }
    }
  };
});

describe('useCitySearch', () => {
  beforeEach(() => {
    mockGetQueryPredictions.mockClear();
  });

  it('hits API once then uses cache', async () => {
    mockGetQueryPredictions.mockImplementationOnce((request, cb) =>
      cb([{ 
        structured_formatting: { 
          main_text: 'Paris',
          secondary_text: 'France'
        },
        description: 'Paris, France',
        place_id: 'paris-id'
      }], 'OK'),
    );

    const { result } = renderHook(() => useCitySearch());

    // First search
    await act(async () => {
      result.current.searchCities('paris');
    });

    // Advance timers and wait for state update
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });

    // Verify API was called
    expect(mockGetQueryPredictions).toHaveBeenCalledTimes(1);
    expect(result.current.searchResult.status).toBe('success');
    expect(result.current.searchResult.results[0].name).toBe('Paris');
    expect(result.current.searchResult.fromCache).toBe(false);

    // 2nd identical query - should use cache
    await act(async () => {
      result.current.searchCities('paris');
    });

    // Cache should return immediately, no need to wait for timers
    expect(result.current.searchResult.fromCache).toBe(true);
    expect(mockGetQueryPredictions).toHaveBeenCalledTimes(1); // Still only 1 call
    expect(result.current.searchResult.results[0].name).toBe('Paris');
  });

  it('debounces to 600 ms', async () => {
    mockGetQueryPredictions.mockClear();
    mockGetQueryPredictions.mockImplementation((request, cb) => {
      cb([{ 
        structured_formatting: { main_text: 'London' },
        description: 'London, UK' 
      }], 'OK');
    });

    const { result } = renderHook(() => useCitySearch());

    // rapid typing (need at least 2 chars for the hook to make API call)
    act(() => {
      result.current.searchCities('lo');
    });
    act(() => {
      result.current.searchCities('lon');
    });
    act(() => {
      result.current.searchCities('lond');
    });
    act(() => {
      result.current.searchCities('londo');
    });
    act(() => {
      result.current.searchCities('london');
    });

    // Should be loading
    expect(result.current.searchResult.status).toBe('loading');

    // Advance time but not enough for debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    // Should not have called API yet
    expect(mockGetQueryPredictions).not.toHaveBeenCalled();

    // Advance past debounce threshold
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Wait a bit more for the promise to resolve
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });

    // Now it should have been called
    expect(mockGetQueryPredictions).toHaveBeenCalledTimes(1);
    expect(mockGetQueryPredictions).toHaveBeenCalledWith(
      { input: 'london' },
      expect.any(Function)
    );
    expect(result.current.searchResult.status).toBe('success');
  });

  it('handles API error', async () => {
    mockGetQueryPredictions.mockClear();
    mockGetQueryPredictions.mockImplementationOnce((_, cb) =>
      cb([], 'ERROR'),
    );

    const { result } = renderHook(() => useCitySearch());
    
    await act(async () => {
      result.current.searchCities('berlin');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });

    expect(result.current.searchResult.status).toBe('error');
    expect(result.current.searchResult.results).toHaveLength(0);
    expect(result.current.searchResult.error).toContain('Places API error: ERROR');
  });
}); 