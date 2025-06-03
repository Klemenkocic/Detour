// ────────────────────────────────────────────────
//  src/components/HeaderBar.jsx
//  Top-bar with search, “new trip” (＋) and ☰ drawer
// ────────────────────────────────────────────────
import { useState } from 'react';
import { Menu, Plus, Settings } from 'lucide-react';

/* Props
   ──────
   toggleDrawer : () ⇒ void   – open/close the left options drawer
   openWizard   : () ⇒ void   – open the right-hand trip-setup wizard       */
export default function HeaderBar({ toggleDrawer, openWizard }) {
  const [query, setQuery] = useState('');

  return (
    <div className="flex items-center gap-4 px-6 py-3
                    bg-white/90 dark:bg-zinc-900/80
                    backdrop-blur rounded-2xl shadow-lg">
      {/* Logo / title */}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
        Detour
      </h1>

      {/* Search (placeholder) */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && setQuery('')}
        placeholder="Munich"
        className="flex-1 min-w-0 px-3 py-1.5 rounded-md border
                   border-zinc-300 dark:border-zinc-700
                   bg-white/80 dark:bg-zinc-800/60
                   focus:outline-none focus:ring-2 focus:ring-sky-500"
      />

      {/* Settings stub */}
      <button
        className="rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        title="Settings (coming soon)"
      >
        <Settings size={20} />
      </button>

      {/* ＋ open Trip-Setup wizard */}
      <button
        onClick={openWizard}
        className="rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        title="Create new trip"
      >
        <Plus size={20} />
      </button>

      {/* ☰ left drawer */}
      <button
        onClick={toggleDrawer}
        className="rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
        title="Trip options"
      >
        <Menu size={22} />
      </button>
    </div>
  );
}