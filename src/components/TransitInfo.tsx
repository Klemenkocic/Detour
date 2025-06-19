import React from 'react';
import { Clock, MapPin, Route, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TransitInfoProps {
  route: google.maps.DirectionsResult | null;
  tripType: 'ONE_WAY' | 'TWO_WAY';
  isVisible: boolean;
  onClose: () => void;
}

export default function TransitInfo({ route, tripType, isVisible, onClose }: TransitInfoProps) {
  if (!route || !route.routes[0] || !isVisible) return null;

  const leg = route.routes[0].legs[0];
  const oneWayDuration = leg.duration?.value || 0;
  const oneWayDistance = leg.distance?.value || 0;
  
  const totalDuration = tripType === 'TWO_WAY' ? oneWayDuration * 2 : oneWayDuration;
  const totalDistance = tripType === 'TWO_WAY' ? oneWayDistance * 2 : oneWayDistance;

  // Extract transit steps
  const transitSteps = leg.steps.filter(step => step.travel_mode === 'TRANSIT' && step.transit);
  const walkingSteps = leg.steps.filter(step => step.travel_mode === 'WALKING');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="absolute bottom-6 left-6 right-6 max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-50"
      >
        {/* Header */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Route className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Public Transport Route</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{tripType === 'TWO_WAY' ? 'Round Trip' : 'One Way'}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Route Summary */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Total Time</div>
                <div className="font-semibold">{Math.round(totalDuration / 60)} min</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <div>
                <div className="text-sm text-gray-500">Total Distance</div>
                <div className="font-semibold">{Math.round(totalDistance / 1000)} km</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transit Steps */}
        <div className="p-4 max-h-64 overflow-y-auto">
          <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Transit Instructions</h4>
          <div className="space-y-3">
            {leg.steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                {step.travel_mode === 'TRANSIT' && step.transit ? (
                  <>
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {step.transit.line?.name || 'Transit'}
                        </span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                          {step.transit.line?.vehicle?.name || step.transit.line?.vehicle?.type}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <div className="flex items-center gap-1">
                          <span>From:</span>
                          <span className="font-medium">{step.transit.departure_stop?.name}</span>
                          {step.transit.departure_time && (
                            <span className="text-green-600 dark:text-green-400">
                              ({step.transit.departure_time.text})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span>To:</span>
                          <span className="font-medium">{step.transit.arrival_stop?.name}</span>
                          {step.transit.arrival_time && (
                            <span className="text-red-600 dark:text-red-400">
                              ({step.transit.arrival_time.text})
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500">{step.duration?.text}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1">
                        Walk {step.duration?.text} ({step.distance?.text})
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {step.instructions?.replace(/<[^>]*>/g, '')}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        {tripType === 'TWO_WAY' && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ArrowRight className="w-4 h-4" />
              <span className="text-xs">Times and distances shown are doubled for round trip</span>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
} 