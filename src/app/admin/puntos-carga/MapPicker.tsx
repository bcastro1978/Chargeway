'use client';

import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export const MapPicker: React.FC<MapPickerProps> = ({ lat, lng, onChange }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
    
    // Default to Ecuador if lat/lng are 0 or undefined
    const initLat = lat || -1.8312;
    const initLng = lng || -78.1834;
    const initZoom = lat && lng ? 14 : 6;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [initLng, initLat],
      zoom: initZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    if (lat && lng) {
      marker.current = new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([initLng, initLat])
        .addTo(map.current);
    }

    map.current.on('click', (e) => {
      const { lat: newLat, lng: newLng } = e.lngLat;
      
      if (!marker.current) {
        marker.current = new mapboxgl.Marker({ color: '#10b981' })
          .setLngLat([newLng, newLat])
          .addTo(map.current!);
      } else {
        marker.current.setLngLat([newLng, newLat]);
      }
      
      onChange(newLat, newLng);
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update marker if lat/lng change from outside (e.g. typing in the inputs)
  useEffect(() => {
    if (map.current && marker.current && lat && lng) {
      marker.current.setLngLat([lng, lat]);
      map.current.flyTo({ center: [lng, lat] });
    } else if (map.current && !marker.current && lat && lng) {
      marker.current = new mapboxgl.Marker({ color: '#10b981' })
        .setLngLat([lng, lat])
        .addTo(map.current);
      map.current.flyTo({ center: [lng, lat] });
    }
  }, [lat, lng]);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-white/10 relative mt-4">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-[10px] text-white pointer-events-none border border-white/10">
        Haz clic en el mapa para ubicar el cargador
      </div>
    </div>
  );
};
