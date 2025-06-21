// ────────────────────────────────────────────────
//  src/components/HeaderBar.jsx
//  Top-bar with "new trip" (＋) and other controls
// ────────────────────────────────────────────────
import { Plus, Route, Car } from 'lucide-react';

/* Props
   ──────
   openWizard   : () ⇒ void   – open the right-hand trip-setup wizard
   showTransitInfo : () ⇒ void – show transit information (optional)
   hasTransitRoute : boolean   – whether there's a public transport route available (optional)
   showCarTripInfo : () ⇒ void – show car trip information (optional)
   hasCarRoute : boolean       – whether there's a car route available (optional)      */
export default function HeaderBar({ openWizard, showTransitInfo, hasTransitRoute, showCarTripInfo, hasCarRoute }) {
  return (
    <div className="flex items-center gap-4 px-6 py-3
                    bg-white/90 dark:bg-zinc-900/80
                    backdrop-blur rounded-2xl shadow-lg">
      {/* Logo / title */}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        Detour
      </h1>



      {/* Transit info button (only show if there's a transit route) */}
      {hasTransitRoute && (
        <button
          onClick={showTransitInfo}
          className="rounded-lg p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          title="Show transit information"
        >
          <Route size={20} />
        </button>
      )}

      {/* Car trip info button (only show if there's a car route) */}
      {hasCarRoute && (
        <button
          onClick={showCarTripInfo}
          className="rounded-lg p-2 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400"
          title="Show car trip information"
        >
          <Car size={20} />
        </button>
      )}

      {/* ＋ open Trip-Setup wizard */}
      <button
        onClick={openWizard}
        className="rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        title="Create new trip"
      >
        <Plus size={20} />
      </button>
    </div>
  );
}