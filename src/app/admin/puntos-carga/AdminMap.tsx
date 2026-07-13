'use client';

import React from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl';

interface ChargingStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface AdminMapProps {
  stations: ChargingStation[];
  onStationClick?: (station: ChargingStation) => void;
}

export const AdminMap: React.FC<AdminMapProps> = ({ stations, onStationClick }) => {
  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-white/10 relative">
      <Map
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: -78.1834,
          latitude: -1.8312,
          zoom: 6
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        reuseMaps
      >
        <NavigationControl position="top-right" />
        
        {stations.map((station) => (
          <Marker 
            key={station.id}
            longitude={station.lng} 
            latitude={station.lat}
            color="#10b981"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              if (onStationClick) onStationClick(station);
            }}
          />
        ))}
      </Map>
    </div>
  );
};
