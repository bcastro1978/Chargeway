'use client';

import React from 'react';

interface VehicleStatsProps {
  soc: number; // 0 to 1
  rangeKm: number;
  model: string;
  onSocChange: (newSoc: number) => void;
}

export const VehicleStats: React.FC<VehicleStatsProps> = ({
  soc,
  rangeKm,
  model,
  onSocChange
}) => {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-xs)' }}>{model}</h2>
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Carga Actual</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 800 }}>{Math.round(soc * 100)}%</span>
        </div>
      </div>

      {/* SoC Slider */}
      <div style={{ padding: 'var(--spacing-sm) 0' }}>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={soc * 100} 
          onChange={(e) => onSocChange(parseInt(e.target.value) / 100)}
          style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-xs)' }}>
          <span>0%</span>
          <span>Actualizar manualmente</span>
          <span>100%</span>
        </div>
      </div>

      <div style={{ marginTop: 'var(--spacing-sm)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>AUTONOMÍA</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{rangeKm} km</span>
        </div>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-dim)', marginBottom: '4px' }}>ESTADO</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>Listo</span>
        </div>
      </div>
    </div>
  );
};
