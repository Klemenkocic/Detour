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
import TransitInfo from './TransitInfo';
import CarTripInfo from './CarTripInfo';
import TripSidebar from './TripSidebar';
import { EnhancedTripPlanner } from './EnhancedTripPlanner';
import { EnhancedTripData } from '../types/trip';

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
  const [transitInfoVisible, setTransitInfoVisible] = useState(false);
  const [carTripInfoVisible, setCarTripInfoVisible] = useState(false);
  
  // Enhanced trip planning state
  const [tripSidebarVisible, setTripSidebarVisible] = useState(false);
  const [enhancedTripData, setEnhancedTripData] = useState<EnhancedTripData | null>(null);
  const [tripPlanner] = useState(() => new EnhancedTripPlanner());
  
  const [lastTrip, setLastTrip] = useState<{
    route: google.maps.DirectionsResult;
    tripType: 'ONE_WAY' | 'TWO_WAY';
    mode: 'CAR' | 'RV' | 'PUBLIC';
    startDate: string;
    endDate: string;
    budget: number;
    carSettings?: {
      startTime: string;
      endTime: string;
      maxDailyHours: number;
      accommodationType: string;
    };
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
        // Don't set userPos, let it remain null to use Munich as fallback
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }, [isLoaded]);

  // Calculate enhanced trip when a new car trip is created
  useEffect(() => {
    if (lastTrip && lastTrip.mode === 'CAR' && lastTrip.route) {
      calculateEnhancedTrip();
    }
  }, [lastTrip]);

  const calculateEnhancedTrip = async () => {
    if (!lastTrip || !lastTrip.route) return;
    
    try {
      console.log('🚗 Calculating enhanced trip with full duration planning...');
      
      const enhancedData = await tripPlanner.calculateEnhancedTrip(lastTrip.route, {
        tripType: lastTrip.tripType,
        mode: lastTrip.mode,
        startDate: lastTrip.startDate,
        endDate: lastTrip.endDate,
        budget: lastTrip.budget,
        carSettings: lastTrip.carSettings
      });
      
      setEnhancedTripData(enhancedData);
      setTripSidebarVisible(true);
      
      // Hide old overlays when showing enhanced sidebar
      setCarTripInfoVisible(false);
      setTransitInfoVisible(false);
      
      console.log('✅ Enhanced trip calculated:', enhancedData);
    } catch (error) {
      console.error('❌ Error calculating enhanced trip:', error);
    }
  };

  const handleTripSettingsChange = async (newSettings: any) => {
    if (!lastTrip) return;
    
    // Update last trip with new settings
    const updatedTrip = {
      ...lastTrip,
      startDate: newSettings.startDate || lastTrip.startDate,
      endDate: newSettings.endDate || lastTrip.endDate,
      budget: newSettings.budget || lastTrip.budget
    };
    
    setLastTrip(updatedTrip);
    
    // Recalculate enhanced trip with new settings
    if (updatedTrip.route) {
      const enhancedData = await tripPlanner.calculateEnhancedTrip(updatedTrip.route, {
        tripType: updatedTrip.tripType,
        mode: updatedTrip.mode,
        startDate: updatedTrip.startDate,
        endDate: updatedTrip.endDate,
        budget: updatedTrip.budget,
        carSettings: updatedTrip.carSettings
      });
      
      setEnhancedTripData(enhancedData);
    }
  };

  const handleDaySettingsChange = (day: number, settings: any) => {
    // Handle day-specific settings changes
    console.log(`Day ${day} settings changed:`, settings);
    // This will be implemented when we add day-level customization
  };

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
      {/* Enhanced Trip Sidebar */}
      {tripSidebarVisible && enhancedTripData && (
        <TripSidebar
          tripData={enhancedTripData}
          isVisible={tripSidebarVisible}
          onClose={() => setTripSidebarVisible(false)}
          onSettingsChange={handleTripSettingsChange}
          onDaySettingsChange={handleDaySettingsChange}
        />
      )}

      {/* Map with adjusted margin when sidebar is visible */}
      <div className={`w-full h-full transition-all duration-300 ${tripSidebarVisible ? 'ml-96' : ''}`}>
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
          
          {/* Enhanced trip waypoint markers */}
          {enhancedTripData && enhancedTripData.dailyItineraries.map((day, index) => (
            <Marker
              key={`day-${day.day}`}
              position={day.location}
              title={`Day ${day.day} - ${day.city}`}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: index === 0 ? '#10b981' : index === enhancedTripData.dailyItineraries.length - 1 ? '#ef4444' : '#3b82f6',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#fff',
              }}
              label={{
                text: day.day.toString(),
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            />
          ))}
        </GoogleMap>
      </div>

      <MapOverlay>
        <HeaderBar
          toggleDrawer={() => setDrawerOpen((o) => !o)}
          openWizard={() => setWizardOpen(true)}
          showTransitInfo={() => setTransitInfoVisible(true)}
          hasTransitRoute={lastTrip?.mode === 'PUBLIC'}
          showCarTripInfo={() => {
            if (enhancedTripData && lastTrip?.mode === 'CAR') {
              setTripSidebarVisible(true);
            } else {
              setCarTripInfoVisible(true);
            }
          }}
          hasCarRoute={lastTrip?.mode === 'CAR'}
        />
      </MapOverlay>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      {wizardOpen && (
        <TripSetup 
          onClose={() => setWizardOpen(false)} 
          onTripCreated={(route, tripDetails) => {
            setRoute(route);
            if (route && tripDetails) {
              setLastTrip({
                route,
                tripType: tripDetails.tripType,
                mode: tripDetails.mode,
                startDate: tripDetails.startDate || '',
                endDate: tripDetails.endDate || '',
                budget: tripDetails.budget || 0,
                carSettings: tripDetails.carSettings
              });
              // Show appropriate info based on transport mode
              if (tripDetails.mode === 'PUBLIC') {
                setTransitInfoVisible(true);
              } else if (tripDetails.mode === 'CAR') {
                // Enhanced trip calculation will be triggered by useEffect
                console.log('🚗 Car trip created, will calculate enhanced itinerary...');
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

      {/* Legacy Car Trip Info Overlay (fallback) */}
      {lastTrip && lastTrip.mode === 'CAR' && lastTrip.carSettings && !enhancedTripData && (
        <CarTripInfo
          route={lastTrip.route}
          tripSettings={{
            startTime: lastTrip.carSettings.startTime,
            endTime: lastTrip.carSettings.endTime,
            maxDailyHours: lastTrip.carSettings.maxDailyHours,
            accommodationType: lastTrip.carSettings.accommodationType,
            budget: lastTrip.budget,
            tripType: lastTrip.tripType,
            startDate: lastTrip.startDate,
            endDate: lastTrip.endDate
          }}
          isVisible={carTripInfoVisible}
          onClose={() => setCarTripInfoVisible(false)}
          onSettingsChange={(newSettings) => {
            // Update trip settings and recalculate
            if (lastTrip) {
              setLastTrip({
                ...lastTrip,
                carSettings: {
                  ...lastTrip.carSettings!,
                  ...newSettings
                }
              });
            }
          }}
        />
      )}
    </div>
  );
}