'use client';

import React from 'react';
import { Charger, getChargerExclusiveBrands } from '@/lib/services/charging';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';
import { useTripStore } from '@/lib/store/useTripStore';

interface ChargerCardProps {
  charger: Charger;
  onNavigateToCharger?: (charger: Charger) => void;
  routeKm?: number;
  distanceAheadKm?: number;
  isPassed?: boolean;
  isInSelectedSegment?: boolean;
}

const ChargerCardComponent: React.FC<ChargerCardProps> = ({ 
  charger, 
  onNavigateToCharger,
  routeKm,
  distanceAheadKm,
  isPassed,
  isInSelectedSegment
}) => {
  const isFast = charger.velocidad && charger.velocidad.toLowerCase().includes('rápid');
  const speedColor = isFast ? '#84CC16' : '#06B6D4';

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

  const chargerStatusReports = useTripStore(state => state.chargerStatusReports);
  const chKey = (charger.nombre || charger.operator || charger.id || '').toLowerCase().trim();
  const liveReport = chargerStatusReports[chKey];

  return (
    <div className={`hud-panel p-3.5 rounded-xl border transition-all flex flex-col gap-2 font-mono group ${
      isPassed 
        ? 'border-white/5 opacity-60 hover:opacity-100' 
        : isInSelectedSegment 
          ? 'border-emerald-500/40 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.12)]' 
          : 'border-white/10 hover:border-brand-cyan/40 shadow-hud'
    }`}>
      {/* Title & Nav button */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-bold text-white truncate group-hover:text-brand-cyan transition" title={charger.nombre || charger.operator}>
              {charger.nombre || charger.operator}
            </h4>
            {liveReport && (
              <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-extrabold border ${
                liveReport.status === 'broken'
                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                  : liveReport.status === 'busy'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {liveReport.status === 'broken' ? '🔴 Averiado' : (liveReport.status === 'busy' ? '🟡 Ocupado' : '🟢 Libre')}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
            <MapPin size={10} className="shrink-0 text-slate-500" />
            {charger.canton ? `${charger.canton}, ${charger.provincia}` : charger.address || 'Ecuador'}
          </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); navigateToCharger(); }}
          className="p-1.5 rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-slate-950 hover:bg-brand-cyan hover:border-brand-cyan transition shrink-0 cursor-pointer"
          title={onNavigateToCharger ? 'Añadir parada a la ruta' : 'Navegar aquí'}
        >
          <Navigation size={12} />
        </button>
      </div>

      {/* Contextual Distance / Position along Route */}
      {(routeKm !== undefined || distanceAheadKm !== undefined || isInSelectedSegment) && (
        <div className="flex items-center justify-between text-[10px] py-1 px-1.5 rounded-md bg-black/30 border border-white/5">
          {routeKm !== undefined ? (
            <span className="text-slate-400">
              Ruta: <strong className="text-slate-200">Km {routeKm.toFixed(1)}</strong>
            </span>
          ) : <span />}

          {isPassed ? (
            <span className="text-slate-500 font-semibold bg-slate-800/80 px-1.5 py-0.5 rounded text-[9px] border border-white/5">
              Rebasado (−{Math.abs(distanceAheadKm!).toFixed(1)} km)
            </span>
          ) : distanceAheadKm !== undefined ? (
            <span className="text-cyan-400 font-bold bg-cyan-950/70 px-2 py-0.5 rounded text-[9px] border border-cyan-500/30 flex items-center gap-1 shadow-[0_0_8px_rgba(6,182,212,0.15)]">
              <Navigation size={9} className="rotate-45" />
              A {distanceAheadKm < 0.5 ? '< 500 m' : `${distanceAheadKm.toFixed(1)} km`}
            </span>
          ) : isInSelectedSegment ? (
            <span className="text-emerald-400 font-bold bg-emerald-950/70 px-1.5 py-0.5 rounded text-[9px] border border-emerald-500/30">
              En este tramo
            </span>
          ) : null}
        </div>
      )}

      {/* Badges line */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5 text-[9px]">
        {(() => {
          const brands = charger.exclusiveBrands && charger.exclusiveBrands.length > 0
            ? charger.exclusiveBrands
            : getChargerExclusiveBrands(charger.nombre || charger.operator);
          if (brands.length === 0) return null;
          return (
            <span className="bg-purple-950/80 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/40 font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck size={10} className="text-purple-400" />
              Exclusivo {brands.join('/')}
            </span>
          );
        })()}
        <span 
          className="font-bold px-1.5 py-0.5 rounded uppercase"
          style={{ backgroundColor: `${speedColor}20`, color: speedColor, border: `1px solid ${speedColor}40` }}
        >
          {charger.velocidad || (isFast ? 'Rápida' : 'Normal')}
        </span>
        {charger.potencia && (
          <span className="bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-white/10 font-bold">
            {charger.potencia}
          </span>
        )}
        {charger.tipo_cargador && (
          <span className="bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[90px]">
            {charger.tipo_cargador}
          </span>
        )}
      </div>
    </div>
  );
};

export const ChargerCard = React.memo(ChargerCardComponent);
