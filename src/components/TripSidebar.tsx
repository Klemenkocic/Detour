import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Car, 
  Clock, 
  Hotel, 
  Settings, 
  Edit3, 
  RefreshCw,
  X,
  ChevronRight,
  Star,
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { EnhancedTripData, TripSidebarProps } from '../types/trip';

export default function TripSidebar({ 
  tripData, 
  isVisible, 
  onClose, 
  onSettingsChange,
  onDaySettingsChange 
}: TripSidebarProps) {
  const [activeTab, setActiveTab] = useState<string>('full');
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isEditingDay, setIsEditingDay] = useState<number | null>(null);
  const [localTripSettings, setLocalTripSettings] = useState(tripData?.tripSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local settings when tripData changes
  useEffect(() => {
    if (tripData) {
      setLocalTripSettings(tripData.tripSettings);
      setHasChanges(false);
    }
  }, [tripData]);

  // Check for changes in settings
  useEffect(() => {
    if (tripData && localTripSettings) {
      const hasSettingsChanged = 
        localTripSettings.startCity !== tripData.tripSettings.startCity ||
        localTripSettings.endCity !== tripData.tripSettings.endCity ||
        localTripSettings.startDate !== tripData.tripSettings.startDate ||
        localTripSettings.endDate !== tripData.tripSettings.endDate ||
        localTripSettings.budget !== tripData.tripSettings.budget;
      
      setHasChanges(hasSettingsChanged);
    }
  }, [localTripSettings, tripData]);

  if (!isVisible || !tripData) return null;

  const handleRefreshTrip = () => {
    if (localTripSettings) {
      onSettingsChange(localTripSettings);
      setHasChanges(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    return `${Math.round(meters / 1000)} km`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'drive': return <Car className="w-4 h-4" />;
      case 'attraction': return <MapPin className="w-4 h-4" />;
      case 'meal': return <span className="w-4 h-4 text-center">🍽️</span>;
      case 'accommodation': return <Hotel className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
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
              <h3 className="font-semibold text-gray-900 dark:text-white">Trip Itinerary</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {tripData.totalDays} days • {formatDistance(tripData.totalDistance)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button 
                onClick={handleRefreshTrip}
                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                title="Apply changes and refresh"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Feasibility Status */}
      {!tripData.feasible && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">Trip Issues</h4>
              <ul className="text-sm text-red-700 dark:text-red-300 mt-1 space-y-1">
                {tripData.warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('full')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'full'
                ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Full Trip
          </button>
          
          {tripData.dailyItineraries.map((day) => (
            <button
              key={day.day}
              onClick={() => setActiveTab(`day-${day.day}`)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === `day-${day.day}`
                  ? 'border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Day {day.day}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'full' ? (
            <motion.div
              key="full-trip"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 space-y-6"
            >
              {/* Trip Overview */}
              <div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Itinerary Overview
                </h4>
                
                <div className="space-y-3">
                  {tripData.route.cities.map((city, index) => {
                    const daysInCity = tripData.dailyItineraries.filter(day => day.city === city).length;
                    const firstDay = tripData.dailyItineraries.find(day => day.city === city);
                    
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">{city}</div>
                          <div className="text-sm text-gray-500">
                            {daysInCity} day{daysInCity > 1 ? 's' : ''} • {firstDay?.date}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trip Settings */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Trip Settings
                  </h4>
                  <button 
                    onClick={() => setIsEditingTrip(!isEditingTrip)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    title="Edit trip settings"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                {isEditingTrip && localTripSettings ? (
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</span>
                        <input
                          type="date"
                          className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600"
                          value={localTripSettings.startDate}
                          onChange={(e) => setLocalTripSettings({ 
                            ...localTripSettings, 
                            startDate: e.target.value 
                          })}
                        />
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</span>
                        <input
                          type="date"
                          className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600"
                          value={localTripSettings.endDate}
                          onChange={(e) => setLocalTripSettings({ 
                            ...localTripSettings, 
                            endDate: e.target.value 
                          })}
                        />
                      </label>
                    </div>
                    
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Budget (€)</span>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-700 dark:border-zinc-600"
                        value={localTripSettings.budget}
                        onChange={(e) => setLocalTripSettings({ 
                          ...localTripSettings, 
                          budget: parseInt(e.target.value) || 0 
                        })}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Start City:</span>
                      <span className="font-medium">{tripData.tripSettings.startCity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">End City:</span>
                      <span className="font-medium">{tripData.tripSettings.endCity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Dates:</span>
                      <span className="font-medium">
                        {new Date(tripData.tripSettings.startDate).toLocaleDateString()} - {new Date(tripData.tripSettings.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Transport:</span>
                      <span className="font-medium">{tripData.tripSettings.transportMode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Trip Type:</span>
                      <span className="font-medium">{tripData.tripSettings.tripType.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Budget:</span>
                      <span className="font-medium">€{tripData.tripSettings.budget}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cost Breakdown */}
              <div>
                <h4 className="font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Cost Breakdown
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Accommodation:</span>
                    <span className="font-medium">€{Math.round(tripData.costs.accommodation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Food (estimated):</span>
                    <span className="font-medium">€{Math.round(tripData.costs.breakdown.food || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fuel (estimated):</span>
                    <span className="font-medium">€{Math.round(tripData.costs.breakdown.fuel || 0)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total Estimated:</span>
                      <span className={tripData.costs.estimated > tripData.tripSettings.budget ? 'text-red-600' : 'text-green-600'}>
                        €{Math.round(tripData.costs.estimated)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Budget: €{tripData.tripSettings.budget}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            // Individual Day Content
            (() => {
              const dayNumber = parseInt(activeTab.split('-')[1]);
              const dayData = tripData.dailyItineraries.find(day => day.day === dayNumber);
              
              if (!dayData) return null;

              return (
                <motion.div
                  key={`day-${dayNumber}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-4 space-y-6"
                >
                  {/* Day Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-white">
                        Day {dayData.day} - {dayData.city}
                      </h4>
                      <span className="text-sm text-gray-500">{dayData.date}</span>
                    </div>
                    
                    {dayData.drivingFromPrevious && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                        <Car className="w-4 h-4" />
                        <span>
                          Drive from previous city: {formatDuration(dayData.drivingFromPrevious.duration)} 
                          ({formatDistance(dayData.drivingFromPrevious.distance)})
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Daily Schedule */}
                  <div>
                    <h5 className="font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Schedule
                    </h5>
                    
                    <div className="space-y-3">
                      {dayData.schedule.map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                          <div className="flex items-center justify-center w-8 h-8 bg-white dark:bg-zinc-700 rounded-full border-2 border-gray-200 dark:border-zinc-600">
                            {getActivityIcon(item.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">{item.activity}</span>
                              <span className="text-sm text-gray-500">{item.time}</span>
                            </div>
                            {item.location && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                📍 {item.location}
                              </div>
                            )}
                            {item.duration && (
                              <div className="text-sm text-gray-500 mt-1">
                                Duration: {item.duration} minutes
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accommodation */}
                  {dayData.accommodation && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          <Hotel className="w-4 h-4" />
                          Accommodation
                        </h5>
                        <button 
                          onClick={() => setIsEditingDay(isEditingDay === dayNumber ? null : dayNumber)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded transition-colors"
                          title="Change hotel"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h6 className="font-medium text-gray-900 dark:text-white">
                              {dayData.accommodation.name}
                            </h6>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center">
                                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                <span className="text-sm ml-1">{dayData.accommodation.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-sm text-gray-500">•</span>
                              <span className="text-sm font-medium text-green-600">
                                €{Math.round(dayData.accommodation.pricePerNight)}/night
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {dayData.accommodation.type.charAt(0).toUpperCase() + dayData.accommodation.type.slice(1)}
                            </div>
                          </div>
                          <a
                            href={dayData.accommodation.bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            Book
                          </a>
                        </div>
                        
                        {isEditingDay === dayNumber && (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-zinc-600">
                            <h6 className="font-medium mb-2">Hotel Options</h6>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Alternative accommodation options will be available here.
                            </p>
                            <div className="mt-3 text-sm text-blue-600">
                              🚧 More settings coming soon...
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Day Settings */}
                  <div>
                    <h5 className="font-medium mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Day Settings
                    </h5>
                    
                    <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Currently you can only change accommodation. More customization options will be added soon:
                      </div>
                      <ul className="mt-2 text-sm text-gray-500 space-y-1">
                        <li>• Activity scheduling</li>
                        <li>• Restaurant reservations</li>
                        <li>• Local transportation</li>
                        <li>• Custom attractions</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              );
            })()
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 