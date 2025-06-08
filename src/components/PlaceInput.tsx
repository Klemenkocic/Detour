// ──────────────────────────────────────────────
//  src/components/PlaceInput.tsx
//  Single Google Places-autocomplete input
// ──────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';

interface Props {
  placeholder: string;
  onSelect: (place: google.maps.places.Place) => void;
}

export default function PlaceInput({ placeholder, onSelect }: Props) {
  /* host <div> where we'll mount the web-component */
  const hostRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  
  /* track selected value for display */
  const [selectedValue, setSelectedValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!hostRef.current || !mounted) return;

      // Clear any existing element first (StrictMode safety)
      if (elementRef.current) {
        elementRef.current.remove();
        elementRef.current = null;
      }

      /* load the "places" library (noop if already loaded) */
      await google.maps.importLibrary('places');

      if (!mounted) return; // Component was unmounted during async operation

      // @ts-ignore  – types not yet published for the new element
      const pacEl = new google.maps.places.PlaceAutocompleteElement({
        // @ts-ignore
        includedPrimaryTypes: ['locality'],
      });

      /* apply placeholder + Tailwind classes directly to the element */
      pacEl.setAttribute('placeholder', placeholder);
      pacEl.setAttribute(
        'class',
        `w-full px-3 py-2 rounded-md border
         border-zinc-300 dark:border-zinc-700
         bg-white/80 dark:bg-zinc-800/60
         focus:outline-none focus:ring-2 focus:ring-sky-500`
      );

      /* fired when the user picks a suggestion */
      // @ts-ignore  – event typings not available yet
      pacEl.addEventListener('gmp-select', async (e) => {
        // @ts-ignore
        const place = e.placePrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'location', 'displayName', 'formattedAddress'],
        });
        
        // Update our local state with the selected value
        setSelectedValue(place.displayName || '');
        setIsEditing(false);
        
        onSelect(place);
      });

      if (hostRef.current && mounted) {
        hostRef.current.appendChild(pacEl);
        elementRef.current = pacEl;
      }
    })();

    /* teardown on unmount */
    return () => {
      mounted = false;
      if (elementRef.current) {
        elementRef.current.remove();
        elementRef.current = null;
      }
    };
  }, [placeholder, onSelect]);

  const handleEdit = () => {
    setIsEditing(true);
    // Focus the Google Places element
    if (elementRef.current) {
      const input = elementRef.current.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  };

  const handleClear = () => {
    setSelectedValue('');
    setIsEditing(true);
    // Clear and focus the Google Places element
    if (elementRef.current) {
      const input = elementRef.current.querySelector('input');
      if (input) {
        input.value = '';
        input.focus();
      }
    }
  };

  /* wrapper div with controlled input overlay */
  return (
    <div className="relative">
      <div 
        ref={hostRef} 
        className={selectedValue && !isEditing ? 'opacity-0 pointer-events-none absolute inset-0' : ''}
      />
      
      {/* Controlled input overlay showing selected value */}
      {selectedValue && !isEditing && (
        <div className="relative">
          <input
            type="text"
            value={selectedValue}
            readOnly
            onClick={handleEdit}
            className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            placeholder={placeholder}
          />
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
            type="button"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}