'use client';

import React, { useMemo } from 'react';
import { Car, ChevronDown } from 'lucide-react';
import vehiclesData from '../../lib/vehicles.json';

export interface Vehicle {
  id: string;
  model: string;
  brand: string;
  photoUrl?: string;
  specs: {
    usable_battery_kwh: number;
    wltp_range_km: number;
    drag_coefficient: number;
    frontal_area_m2: number;
    weight_kg: number;
    peak_charging_kw: number;
    charger_type?: string;
  };
}

interface VehicleSelectorProps {
  selectedId: string;
  onSelect: (vehicle: Vehicle) => void;
  soc: number;
  onSocChange: (newSoc: number) => void;
  rangeKm: number;
  onOpenProfile: () => void;
}

import { useTripStore } from '@/lib/store/useTripStore';

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({ 
  selectedId, 
  onSelect,
  soc,
  onSocChange,
  rangeKm,
  onOpenProfile
}) => {
  const storeSelectedVehicle = useTripStore((state) => state.selectedVehicle);
  const selectedVehiclePhoto = storeSelectedVehicle?.photoUrl;
  
  const selectedVehicle = vehiclesData.find(v => v.id === selectedId) || vehiclesData[0];
  
  // Extract unique brands
  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(vehiclesData.map(v => v.brand)));
    return uniqueBrands.sort((a, b) => a.localeCompare(b));
  }, []);

  // Extract models for current brand
  const modelsForBrand = useMemo(() => {
    return vehiclesData.filter(v => v.brand === selectedVehicle.brand);
  }, [selectedVehicle.brand]);

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBrand = e.target.value;
    const firstModelOfBrand = vehiclesData.find(v => v.brand === newBrand);
    if (firstModelOfBrand) {
      onSelect(firstModelOfBrand as Vehicle);
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    const vehicle = vehiclesData.find(v => v.id === newId);
    if (vehicle) {
      onSelect(vehicle as Vehicle);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ padding: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Vehículo Seleccionado
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedVehiclePhoto ? (
              <img 
                src={selectedVehiclePhoto} 
                alt="Miniatura Vehículo" 
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  objectFit: 'cover', 
                  border: '1px solid var(--color-primary)',
                  boxShadow: '0 0 8px rgba(63, 255, 139, 0.4)'
                }} 
              />
            ) : (
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(63, 255, 139, 0.15)',
                border: '1.5px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                boxShadow: '0 0 8px rgba(63, 255, 139, 0.3)'
              }}>
                <Car size={12} />
              </div>
            )}
            <button 
              onClick={onOpenProfile}
              style={{ 
                background: 'rgba(255, 255, 255, 0.1)', 
                border: 'none', 
                color: '#fff', 
                padding: '4px 10px', 
                borderRadius: '6px', 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'var(--color-primary)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
              Perfil
            </button>
          </div>
        </div>
        
        {/* Brand Selector */}
        <div style={{ position: 'relative' }}>
          <select 
            value={selectedVehicle.brand}
            onChange={handleBrandChange}
            style={{
              width: '100%',
              padding: '10px 16px 10px 44px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-outline)',
              borderRadius: '12px',
              color: 'var(--color-text)',
              fontSize: '0.95rem',
              fontWeight: 600,
              appearance: 'none',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {brands.map((b) => (
              <option key={b} value={b} style={{ background: '#1a1a1a' }}>
                {b}
              </option>
            ))}
          </select>
          <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)' }}>
            <Car size={18} />
          </div>
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-dim)' }}>
            <ChevronDown size={16} />
          </div>
        </div>

        {/* Model Selector */}
        <div style={{ position: 'relative' }}>
          <select 
            value={selectedId}
            onChange={handleModelChange}
            style={{
              width: '100%',
              padding: '10px 16px 10px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--color-outline)',
              borderRadius: '12px',
              color: 'var(--color-text)',
              fontSize: '0.95rem',
              fontWeight: 600,
              appearance: 'none',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {modelsForBrand.map((v) => (
              <option key={v.id} value={v.id} style={{ background: '#1a1a1a' }}>
                {v.model}
              </option>
            ))}
          </select>
          <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--color-text-dim)' }}>
            <ChevronDown size={16} />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text-dim)' }}>
              {selectedVehicle.specs.usable_battery_kwh} kWh
            </div>
            <div style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text-dim)' }}>
              {selectedVehicle.specs.commercial_range_km ? `${selectedVehicle.specs.commercial_range_km} km / ` : ''}{selectedVehicle.specs.wltp_range_km} km WLTP
            </div>
            {selectedVehicle.specs.charger_type && (
              <div style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-text-dim)' }}>
                {selectedVehicle.specs.charger_type}
              </div>
            )}
          </div>
        </div>

        {/* Integrated Battery Charge SOC Slider & Specs */}
        <div style={{ borderTop: '1px solid var(--color-outline)', paddingTop: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}>Carga Actual</span>
            <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>{Math.round(soc * 100)}%</span>
          </div>

          <div style={{ padding: '4px 0' }}>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={soc * 100} 
              onChange={(e) => onSocChange(parseInt(e.target.value) / 100)}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', color: 'var(--color-text-dim)', marginTop: 'var(--spacing-xs)' }}>
              <span>0%</span>
              <span>Actualizar manualmente</span>
              <span>100%</span>
            </div>
          </div>

          <div style={{ marginTop: '4px' }}>
            <div style={{ padding: '12px var(--spacing-md)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AUTONOMÍA ESTIMADA</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{rangeKm} km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
