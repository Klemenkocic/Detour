import React from 'react';
import { Car } from 'lucide-react';
import { CityStay, TripPlan } from '../types/trip';

interface DayTabProps {
  stay: CityStay;
  dayNumber: number;
  tripPlan: TripPlan;
}

export default function DayTab({ stay, dayNumber, tripPlan }: DayTabProps) {
  const segment = tripPlan.cityStays.findIndex(s => s === stay) > 0 
    ? tripPlan.segments[tripPlan.cityStays.findIndex(s => s === stay) - 1] 
    : null;

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
} 