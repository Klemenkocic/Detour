import { motion } from 'framer-motion';

/** A left-hand slide-in panel.
 *  Props
 *  ────
 *  open      – boolean (show / hide)
 *  onClose   – () ⇒ void  (called when the backdrop is clicked)
 */
export default function Drawer({ open, onClose, children }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-zinc-900 shadow-xl flex flex-col"
        initial={{ x: '-100%' }}
        animate={{ x: open ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* header */}
        <div className="p-4 border-b dark:border-zinc-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Trip options</h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>

        {/* body (placeholder – replace with controls later) */}
        <div className="p-4 flex-1 space-y-4 overflow-y-auto">
          <p className="text-zinc-600 dark:text-zinc-400">
            Coming next: fuel-type selector, avoid-tolls toggle, etc.
          </p>
        </div>
      </motion.aside>
    </>
  );
}