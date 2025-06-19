import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Car, Hotel, Calendar, Settings, AlertTriangle, CheckCircle, RefreshCw, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CarTripData {
  totalDistance: number;
  totalDuration: number; // in seconds
  estimatedDays: number;
  dailySegments: DaySegment[];
  accommodationSuggestions: AccommodationSuggestion[];
  totalCost: number;
  feasible: boolean;
  warnings: string[];
}

interface DaySegment {
  day: number;
  date: string;
  startLocation: string;
  endLocation: string;
  drivingTime: number; // in seconds
  distance: number; // in meters
  accommodationNeeded: boolean;
  suggestedAccommodation?: AccommodationSuggestion;
}

interface AccommodationSuggestion {
  name: string;
  rating: number;
  pricePerNight: number;
  location: google.maps.LatLngLiteral;
  placeId: string;
  type: string;
  bookingUrl?: string;
}

interface CarTripInfoProps {
  route: google.maps.DirectionsResult | null;
  tripSettings: {
    startTime: string;
    endTime: string;
    maxDailyHours: number;
    accommodationType: string;
    budget: number;
    tripType: 'ONE_WAY' | 'TWO_WAY';
    startDate: string;
    endDate: string;
  };
  isVisible: boolean;
  onClose: () => void;
  onSettingsChange: (newSettings: any) => void;
}

export default function CarTripInfo({ 
  route, 
  tripSettings, 
  isVisible, 
  onClose, 
  onSettingsChange 
}: CarTripInfoProps) {
  const [carTripData, setCarTripData] = useState<CarTripData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localSettings, setLocalSettings] = useState(tripSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local settings when tripSettings change
  useEffect(() => {
    setLocalSettings(tripSettings);
    setHasChanges(false);
  }, [tripSettings]);

  // Calculate car trip data when route or settings change
  useEffect(() => {
    if (route && route.routes[0] && isVisible) {
      calculateCarTrip();
    }
  }, [route, tripSettings, isVisible]);

  // Check for changes in local settings
  useEffect(() => {
    const hasSettingsChanged = 
      localSettings.startTime !== tripSettings.startTime ||
      localSettings.endTime !== tripSettings.endTime ||
      localSettings.maxDailyHours !== tripSettings.maxDailyHours ||
      localSettings.accommodationType !== tripSettings.accommodationType;
    
    setHasChanges(hasSettingsChanged);
  }, [localSettings, tripSettings]);

  const handleRefresh = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
  };

  const calculateCarTrip = async () => {
    if (!route || !route.routes[0]) return;
    
    setLoading(true);
    
    try {
      const leg = route.routes[0].legs[0];
      const totalDistance = leg.distance?.value || 0; // meters
      const totalDuration = leg.duration?.value || 0; // seconds
      
      // Calculate if trip is feasible
      const maxDailyDrivingSeconds = tripSettings.maxDailyHours * 3600;
      const estimatedDays = Math.ceil(totalDuration / maxDailyDrivingSeconds);
      
      // Check for edge cases
      const warnings: string[] = [];
      let feasible = true;
      
      // Check if same-day trip is impossible
      if (estimatedDays > 1 && tripSettings.startDate === tripSettings.endDate) {
        warnings.push("Same-day trip not possible with current driving limits");
        feasible = false;
      }
      
      // Check if trip exceeds available days
      const startDate = new Date(tripSettings.startDate);
      const endDate = new Date(tripSettings.endDate);
      const availableDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (estimatedDays > availableDays) {
        warnings.push(`Trip requires ${estimatedDays} days but only ${availableDays} days available`);
        feasible = false;
      }
      
      // Generate daily segments
      const dailySegments: DaySegment[] = [];
      const segmentDistance = totalDistance / estimatedDays;
      const segmentDuration = maxDailyDrivingSeconds;
      
      for (let i = 0; i < estimatedDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const isLastDay = i === estimatedDays - 1;
        const actualDuration = isLastDay ? (totalDuration % maxDailyDrivingSeconds) || maxDailyDrivingSeconds : segmentDuration;
        const actualDistance = isLastDay ? totalDistance - (segmentDistance * i) : segmentDistance;
        
        dailySegments.push({
          day: i + 1,
          date: date.toLocaleDateString(),
          startLocation: i === 0 ? leg.start_address || 'Start' : `Stop ${i}`,
          endLocation: isLastDay ? leg.end_address || 'End' : `Stop ${i + 1}`,
          drivingTime: actualDuration,
          distance: actualDistance,
          accommodationNeeded: !isLastDay,
        });
      }
      
      // Calculate accommodation costs
      const accommodationNights = estimatedDays - 1;
      const budgetPerNight = accommodationNights > 0 ? tripSettings.budget / accommodationNights : 0;
      
      if (accommodationNights > 0 && budgetPerNight < 30) {
        warnings.push(`Budget too low: €${budgetPerNight.toFixed(0)}/night. Minimum recommended: €30/night`);
        feasible = false;
      }
      
      // Generate mock accommodation suggestions (in real app, use Google Places API)
      const accommodationSuggestions: AccommodationSuggestion[] = [];
      for (let i = 0; i < accommodationNights; i++) {
        accommodationSuggestions.push({
          name: `${tripSettings.accommodationType === 'hotel' ? 'Hotel' : 'Motel'} Stop ${i + 1}`,
          rating: 3.5 + Math.random() * 1.5,
          pricePerNight: Math.min(budgetPerNight * 0.8 + Math.random() * budgetPerNight * 0.4, budgetPerNight),
          location: { lat: 0, lng: 0 }, // Would be calculated from route
          placeId: `mock_place_${i}`,
          type: tripSettings.accommodationType,
          bookingUrl: `https://booking.com/search?destination=stop${i + 1}`
        });
      }
      
      const totalCost = accommodationSuggestions.reduce((sum, acc) => sum + acc.pricePerNight, 0);
      
      setCarTripData({
        totalDistance,
        totalDuration,
        estimatedDays,
        dailySegments,
        accommodationSuggestions,
        totalCost,
        feasible,
        warnings
      });
      
    } catch (error) {
      console.error('Error calculating car trip:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible || !carTripData) return null;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    return `${Math.round(meters / 1000)} km`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-6 left-6 right-6 max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50"
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Car Trip Itinerary</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {carTripData.estimatedDays} days • {formatDistance(carTripData.totalDistance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button 
                  onClick={handleRefresh}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  title="Apply changes and refresh"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              )}
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="p-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
                title="Edit settings"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Feasibility Status */}
        {!carTripData.feasible && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-800 dark:text-red-200">Trip Not Feasible</h4>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-1">
                  {carTripData.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {isEditing && (
          <div className="p-4 bg-gray-50 dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
            <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Trip Settings</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Driving</span>
                <input
                  type="time"
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600"
                  value={localSettings.startTime}
                  onChange={(e) => setLocalSettings({ ...localSettings, startTime: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Stop Driving</span>
                <input
                  type="time"
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600"
                  value={localSettings.endTime}
                  onChange={(e) => setLocalSettings({ ...localSettings, endTime: e.target.value })}
                />
              </label>
            </div>
            <div className="mb-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Daily Driving Hours</span>
                <div className="flex items-center mt-1">
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="1"
                    className="flex-1 mr-3"
                    value={localSettings.maxDailyHours}
                    onChange={(e) => setLocalSettings({ ...localSettings, maxDailyHours: parseInt(e.target.value) })}
                  />
                  <span className="text-sm font-medium w-12">{localSettings.maxDailyHours}h</span>
                </div>
              </label>
            </div>
            <div className="mb-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Accommodation Preference</span>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600"
                  value={localSettings.accommodationType}
                  onChange={(e) => setLocalSettings({ ...localSettings, accommodationType: e.target.value })}
                >
                  <option value="hotel">Hotels</option>
                  <option value="motel">Motels</option>
                  <option value="lodge">Lodging</option>
                  <option value="any">Any</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Calculating trip...</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {/* Trip Summary */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{carTripData.estimatedDays}</div>
                  <div className="text-sm text-gray-500">Days</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">€{Math.round(carTripData.totalCost)}</div>
                  <div className="text-sm text-gray-500">Accommodation</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{formatDuration(carTripData.totalDuration)}</div>
                  <div className="text-sm text-gray-500">Total Driving</div>
                </div>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="p-4">
              <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Daily Itinerary</h4>
              <div className="space-y-3">
                {carTripData.dailySegments.map((segment, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {segment.day}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">Day {segment.day}</div>
                          <div className="text-sm text-gray-500">{segment.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatDuration(segment.drivingTime)}</div>
                        <div className="text-sm text-gray-500">{formatDistance(segment.distance)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{segment.startLocation} → {segment.endLocation}</span>
                    </div>

                    {segment.accommodationNeeded && carTripData.accommodationSuggestions[index] && (
                      <div className="mt-3 p-3 bg-white dark:bg-zinc-700 rounded border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Hotel className="w-4 h-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm">
                                {carTripData.accommodationSuggestions[index].name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ⭐ {carTripData.accommodationSuggestions[index].rating.toFixed(1)} • 
                                €{Math.round(carTripData.accommodationSuggestions[index].pricePerNight)}/night
                              </div>
                            </div>
                          </div>
                          <a
                            href={carTripData.accommodationSuggestions[index].bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                          >
                            Book
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
} 