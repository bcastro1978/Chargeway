'use client';

import React, { useEffect, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onChange }) => {
  const [viewState, setViewState] = useState({
    longitude: lng || -78.1834,
    latitude: lat || -1.8312,
    zoom: lat && lng ? 14 : 6
  });

  // Sync external props to local state if they change significantly
  useEffect(() => {
    if (lat && lng) {
      setViewState(prev => ({ ...prev, longitude: lng, latitude: lat }));
    }
  }, [lat, lng]);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-white/10 relative mt-4">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps
        onClick={(e) => {
          onChange(e.lngLat.lat, e.lngLat.lng);
        }}
      >
        <NavigationControl position="top-right" />
        
        {lat && lng && (
          <Marker 
            longitude={lng} 
            latitude={lat}
            color="#10b981"
          />
        )}
      </Map>
      
      <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white pointer-events-none border border-white/10">
        Haz clic en el mapa para ubicar el cargador
      </div>
    </div>
  );
};
