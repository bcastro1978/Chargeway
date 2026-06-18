'use client';

import React, { useMemo } from 'react';
import { Car, ChevronDown } from 'lucide-react';
import vehiclesData from '../../lib/vehicles.json';

export interface Vehicle {
  id: string;
  model: string;
  brand: string;
  specs: {
    usable_battery_kwh: number;
    wltp_range_km: number;
    drag_coefficient: number;
    frontal_area_m2: number;
    weight_kg: number;
    peak_charging_kw: number;
  };
}

interface VehicleSelectorProps {
  selectedId: string;
  onSelect: (vehicle: Vehicle) => void;
}

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({ selectedId, onSelect }) => {
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
    <div className="glass-card" style={{ padding: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Vehículo Seleccionado
        </span>
        
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
              {selectedVehicle.specs.wltp_range_km} km WLTP
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
