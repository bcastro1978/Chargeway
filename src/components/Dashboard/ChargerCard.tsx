'use client';

import React from 'react';
import { Charger } from '@/lib/services/charging';
import { MapPin, Navigation } from 'lucide-react';

interface ChargerCardProps {
  charger: Charger;
  onNavigateToCharger?: (charger: Charger) => void;
}

export const ChargerCard: React.FC<ChargerCardProps> = ({ charger, onNavigateToCharger }) => {
  const isFast = charger.velocidad && charger.velocidad.toLowerCase().includes('rápid');
  const speedColor = isFast ? '#10b981' : '#f59e0b';

  const navigateToCharger = () => {
    if (onNavigateToCharger) {
      onNavigateToCharger(charger);
      return;
    }
    let url = charger.enlace_gps;
    if (!url || !url.startsWith('http')) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${charger.location.lat},${charger.location.lng}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div 
      className="glass-card hover:border-neutral-700 transition-all duration-200"
      style={{ 
        padding: '10px 12px',
        borderRadius: '12px',
        borderLeft: `3px solid ${speedColor}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        position: 'relative',
        background: 'rgba(23, 23, 23, 0.4)',
      }}
    >
      {/* Title & Nav button */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-[12px] font-bold text-white truncate" title={charger.nombre || charger.operator}>
            {charger.nombre || charger.operator}
          </h4>
          <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5 truncate">
            <MapPin size={10} className="shrink-0" />
            {charger.canton ? `${charger.canton}, ${charger.provincia}` : charger.address || 'Ecuador'}
          </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); navigateToCharger(); }}
          className="p-1 rounded-md border border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-emerald-600 hover:border-emerald-500 transition-all shrink-0 cursor-pointer"
          title={onNavigateToCharger ? 'Ir a este cargador' : 'Navegar aquí'}
        >
          <Navigation size={11} />
        </button>
      </div>

      {/* Badges line */}
      <div className="flex flex-wrap items-center gap-1">
        <span 
          className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
          style={{ backgroundColor: `${speedColor}15`, color: speedColor, border: `1px solid ${speedColor}30` }}
        >
          {charger.velocidad || (isFast ? 'Rápida' : 'Lenta')}
        </span>
        {charger.potencia && (
          <span className="text-[9px] font-medium bg-neutral-800/80 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700/60">
            {charger.potencia}
          </span>
        )}
        {charger.tipo_cargador && (
          <span className="text-[9px] font-medium bg-neutral-800/80 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700/60 max-w-[80px] truncate">
            {charger.tipo_cargador}
          </span>
        )}
      </div>
    </div>
  );
};
