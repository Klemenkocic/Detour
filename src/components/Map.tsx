// ────────────────────────────────────────────────────────────────
// src/components/Map.tsx – main map + UI chrome
// ────────────────────────────────────────────────────────────────
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useLoadScript,
} from '@react-google-maps/api';
import { useEffect, useState } from 'react';
import type { Library } from '@googlemaps/js-api-loader';

// @ts-ignore
import detourStyle from './detourMapStyle.js';
// @ts-ignore
import MapOverlay from './MapOverlay.jsx';
// @ts-ignore
import HeaderBar from './HeaderBar.jsx';
import TripSetup from '../pages/TripSetup';
import TransitInfo from './TransitInfo';
import TripSidebarV2 from './TripSidebarV2';
import { TripPlanningOrchestrator } from '../services/TripPlanningOrchestrator';
import { TripRequest, TripPlan } from '../types/trip';

const libraries: Library[] = ['places'];

export default function Map() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [transitInfoVisible, setTransitInfoVisible] = useState(false);
  const [tripSidebarVisible, setTripSidebarVisible] = useState(false);
  const [currentTripPlan, setCurrentTripPlan] = useState<TripPlan | null>(null);
  const [tripPlanner] = useState(() => new TripPlanningOrchestrator());
  const [directionsRenderers, setDirectionsRenderers] = useState<google.maps.DirectionsRenderer[]>([]);
  
  const [lastTrip, setLastTrip] = useState<{
    route: google.maps.DirectionsResult;
    tripType: 'ONE_WAY' | 'TWO_WAY';
    mode: 'CAR' | 'RV' | 'PUBLIC';
    startDate: string;
    endDate: string;
    budget: number;
  } | null>(null);

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
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [isLoaded]);

  // Plan enhanced trip when a new car trip is created
  useEffect(() => {
    if (lastTrip && lastTrip.mode === 'CAR' && lastTrip.route) {
      planEnhancedTrip();
    }
  }, [lastTrip]);

  const planEnhancedTrip = async () => {
    if (!lastTrip || !lastTrip.route) return;
    
    try {
      console.log('🚗 Planning enhanced trip...');
      
      const leg = lastTrip.route.routes[0].legs[0];
      const request: TripRequest = {
        origin: leg.start_address || '',
        destination: leg.end_address || '',
        startDate: lastTrip.startDate,
        endDate: lastTrip.endDate,
        mode: lastTrip.mode,
        budget: lastTrip.budget
      };
      
      const tripPlan = await tripPlanner.planTrip(request);
      setCurrentTripPlan(tripPlan);
      setTripSidebarVisible(true);
      
      // Clear old renderers
      directionsRenderers.forEach(renderer => renderer.setMap(null));
      setDirectionsRenderers([]);
      
      // Display segmented routes on map
      displaySegmentedRoutes(tripPlan);
      
      console.log('✅ Enhanced trip planned:', tripPlan);
    } catch (error) {
      console.error('❌ Error planning enhanced trip:', error);
    }
  };

  const displaySegmentedRoutes = (tripPlan: TripPlan) => {
    if (!window.google?.maps) return;
    
    const newRenderers: google.maps.DirectionsRenderer[] = [];
    
    // Create a renderer for each segment
    tripPlan.segments.forEach((segment, index) => {
      if (segment.googleRoute) {
        const renderer = new google.maps.DirectionsRenderer({
          directions: segment.googleRoute,
          suppressMarkers: true, // We'll add custom markers
          preserveViewport: index > 0, // Only fit first segment
          polylineOptions: {
            strokeColor: '#3B82F6',
            strokeWeight: 6,
            strokeOpacity: 0.8
          }
        });
        
                  renderer.setMap((window as any).map);
          newRenderers.push(renderer);
      }
    });
    
    setDirectionsRenderers(newRenderers);
  };

  if (loadError) return <p className="p-4 text-red-500">Error loading Google Maps API</p>;
  if (!isLoaded) return <p className="p-4">Loading Maps…</p>;

  const center = userPos ?? { lat: 48.1351, lng: 11.5820 };

  const mapOptions: google.maps.MapOptions = {
    styles: detourStyle,
    disableDefaultUI: true,
    zoomControl: true,
  };

  return (
    <div className="relative w-full h-screen">
      {/* Enhanced Trip Sidebar */}
      <TripSidebarV2
        tripPlan={currentTripPlan}
        isVisible={tripSidebarVisible}
        onClose={() => setTripSidebarVisible(false)}
        onUpdateTrip={(updatedPlan) => {
          setCurrentTripPlan(updatedPlan);
          console.log('✅ Trip updated:', updatedPlan);
          // Re-display routes with updated plan
          displaySegmentedRoutes(updatedPlan);
        }}
      />

      {/* Map with adjusted margin when sidebar is visible */}
      <div className={`w-full h-full transition-all duration-300 ${tripSidebarVisible ? 'ml-96' : ''}`}>
        <GoogleMap
          mapContainerClassName="w-full h-full"
          center={center}
          zoom={userPos ? 13 : 10}
          options={mapOptions}
          onLoad={(map) => {
            // Store map instance globally for DirectionsRenderer
            (window as any).map = map;
          }}
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
          
          {/* City markers */}
          {currentTripPlan && currentTripPlan.cities.map((city, index) => {
            const stay = currentTripPlan.cityStays.find(s => s.city.name === city.name);
            const isStartCity = index === 0;
            const isEndCity = index === currentTripPlan.cities.length - 1;
            
            return (
              <Marker
                key={`city-${index}`}
                position={city.location}
                title={`${city.name}${stay && stay.days > 0 ? ` (${stay.days} days)` : isStartCity ? ' (Start)' : isEndCity ? ' (End)' : ''}`}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 15,
                  fillColor: isStartCity ? '#10b981' : isEndCity ? '#ef4444' : '#3b82f6',
                  fillOpacity: 1,
                  strokeWeight: 3,
                  strokeColor: '#fff',
                }}
                label={{
                  text: stay && stay.days > 0 ? stay.days.toString() : isStartCity ? 'S' : isEndCity ? 'E' : '0',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              />
            );
          })}
        </GoogleMap>
      </div>

      <MapOverlay>
        <HeaderBar
          openWizard={() => setWizardOpen(true)}
          showTransitInfo={() => setTransitInfoVisible(true)}
          hasTransitRoute={lastTrip?.mode === 'PUBLIC'}
          showCarTripInfo={() => {
            if (currentTripPlan && lastTrip?.mode === 'CAR') {
              setTripSidebarVisible(!tripSidebarVisible);
            }
          }}
          hasCarRoute={lastTrip?.mode === 'CAR'}
        />
      </MapOverlay>

      {wizardOpen && (
        <TripSetup 
          onClose={() => setWizardOpen(false)} 
          onTripCreated={(route, tripDetails) => {
            if (route && tripDetails) {
              setLastTrip({
                route,
                tripType: tripDetails.tripType,
                mode: tripDetails.mode,
                startDate: tripDetails.startDate || '',
                endDate: tripDetails.endDate || '',
                budget: tripDetails.budget || 0
              });
              
              if (tripDetails.mode === 'PUBLIC') {
                setTransitInfoVisible(true);
              }
            }
          }} 
        />
      )}
      
      {/* Transit Info Overlay */}
      {lastTrip && (
        <TransitInfo
          route={lastTrip.route}
          tripType={lastTrip.tripType}
          isVisible={transitInfoVisible && lastTrip.mode === 'PUBLIC'}
          onClose={() => setTransitInfoVisible(false)}
        />
      )}
    </div>
  );
}