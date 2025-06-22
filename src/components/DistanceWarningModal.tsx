import React from 'react';
import { AlertCircle } from 'lucide-react';
import { City } from '../types/trip';

interface DistanceWarningModalProps {
  isVisible: boolean;
  selectedCity: City | null;
  originalCity: City;
  distance: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function DistanceWarningModal({
  isVisible,
  selectedCity,
  originalCity,
  distance,
  onCancel,
  onConfirm
}: DistanceWarningModalProps) {
  if (!isVisible || !selectedCity) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold">City is far from route</h3>
        </div>
        
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {selectedCity.name} is {Math.round(distance)}km away from {originalCity.name}. 
          This is outside the recommended 200km range and may significantly affect your trip 
          duration and route.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-600"
          >
            Choose Another City
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    </div>
  );
} 