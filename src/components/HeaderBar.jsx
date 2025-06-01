// src/components/HeaderBar.jsx
import { useState } from 'react';
import { Menu, Settings } from 'lucide-react';

/* Props
 * ─────
 * toggleDrawer : () ⇒ void   – called when ☰ is clicked
 */
export default function HeaderBar({ toggleDrawer }) {
  const [query, setQuery] = useState('');

  return (
    <div className="flex items-center gap-4 px-6 py-3 bg-white/90
                    dark:bg-zinc-900/80 backdrop-blur rounded-2xl shadow-lg">
      {/* App title */}
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Detour</h1>

      {/* Search box (placeholder) */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Munich"
        className="flex-1 min-w-0 px-3 py-1.5 rounded-md border
                   border-zinc-300 dark:border-zinc-700 bg-white/80
                   dark:bg-zinc-800/60 focus:outline-none
                   focus:ring-2 focus:ring-sky-500"
      />

      {/* Settings icon – does nothing … yet */}
      <button className="rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800">
        <Settings size={20} />
      </button>

      {/* ☰ Drawer toggle */}
      <button
        id="drawer-btn"
        onClick={toggleDrawer}
        className="rounded-lg p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800"
      >
        <Menu size={22} />
      </button>
    </div>
  );
}