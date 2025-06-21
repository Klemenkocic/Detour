import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, MapPin, Car, Clock, Edit2, Check, XCircle, AlertCircle, Search } from 'lucide-react';
import { TripPlan, CityStay, City } from '../types/trip';
import { CityDiscoveryService } from '../services/CityDiscoveryService';

interface TripSidebarV2Props {
  tripPlan: TripPlan | null;
  isVisible: boolean;
  onClose: () => void;
  onUpdateTrip?: (updatedPlan: TripPlan) => void;
}

interface AlternativeCity extends City {
  distance: number; // Distance from original city in km
  detourDistance: number; // Additional distance added to route
}

export default function TripSidebarV2({ tripPlan, isVisible, onClose, onUpdateTrip }: TripSidebarV2Props) {
  const [activeTab, setActiveTab] = useState('overview');
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [editingCityName, setEditingCityName] = useState<string | null>(null);
  const [editedDays, setEditedDays] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [showDistanceWarning, setShowDistanceWarning] = useState(false);
  const [currentCityIndex, setCurrentCityIndex] = useState<number>(-1);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [cityDiscoveryService] = useState(() => new CityDiscoveryService());
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset when trip plan changes
  useEffect(() => {
    setActiveTab('overview');
    setEditingCity(null);
    setEditingCityName(null);
    setEditedDays({});
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCity(null);
    setShowDistanceWarning(false);
  }, [tripPlan]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchCities(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (!isVisible || !tripPlan) return null;

  const formatDistance = (meters: number) => {
    return `${Math.round(meters / 1000)} km`;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    // Scroll to center the selected tab
    if (tabsContainerRef.current && tabId !== 'overview') {
      const container = tabsContainerRef.current;
      const activeTabElement = container.querySelector(`[data-tab-id="${tabId}"]`);
      
      if (activeTabElement) {
        const containerWidth = container.offsetWidth;
        const tabLeft = (activeTabElement as HTMLElement).offsetLeft;
        const tabWidth = (activeTabElement as HTMLElement).offsetWidth;
        const scrollPosition = tabLeft - (containerWidth / 2) + (tabWidth / 2);
        
        container.scrollTo({
          left: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleEditDays = (cityName: string, currentDays: number) => {
    setEditingCity(cityName);
    setEditedDays({ ...editedDays, [cityName]: currentDays });
  };

  const handleSaveDays = (cityName: string) => {
    if (!onUpdateTrip || !editedDays[cityName]) return;

    // Create updated trip plan
    const updatedCityStays = tripPlan.cityStays.map(stay => {
      if (stay.city.name === cityName) {
        const newDays = editedDays[cityName];
        return {
          ...stay,
          days: newDays,
          endDay: stay.startDay + newDays - 1
        };
      }
      return stay;
    });

    // Recalculate start/end days for all cities
    let currentDay = 1;
    const recalculatedStays = updatedCityStays.map(stay => ({
      ...stay,
      startDay: currentDay,
      endDay: currentDay + stay.days - 1,
      ...(currentDay += stay.days, {})
    }));

    const updatedPlan: TripPlan = {
      ...tripPlan,
      cityStays: recalculatedStays,
      totalDays: recalculatedStays.reduce((sum, stay) => sum + stay.days, 0)
    };

    onUpdateTrip(updatedPlan);
    setEditingCity(null);
  };

  const handleCancelEdit = () => {
    setEditingCity(null);
    setEditingCityName(null);
    setEditedDays({});
    setSearchQuery('');
    setSearchResults([]);
    setSelectedCity(null);
    setShowDistanceWarning(false);
    setCurrentCityIndex(-1);
  };

  const calculateDistance = (coord1: google.maps.LatLngLiteral, coord2: google.maps.LatLngLiteral): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const searchCities = async (query: string) => {
    setLoadingSearch(true);
    
    try {
      // Use the city discovery service to search for cities
      const allEuropeanCities = await cityDiscoveryService.getAllEuropeanCities();
      
      // Filter cities by search query
      const queryLower = query.toLowerCase();
      const matchingCities = allEuropeanCities.filter((city: City) => {
        if (!city || !city.name) return false;
        
        const nameMatch = city.name.toLowerCase().includes(queryLower);
        const countryMatch = city.country && city.country.toLowerCase().includes(queryLower);
        
        return nameMatch || countryMatch;
      });
      
      // Sort by relevance (exact match first, then by population)
      matchingCities.sort((a: City, b: City) => {
        const aExact = a.name.toLowerCase() === queryLower;
        const bExact = b.name.toLowerCase() === queryLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then sort by population
        return b.population - a.population;
      });
      
      // Take top 10 results
      setSearchResults(matchingCities.slice(0, 10));
    } catch (error) {
      console.error('Error searching cities:', error);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleCitySelection = (city: City, originalCity: City, cityIndex: number) => {
    const distance = calculateDistance(originalCity.location, city.location);
    
    setSelectedCity(city);
    setCurrentCityIndex(cityIndex);
    
    // Check if city is too far (>200km)
    if (distance > 200) {
      setShowDistanceWarning(true);
    } else {
      // Proceed with city change
      handleSaveCity(cityIndex, city);
    }
  };

  const handleSaveCity = async (stayIndex: number, newCity?: City) => {
    if (!onUpdateTrip) return;
    
    const cityToUse = newCity || selectedCity;
    if (!cityToUse) return;
    
    setLoadingSearch(true);
    
    try {
      // Update the city in the trip plan
      const updatedCities = [...tripPlan.cities];
      updatedCities[stayIndex] = cityToUse;
      
      const updatedCityStays = [...tripPlan.cityStays];
      const stayToUpdate = updatedCityStays.find(stay => stay.city.name === tripPlan.cities[stayIndex].name);
      if (stayToUpdate) {
        updatedCityStays[updatedCityStays.indexOf(stayToUpdate)] = {
          ...stayToUpdate,
          city: cityToUse
        };
      }
      
      // Recalculate route segments using Google Directions API
      const updatedSegments = [...tripPlan.segments];
      
      // Helper function to calculate route
      const calculateRoute = async (from: City, to: City): Promise<{ distance: number; duration: number; route: google.maps.DirectionsResult | null }> => {
        if (!window.google?.maps) {
          // Fallback calculation
          const distance = calculateDistance(from.location, to.location) * 1000 * 1.3;
          const duration = distance / 1000 * 40; // 40 seconds per km estimate
          return { distance, duration, route: null };
        }
        
        return new Promise((resolve) => {
          const directionsService = new google.maps.DirectionsService();
          
          directionsService.route({
            origin: from.location,
            destination: to.location,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false,
            avoidHighways: false,
            avoidTolls: false
          }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
              const route = result.routes[0];
              const leg = route.legs[0];
              resolve({
                distance: leg.distance?.value || 0,
                duration: leg.duration?.value || 0,
                route: result
              });
            } else {
              // Fallback calculation
              const distance = calculateDistance(from.location, to.location) * 1000 * 1.3;
              const duration = distance / 1000 * 40;
              resolve({ distance, duration, route: null });
            }
          });
        });
      };
      
      // Update segment before this city (if exists)
      if (stayIndex > 0) {
        const prevCity = updatedCities[stayIndex - 1];
        const routeInfo = await calculateRoute(prevCity, cityToUse);
        
        updatedSegments[stayIndex - 1] = {
          ...updatedSegments[stayIndex - 1],
          from: prevCity,
          to: cityToUse,
          distance: routeInfo.distance,
          duration: routeInfo.duration,
          googleRoute: routeInfo.route
        };
      }
      
      // Update segment after this city (if exists)
      if (stayIndex < updatedCities.length - 1) {
        const nextCity = updatedCities[stayIndex + 1];
        const routeInfo = await calculateRoute(cityToUse, nextCity);
        
        updatedSegments[stayIndex] = {
          ...updatedSegments[stayIndex],
          from: cityToUse,
          to: nextCity,
          distance: routeInfo.distance,
          duration: routeInfo.duration,
          googleRoute: routeInfo.route
        };
      }
      
      // Recalculate total distance and driving time
      const totalDistance = updatedSegments.reduce((sum, seg) => sum + seg.distance, 0);
      const totalDrivingTime = updatedSegments.reduce((sum, seg) => sum + seg.duration, 0);
      
      const updatedPlan: TripPlan = {
        ...tripPlan,
        cities: updatedCities,
        cityStays: updatedCityStays,
        segments: updatedSegments,
        totalDistance,
        totalDrivingTime
      };
      
      onUpdateTrip(updatedPlan);
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating city:', error);
      alert('Failed to update city. Please try again.');
    } finally {
      setLoadingSearch(false);
    }
  };

  const renderOverviewTab = () => (
    <div className="p-4 space-y-4">
      {/* Route Overview */}
      <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
        <h4 className="font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Route Overview
        </h4>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {tripPlan.cities.map(c => c.name).join(' → ')}
        </div>
      </div>

      {/* Itinerary Cards */}
      <div>
        <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Trip Itinerary</h4>
        <div className="grid gap-3">
          {tripPlan.cityStays.map((stay, index) => {
            const cityIndex = tripPlan.cities.findIndex(c => c.name === stay.city.name);
            const isEditingDays = editingCity === stay.city.name;
            const isEditingCityName = editingCityName === stay.city.name;
            const segment = index > 0 ? tripPlan.segments[index - 1] : null;
            const isFirstCity = cityIndex === 0;
            const isLastCity = cityIndex === tripPlan.cities.length - 1;
            
            return (
              <div 
                key={index}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all"
                onClick={() => !isEditingDays && !isEditingCityName && handleTabChange(`day-${stay.startDay}`)}
              >
                {segment && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                    <Car className="w-3 h-3" />
                    <span>{formatDistance(segment.distance)} ({formatDuration(segment.duration)})</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 dark:text-white">
                      {stay.days > 0 ? `Days ${stay.startDay}-${stay.endDay}` : 'Departure'}
                    </h5>
                    
                    {isEditingCityName ? (
                      <div className="mt-2" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search for a city..."
                            className="w-full px-3 py-2 text-sm border rounded-lg dark:bg-zinc-700 dark:border-zinc-600 pr-8"
                            autoFocus
                          />
                          <Search className="absolute right-2 top-2.5 w-4 h-4 text-gray-400" />
                        </div>
                        
                        {/* Search Results */}
                        {searchResults.length > 0 && (
                          <div className="mt-2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {searchResults.map((city, idx) => {
                              const distance = calculateDistance(stay.city.location, city.location);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleCitySelection(city, stay.city, cityIndex)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-700 text-sm"
                                >
                                  <div className="font-medium">{city.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {city.country} • {Math.round(distance)}km away
                                    {distance > 200 && (
                                      <span className="text-yellow-600"> • Far from route</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        
                        {loadingSearch && (
                          <p className="text-xs text-gray-500 mt-1">Searching cities...</p>
                        )}
                        
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {stay.city.name}
                        </p>
                        {onUpdateTrip && !isFirstCity && !isLastCity && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingCityName(stay.city.name);
                              setSearchQuery('');
                              setTimeout(() => searchInputRef.current?.focus(), 100);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Change city"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {isEditingDays ? (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={editedDays[stay.city.name] || stay.days}
                          onChange={(e) => setEditedDays({ ...editedDays, [stay.city.name]: parseInt(e.target.value) || 0 })}
                          className="w-16 px-2 py-1 text-sm border rounded dark:bg-zinc-700 dark:border-zinc-600"
                        />
                        <button
                          onClick={() => handleSaveDays(stay.city.name)}
                          className="p-1 text-green-600 hover:bg-green-100 rounded"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-600 hover:bg-red-100 rounded"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {stay.days}
                        </span>
                        <span className="text-sm text-gray-500">
                          {stay.days === 1 ? 'day' : 'days'}
                        </span>
                        {onUpdateTrip && stay.days > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDays(stay.city.name, stay.days);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                
                {/* Warning for start/end cities */}
                {(isFirstCity || isLastCity) && isEditingCityName && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>Start and end cities cannot be changed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
        <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Trip Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Distance:</span>
            <p className="font-semibold">{formatDistance(tripPlan.totalDistance)}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Total Driving:</span>
            <p className="font-semibold">{formatDuration(tripPlan.totalDrivingTime)}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
            <p className="font-semibold">{formatDate(tripPlan.startDate)}</p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">End Date:</span>
            <p className="font-semibold">{formatDate(tripPlan.endDate)}</p>
          </div>
        </div>
      </div>

      {/* Distance Warning Modal */}
      {showDistanceWarning && selectedCity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold">City is far from route</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {selectedCity.name} is {Math.round(calculateDistance(tripPlan.cities[currentCityIndex].location, selectedCity.location))}km 
              away from {tripPlan.cities[currentCityIndex].name}. This is outside the recommended 200km range and may significantly 
              affect your trip duration and route.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDistanceWarning(false);
                  setSelectedCity(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600"
              >
                Choose Another City
              </button>
              <button
                onClick={() => {
                  setShowDistanceWarning(false);
                  handleSaveCity(currentCityIndex);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDayTab = (stay: CityStay, dayNumber: number) => {
    const segment = tripPlan.cityStays.findIndex(s => s === stay) > 0 
      ? tripPlan.segments[tripPlan.cityStays.findIndex(s => s === stay) - 1] 
      : null;

    return (
      <div className="p-4 space-y-4">
        {/* Day Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Day {dayNumber} - {stay.city.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(new Date(tripPlan.startDate.getTime() + (dayNumber - 1) * 24 * 60 * 60 * 1000))}
          </p>
        </div>

        {/* Driving Info */}
        {segment && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100 flex items-center gap-2">
              <Car className="w-4 h-4" />
              Travel to {stay.city.name}
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p>From: {segment.from.name}</p>
              <p>Distance: {formatDistance(segment.distance)}</p>
              <p>Duration: {formatDuration(segment.duration)}</p>
            </div>
          </div>
        )}

        {/* City Information */}
        <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
          <h4 className="font-medium mb-3 text-gray-900 dark:text-white">City Information</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">City:</span>
              <p className="font-semibold">{stay.city.name}</p>
            </div>
            {stay.city.population > 0 && (
              <div>
                <span className="text-gray-600 dark:text-gray-400">Population:</span>
                <p className="font-semibold">{stay.city.population.toLocaleString()}</p>
              </div>
            )}
            <div>
              <span className="text-gray-600 dark:text-gray-400">Importance Score:</span>
              <p className="font-semibold">{stay.city.importance}</p>
            </div>
          </div>
        </div>

        {/* Placeholder for future features */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            🚧 Coming soon: Daily itinerary with attractions, restaurants, and activities
          </p>
        </div>
      </div>
    );
  };

  // Generate all day numbers for the trip
  const allDays: { stay: CityStay; dayNumber: number }[] = [];
  tripPlan.cityStays.forEach(stay => {
    for (let i = 0; i < stay.days; i++) {
      allDays.push({ stay, dayNumber: stay.startDay + i });
    }
  });

  return (
    <motion.div
      initial={{ x: -400 }}
      animate={{ x: 0 }}
      exit={{ x: -400 }}
      className="fixed left-0 top-0 bottom-0 w-96 bg-white dark:bg-zinc-900 shadow-xl border-r border-zinc-200 dark:border-zinc-700 z-40 flex flex-col"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Trip Planner</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {tripPlan.totalDays} days • {formatDistance(tripPlan.totalDistance)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div 
          ref={tabsContainerRef}
          className="flex overflow-x-auto scrollbar-hide"
        >
          <button
            onClick={() => handleTabChange('overview')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Full Trip
          </button>
          {allDays.map(({ stay, dayNumber }) => (
            <button
              key={`day-${dayNumber}`}
              data-tab-id={`day-${dayNumber}`}
              onClick={() => handleTabChange(`day-${dayNumber}`)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === `day-${dayNumber}`
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Day {dayNumber}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab.startsWith('day-') && (() => {
          const dayNumber = parseInt(activeTab.split('-')[1]);
          const dayInfo = allDays.find(d => d.dayNumber === dayNumber);
          return dayInfo ? renderDayTab(dayInfo.stay, dayInfo.dayNumber) : null;
        })()}
      </div>
    </motion.div>
  );
} 