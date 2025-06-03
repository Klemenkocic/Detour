// ────────────────────────────────────────────────────────────────
//  src/components/Map.tsx   – main map + chrome
// ────────────────────────────────────────────────────────────────
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  useLoadScript,
} from '@react-google-maps/api';
import { useEffect, useState } from 'react';
import type { Library } from '@googlemaps/js-api-loader';

import detourStyle   from './detourMapStyle.js';
import MapOverlay    from './MapOverlay.jsx';
import HeaderBar     from './HeaderBar.jsx';
import Drawer        from './Drawer.jsx';
import TripSetup     from '../pages/TripSetup';

// —— keep this array OUTSIDE the component so its identity never changes
const libraries: Library[] = ['places'];

export default function Map() {
  /* 1️⃣  Load Maps JS API (+ Places) */
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  /* 2️⃣  Local state */
  const [userPos   , setUserPos]    = useState<google.maps.LatLngLiteral | null>(null);
  const [route     , setRoute]      = useState<google.maps.DirectionsResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  /* 3️⃣  Geolocation */
  useEffect(() => {
    if (!isLoaded) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserPos({ lat: coords.latitude, lng: coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [isLoaded]);

  /* 4️⃣  Early states */
  if (loadError) return <p className="p-4 text-red-500">Error loading Google Maps API</p>;
  if (!isLoaded)  return <p className="p-4">Loading Maps…</p>;

  /* 5️⃣  Map constants */
  const paris  : google.maps.LatLngLiteral = { lat: 48.8566, lng: 2.3522 };
  const center = userPos ?? paris;
  const askDirections = !route && userPos;

  const mapOptions: google.maps.MapOptions = {
    styles: detourStyle,
    disableDefaultUI: true,
    zoomControl: true,
  };

  /* 6️⃣  Render */
  return (
    <div className="relative w-full h-screen">
      {/* MAP */}
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={center}
        zoom={userPos ? 13 : 10}
        options={mapOptions}
      >
        <Marker position={paris} title="Paris" />
        {userPos && (
          <Marker
            position={userPos}
            title="You are here"
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#fff',
            }}
          />
        )}

        {askDirections && (
          <DirectionsService
            options={{
              origin: userPos!,
              destination: paris,
              travelMode: google.maps.TravelMode.DRIVING,
            }}
            callback={(res) => res && setRoute(res)}
          />
        )}

        {route && <DirectionsRenderer directions={route} />}
      </GoogleMap>

      {/* OVERLAYS */}
      <MapOverlay>
        <HeaderBar
          toggleDrawer={() => setDrawerOpen((o) => !o)}
          openWizard={()  => setWizardOpen(true)}
        />
      </MapOverlay>

      <Drawer    open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {wizardOpen && <TripSetup onClose={() => setWizardOpen(false)} />}
    </div>
  );
}