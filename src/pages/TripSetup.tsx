// ──────────────────────────────────
//  src/pages/TripSetup.tsx
//  Slide-in wizard for creating a trip
// ──────────────────────────────────
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import StepWizard  from '../components/StepWizard';
import PlaceInput  from '../components/PlaceInput';
import { TripDraft } from '../types/trip';

/* ────────────────────────────────── */
/* Main component                     */
/* ────────────────────────────────── */
interface Props {
  onClose: () => void;
}

export default function TripSetup({ onClose }: Props) {
  /* wizard step state */
  const [step, setStep] = useState(0);

  /* trip data state */
  const [draft, setDraft] = useState<TripDraft>({
    start     : null,
    end       : null,
    startDate : null,
    endDate   : null,
    mode      : 'CAR',
    budget    : 0,
  });

  const next = () => setStep(s => Math.min(s + 1, 3));
  const back = () => setStep(s => Math.max(s - 1, 0));

  /* handlers for place selection */
  const handleStartSelect = (place: google.maps.places.Place) => {
    console.log('Selected start city:', place.displayName);
    
    // Convert Google Maps Place to our internal Place type
    const location = (place.location
      ? typeof place.location.lat === 'function'
        ? { lat: place.location.lat(), lng: place.location.lng() }
        : place.location
      : { lat: 0, lng: 0 }) as google.maps.LatLngLiteral;
    
    const internalPlace = {
      label: place.displayName || 'Unknown location',
      placeId: place.id || '',
      location
    };
    
    setDraft(prev => ({ ...prev, start: internalPlace }));
  };

  const handleEndSelect = (place: google.maps.places.Place) => {
    console.log('Selected end city:', place.displayName);
    
    // Convert Google Maps Place to our internal Place type
    const location = (place.location
      ? typeof place.location.lat === 'function'
        ? { lat: place.location.lat(), lng: place.location.lng() }
        : place.location
      : { lat: 0, lng: 0 }) as google.maps.LatLngLiteral;
    
    const internalPlace = {
      label: place.displayName || 'Unknown location', 
      placeId: place.id || '',
      location
    };
    
    setDraft(prev => ({ ...prev, end: internalPlace }));
  };

  /* header titles per step (for later) */
  const titles = [
    'Create a trip',
    'Choose dates',
    'Travel options',
    'Review & create',
  ];

  /* ─────────────── JSX ─────────────── */
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="trip-backdrop"
        className="fixed inset-0 z-40 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Right-hand panel */}
      <motion.aside
        key="trip-panel"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-md
                   bg-white dark:bg-zinc-900 shadow-xl flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header (counter removed) */}
        <header className="p-5 border-b dark:border-zinc-700
                            flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{titles[step]}</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            <X size={20} />
          </button>
        </header>

        {/* Wizard body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <StepWizard step={step}>
            {/* STEP 1 – city pickers */}
            <div>
              <p className="mb-6 text-lg font-medium">
                Where are you starting and where do you want to end?
              </p>

              {/* Container height fixed → avoids the brief 'double-box' flash */}
              <div className="space-y-4">
                <PlaceInput
                  placeholder="Start city"
                  onSelect={handleStartSelect}
                />
                <PlaceInput
                  placeholder="End city"
                  onSelect={handleEndSelect}
                />
              </div>

              {/* Show selected cities */}
              {(draft.start || draft.end) && (
                <div className="mt-6 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">Selected:</p>
                  {draft.start && (
                    <div className="text-sm">
                      <strong>Start:</strong> {draft.start.label}
                    </div>
                  )}
                  {draft.end && (
                    <div className="text-sm">
                      <strong>End:</strong> {draft.end.label}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2 – date picker (stub) */}
            <div>
              <p className="mb-6 text-lg font-medium">
                Dates&nbsp;•&nbsp;<span className="text-sm opacity-60">coming soon</span>
              </p>
            </div>

            {/* STEP 3 – options (stub) */}
            <div>
              <p className="mb-6 text-lg font-medium">
                Travel options&nbsp;•&nbsp;<span className="text-sm opacity-60">coming soon</span>
              </p>
            </div>

            {/* STEP 4 – review */}
            <div>
              <p className="mb-6 text-lg font-medium">Review &amp; create</p>
              <pre className="text-xs bg-zinc-800/10 dark:bg-zinc-800/40
                               p-4 rounded whitespace-pre-wrap">
{JSON.stringify(draft, null, 2)}
              </pre>
              <button
                className="btn-primary w-full mt-6 py-2 rounded-lg
                           bg-emerald-600 hover:bg-emerald-700
                           text-white font-semibold"
              >
                Create trip
              </button>
            </div>
          </StepWizard>
        </div>

        {/* Footer nav */}
        <footer className="p-5 border-t dark:border-zinc-800 flex justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                       bg-zinc-200 dark:bg-zinc-800
                       hover:bg-zinc-300 dark:hover:bg-zinc-700
                       disabled:opacity-40"
          >
            <ChevronLeft size={18} /> Back
          </button>

          {step < 3 ? (
            <button
              onClick={next}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-sky-600 hover:bg-sky-700
                         text-white font-medium"
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-lg
                         bg-zinc-300 dark:bg-zinc-700
                         hover:bg-zinc-400 dark:hover:bg-zinc-600"
            >
              Close
            </button>
          )}
        </footer>
      </motion.aside>
    </AnimatePresence>
  );
}