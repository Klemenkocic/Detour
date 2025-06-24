import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, MapPin, Edit2, Check, XCircle, AlertCircle, Search, Heart, Info, Navigation, Home } from 'lucide-react';
import { City, TripPlan, CityStay } from '../types/trip';
import { CityDiscoveryService } from '../services/CityDiscoveryService';
import { useTripPlan, setTripPlan } from '../store/tripStore';
import TabContainer from './TabContainer';
import DayTab from './DayTab';
import DistanceWarningModal from './DistanceWarningModal';
import { unlockTrip } from '../hooks/useUnlockTrip';
import { useAuth } from '../contexts/AuthContext';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../config/firebase';

interface TripSidebarV2Props {
  isVisible: boolean;
  onClose: () => void;
}

export default function TripSidebarV2({ isVisible, onClose }: TripSidebarV2Props) {
  const tripPlan = useTripPlan();
  const { currentUser, signInAnonymous, getIdToken } = useAuth();
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

  const handleSaveDays = (cityName: string) => {
    if (!editedDays[cityName]) return;

    // Create updated trip plan
    const updatedCityStays = tripPlan.cityStays.map((stay: CityStay) => {
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
    const recalculatedStays = updatedCityStays.map((stay: CityStay) => ({
      ...stay,
      startDay: currentDay,
      endDay: currentDay + stay.days - 1,
      ...(currentDay += stay.days, {})
    }));

    const updatedPlan: TripPlan = {
      ...tripPlan,
      cityStays: recalculatedStays,
      totalDays: recalculatedStays.reduce((sum: number, stay: CityStay) => sum + stay.days, 0)
    };

    setTripPlan(updatedPlan);
    setEditingCity(null);
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
      const allEuropeanCities = await cityDiscoveryService.getAllEuropeanCities();
      const queryLower = query.toLowerCase();
      const matchingCities = allEuropeanCities.filter((city: City) => {
        if (!city || !city.name) return false;
        const nameMatch = city.name.toLowerCase().includes(queryLower);
        const countryMatch = city.country && city.country.toLowerCase().includes(queryLower);
        return nameMatch || countryMatch;
      });
      
      matchingCities.sort((a: City, b: City) => {
        const aExact = a.name.toLowerCase() === queryLower;
        const bExact = b.name.toLowerCase() === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return b.population - a.population;
      });
      
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
    
    if (distance > 200) {
      setShowDistanceWarning(true);
    } else {
      handleSaveCity(cityIndex, city);
    }
  };

  const handleSaveCity = async (stayIndex: number, newCity?: City) => {
    const cityToUse = newCity || selectedCity;
    if (!cityToUse) return;
    
    setLoadingSearch(true);
    
    try {
      const updatedCities = [...tripPlan.cities];
      updatedCities[stayIndex] = cityToUse;
      
      const updatedCityStays = [...tripPlan.cityStays];
      const stayToUpdate = updatedCityStays.find((stay: CityStay) => stay.city.name === tripPlan.cities[stayIndex].name);
      if (stayToUpdate) {
        updatedCityStays[updatedCityStays.indexOf(stayToUpdate)] = {
          ...stayToUpdate,
          city: cityToUse
        };
      }
      
      const updatedPlan: TripPlan = {
        ...tripPlan,
        cities: updatedCities,
        cityStays: updatedCityStays
      };

      setTripPlan(updatedPlan);
      handleCancelEdit();
    } catch (error) {
      console.error('Error updating city:', error);
      alert('Failed to update city. Please try again.');
    } finally {
      setLoadingSearch(false);
    }
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

  // Generate all day numbers for the trip
  const allDays: { stay: CityStay; dayNumber: number }[] = [];
  tripPlan.cityStays.forEach((stay: CityStay) => {
    for (let i = 0; i < stay.days; i++) {
      allDays.push({ stay, dayNumber: stay.startDay + i });
    }
  });

  const unlockTripHandler = async () => {
    try {
      console.log('🔐 Starting unlock trip process...');
      console.log('📍 Trip ID:', tripPlan?.id);
      console.log('📍 Firebase Auth initialized:', !!auth);
      console.log('📍 Current user:', auth?.currentUser);
      console.log('📍 Current user UID:', auth?.currentUser?.uid);
      
      // Check if user is authenticated
      if (!auth?.currentUser) {
        console.log('User not authenticated, signing in anonymously...');
        try {
          const userCredential = await signInAnonymously(auth);
          console.log('✅ Anonymous sign-in successful:', userCredential.user.uid);
        } catch (authError: any) {
          console.error('❌ Failed to sign in anonymously:', authError);
          console.error('Error code:', authError.code);
          console.error('Error message:', authError.message);
          
          // Check if it's an API key error
          if (authError.code === 'auth/api-key-not-valid') {
            alert('Firebase configuration error. Please contact support.');
            return;
          }
          
          alert('Authentication failed. Please try again.');
          return;
        }
      }

      console.log('🎫 Calling unlockTrip hook...');
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error('Failed to get authentication token');
      }
      await unlockTrip(tripPlan?.id || '', idToken);
      console.log('✅ Unlock trip completed');
    } catch (error: any) {
      console.error('❌ Failed to unlock trip:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      console.error('Failed to unlock trip. Please try again.');
    }
  };

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
      <TabContainer 
        activeTab={activeTab}
        allDays={allDays}
        onTabChange={setActiveTab}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' ? (
          <div className="p-4 space-y-4">
            <h3 className="text-lg font-semibold">Trip Overview</h3>
            
            {/* Debug information - remove in production */}
            {import.meta.env.DEV && (
              <div className="bg-gray-100 p-2 rounded text-xs">
                <p>Trip ID: {tripPlan?.id || 'No ID'}</p>
                <p>Premium: {tripPlan?.premium ? 'Yes' : 'No'}</p>
                <p>Auth State: {auth?.currentUser ? 'Authenticated' : 'Not authenticated'}</p>
              </div>
            )}
            
            {tripPlan && !tripPlan.premium && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2">🔒 Premium Features</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Unlock premium features for this trip including detailed itineraries, 
                  offline access, and more!
                </p>
                <button
                  onClick={unlockTripHandler}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded transition-colors"
                >
                  Unlock Trip - €4.99
                </button>
              </div>
            )}
          </div>
        ) : (
          (() => {
            const dayNumber = parseInt(activeTab.replace('day-', ''));
            const dayData = allDays.find(d => d.dayNumber === dayNumber);
            return dayData ? <DayTab stay={dayData.stay} dayNumber={dayNumber} tripPlan={tripPlan} /> : null;
          })()
        )}
      </div>

      {/* Distance Warning Modal */}
      <DistanceWarningModal
        isVisible={showDistanceWarning}
        selectedCity={selectedCity}
        originalCity={tripPlan.cities[currentCityIndex]}
        distance={selectedCity ? calculateDistance(tripPlan.cities[currentCityIndex]?.location, selectedCity.location) : 0}
        onCancel={() => {
          setShowDistanceWarning(false);
          setSelectedCity(null);
        }}
        onConfirm={() => {
          setShowDistanceWarning(false);
          handleSaveCity(currentCityIndex);
        }}
      />
    </motion.div>
  );
} 