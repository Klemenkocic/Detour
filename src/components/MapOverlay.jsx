export default function MapOverlay({ children }) {
    return (
      <div
        className="
          absolute left-0 top-0
          w-full z-10   /* sits above the map */
          pointer-events-none   /* don’t block map clicks */
          flex justify-center   /* center contents */
        "
      >
        {/* inner wrapper can accept clicks if needed */}
        <div className="pointer-events-auto">{children}</div>
      </div>
    );
  }