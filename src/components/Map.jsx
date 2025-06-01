// src/components/Map.jsx
import {
  GoogleMap,
  Marker,
  DirectionsService,
  DirectionsRenderer,
  useLoadScript
} from '@react-google-maps/api';
import { useEffect, useState } from 'react';

import detourStyle   from './detourMapStyle.js';
import MapOverlay    from './MapOverlay.jsx';
import HeaderBar     from './HeaderBar.jsx';
import Drawer        from './Drawer.jsx';      // ← NEW

/* ----------------------------------------------------------------- */
/* Shows user position, a route to Paris, Detour styling & UI chrome  */
/* ----------------------------------------------------------------- */
export default function Map() {
  /* 1️⃣  ENV KEY */
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  /* 2️⃣  LOAD SCRIPT */
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey });

  /* 3️⃣  STATE */
  const [userPos,    setUserPos]   = useState(null);    // {lat,lng}
  const [geoErr,     setGeoErr]    = useState(null);    // string|null
  const [route,      setRoute]     = useState(null);    // DirectionsResult|null
  const [drawerOpen, setDrawerOpen]= useState(false);   // ⬅ side-panel

  /* 4️⃣  GEOLOCATION */
  useEffect(() => {
    if (!isLoaded) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setUserPos({ lat: coords.latitude, lng: coords.longitude }),
      err => setGeoErr(err.message),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [isLoaded]);

  /* 5️⃣  EARLY RETURNS */
  if (loadError)
    return <p className="p-4 text-red-500">Error loading Google Maps API</p>;
  if (!isLoaded)
    return <p className="p-4">Loading Maps…</p>;

  /* 6️⃣  CONSTANTS & OPTIONS */
  const paris   = { lat: 48.8566, lng: 2.3522 };
  const center  = userPos ?? paris;
  const askDirections = !route && userPos;

  const mapOptions = {
    styles: detourStyle,
    disableDefaultUI: true,
    zoomControl: true
  };

  /* 7️⃣  RENDER */
  return (
    <div className="relative w-full h-screen">
      {/* ——— Map layer ——— */}
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={center}
        zoom={userPos ? 13 : 10}
        options={mapOptions}
      >
        {/* destination */}
        <Marker position={paris}   title="Paris" />

        {/* user */}
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
              strokeColor: '#fff'
            }}
          />
        )}

        {/* route fetch */}
        {askDirections && (
          <DirectionsService
            options={{
              origin: userPos,
              destination: paris,
              travelMode: 'DRIVING'
            }}
            callback={res =>
              res?.status === 'OK'
                ? setRoute(res)
                : console.warn('Directions request failed', res)
            }
          />
        )}

        {/* render polyline */}
        {route && <DirectionsRenderer directions={route} />}
      </GoogleMap>

      {/* ——— Overlay (header) ——— */}
      <MapOverlay>
        <HeaderBar toggleDrawer={() => setDrawerOpen(o => !o)} />
      </MapOverlay>

      {/* ——— Side drawer ——— */}
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}