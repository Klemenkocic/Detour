// src/pages/TripSetup.tsx
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import StepWizard from '../components/StepWizard';
import PlaceInput from '../components/PlaceInput';
import { TripDraft } from '../types/trip';

interface Props {
  onClose: () => void;
  onTripCreated: (route: google.maps.DirectionsResult | null) => void;
}

export default function TripSetup({ onClose, onTripCreated }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TripDraft>({
    start: null,
    end: null,
    startDate: '',
    endDate: '',
    mode: 'CAR',
    budget: 0,
  });

  const next = () => setStep((s) => Math.min(s + 1, 3));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleStartSelect = (place: google.maps.places.Place) => {
    const location = place.location!;
    setDraft((prev) => ({
      ...prev,
      start: {
        label: place.displayName!,
        placeId: place.id!,
        location: {
          lat: (typeof location.lat === 'function' ? location.lat() : location.lat) as number,
          lng: (typeof location.lng === 'function' ? location.lng() : location.lng) as number,
        },
      },
    }));
  };

  const handleEndSelect = (place: google.maps.places.Place) => {
    const location = place.location!;
    setDraft((prev) => ({
      ...prev,
      end: {
        label: place.displayName!,
        placeId: place.id!,
        location: {
          lat: (typeof location.lat === 'function' ? location.lat() : location.lat) as number,
          lng: (typeof location.lng === 'function' ? location.lng() : location.lng) as number,
        },
      },
    }));
  };

  const createTrip = () => {
    if (draft.start && draft.end) {
      // Create a proper DirectionsRequest to get a real route
      const directionsService = new google.maps.DirectionsService();
      
      directionsService.route(
        {
          origin: draft.start.location,
          destination: draft.end.location,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            onTripCreated(result);
          } else {
            console.error('Directions request failed due to', status);
            // Still call the callback with null to indicate failure
            onTripCreated(null);
          }
          onClose();
        }
      );
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="trip-backdrop"
        className="fixed inset-0 z-40 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.aside
        key="trip-modal"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-zinc-900 shadow-xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <header className="p-5 border-b dark:border-zinc-700 flex justify-between">
          <h2 className="text-2xl font-semibold">Create Trip</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800">
            <X size={20} />
          </button>
        </header>

        {/* PlaceInput components positioned outside the main container to avoid clipping */}
        {step === 0 && (
          <div className="absolute top-24 left-6 right-6 z-[60] space-y-4">
            <div className="relative z-[70]">
              <PlaceInput placeholder="Start city" onSelect={handleStartSelect} />
            </div>
            <div className="relative z-[65]">
              <PlaceInput placeholder="End city" onSelect={handleEndSelect} />
            </div>
          </div>
        )}

        <div className="p-6 flex-1 overflow-y-auto">
          <StepWizard step={step}>
            {/* Step 1: Placeholder for inputs (now positioned absolutely above) */}
            <div className="space-y-4">
              <div key="start-city-spacer" className="h-12 bg-transparent"></div> {/* Spacer for start city */}
              <div key="end-city-spacer" className="h-12 bg-transparent"></div> {/* Spacer for end city */}
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Start date</span>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-800"
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  value={draft.startDate || ''}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">End date</span>
                <input
                  type="date"
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-800"
                  onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                  value={draft.endDate || ''}
                />
              </label>
            </div>

            {/* Step 3: Travel Options */}
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium">Mode of Transport</span>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md dark:bg-zinc-800"
                  onChange={(e) => setDraft({ ...draft, mode: e.target.value as TripDraft['mode'] })}
                  value={draft.mode}
                >
                  <option value="CAR">Car</option>
                  <option value="RV">RV</option>
                  <option value="PUBLIC">Public Transport</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Budget (€)</span>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full mt-1 px-3 py-2 pr-8 border rounded-md dark:bg-zinc-800"
                    onChange={(e) => setDraft({ ...draft, budget: parseInt(e.target.value, 10) || 0 })}
                    value={draft.budget || ''}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                    $
                  </span>
                </div>
              </label>
            </div>

            {/* Step 4: Review */}
            <div>
              <pre className="text-xs bg-zinc-800/10 dark:bg-zinc-800 p-2 rounded">
                {JSON.stringify(draft, null, 2)}
              </pre>
              <button
                className="btn-primary mt-4 w-full px-4 py-2 rounded bg-blue-600 text-white font-medium"
                onClick={createTrip}
              >
                Create trip
              </button>
            </div>
          </StepWizard>
        </div>

        <footer className="p-5 border-t dark:border-zinc-700 flex justify-between">
          <button
            disabled={step === 0}
            onClick={back}
            className="px-4 py-2 rounded bg-zinc-200 disabled:opacity-50"
          >
            <ChevronLeft /> Back
          </button>
          {step < 3 ? (
            <button
              onClick={next}
              className="px-4 py-2 rounded bg-blue-600 text-white font-medium"
            >
              Next <ChevronRight />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-300"
            >
              Close
            </button>
          )}
        </footer>
      </motion.aside>
    </AnimatePresence>
  );
}