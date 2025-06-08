// ────────────────────────────────────────────────────────────────
// src/components/Map.tsx – main map + UI chrome
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

import detourStyle from './detourMapStyle.js';
import MapOverlay from './MapOverlay.jsx';
import HeaderBar from './HeaderBar.jsx';
import Drawer from './Drawer.jsx';
import TripSetup from '../pages/TripSetup';

const libraries: Library[] = ['places'];

export default function Map() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [route, setRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserPos({ lat: coords.latitude, lng: coords.longitude });
        console.log('✅ User location found:', coords.latitude, coords.longitude);
      },
      (error) => {
        console.log('📍 Location access denied or failed, defaulting to Munich');
        console.log('Error:', error.message);
        // Don't set userPos, let it remain null to use Munich as fallback
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [isLoaded]);

  if (loadError) return <p className="p-4 text-red-500">Error loading Google Maps API</p>;
  if (!isLoaded) return <p className="p-4">Loading Maps…</p>;

  // Munich coordinates: 48.1351° N, 11.5820° E
  const center = userPos ?? { lat: 48.1351, lng: 11.5820 };

  const mapOptions: google.maps.MapOptions = {
    styles: detourStyle,
    disableDefaultUI: true,
    zoomControl: true,
  };

  return (
    <div className="relative w-full h-screen">
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={center}
        zoom={userPos ? 13 : 10}
        options={mapOptions}
      >
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

        {route && <DirectionsRenderer directions={route} />}
      </GoogleMap>

      <MapOverlay>
        <HeaderBar
          toggleDrawer={() => setDrawerOpen((o) => !o)}
          openWizard={() => setWizardOpen(true)}
        />
      </MapOverlay>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {wizardOpen && <TripSetup onClose={() => setWizardOpen(false)} onTripCreated={setRoute} />}
    </div>
  );
}