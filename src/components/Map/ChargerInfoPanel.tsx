'use client';

import React from 'react';
import { Charger } from '@/lib/services/charging';
import { X, MapPin, Zap, Clock, Navigation, CheckCircle2, AlertCircle, ExternalLink, DollarSign } from 'lucide-react';

interface ChargerInfoPanelProps {
  charger: Charger | null;
  onClose: () => void;
  onNavigateToCharger?: (charger: Charger) => void;
}

export const ChargerInfoPanel: React.FC<ChargerInfoPanelProps> = ({ charger, onClose, onNavigateToCharger }) => {
  if (!charger) return null;

  // Determine colors based on charging speed (velocidad)
  const isFast = charger.velocidad.toLowerCase().includes('rápid');
  const speedColor = isFast ? '#10b981' : '#f59e0b'; // Green for fast, Amber for normal/semi-fast

  const navigateToCharger = () => {
    if (onNavigateToCharger) {
      onNavigateToCharger(charger);
      onClose(); // Close panel after initiating navigation
    } else {
      let url = charger.enlace_gps;
      if (!url || !url.startsWith('http')) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${charger.location.lat},${charger.location.lng}`;
      }
      window.open(url, '_blank');
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(420px, calc(100% - 32px))',
      background: 'rgba(10, 14, 20, 0.97)',
      backdropFilter: 'blur(20px)',
      border: `1px solid rgba(${isFast ? '16, 185, 129' : '245, 158, 11'}, 0.4)`,
      borderRadius: '16px',
      boxShadow: `0 0 30px rgba(${isFast ? '16, 185, 129' : '245, 158, 11'}, 0.2), 0 20px 60px rgba(0,0,0,0.8)`,
      zIndex: 1000,
      overflow: 'hidden',
      animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .conn-badge { 
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 20px; font-size: 0.75rem;
          font-weight: 600; background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start'
      }}>
        <div style={{
          width: '40px', height: '40px', flexShrink: 0,
          background: `rgba(${isFast ? '16, 185, 129' : '245, 158, 11'}, 0.15)`,
          border: `1px solid rgba(${isFast ? '16, 185, 129' : '245, 158, 11'}, 0.4)`,
          borderRadius: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px'
        }}>🔌</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: speedColor,
              boxShadow: `0 0 6px ${speedColor}`
            }} />
            <span style={{ fontSize: '0.7rem', color: speedColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {charger.velocidad || 'Estado desconocido'}
            </span>
          </div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.3 }}>
            {charger.nombre || charger.operator}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <MapPin size={11} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {charger.canton}, {charger.provincia}
            </span>
          </div>
        </div>

        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: '8px',
          width: '30px', height: '30px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '55vh', overflowY: 'auto' }}>
        
        {/* Connector Details */}
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Conexión
          </span>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>
                  {charger.tipo_cargador || 'Conector Estándar'}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {charger.velocidad && <span className="conn-badge">{charger.velocidad}</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: speedColor }}>
                  <Zap size={14} />
                  <span style={{ fontSize: '1rem', fontWeight: 800 }}>{charger.potencia}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule & Tariffs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <Clock size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Horario
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
              {charger.horario || 'No especificado'}
            </span>
          </div>

          <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <DollarSign size={12} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Tarifa
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#f59e0b' }}>
              {charger.costo || 'Consultar'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer: Navigate button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={navigateToCharger}
          style={{
            width: '100%',
            padding: '10px',
            background: `linear-gradient(135deg, ${speedColor}, ${isFast ? '#059669' : '#d97706'})`,
            border: 'none',
            borderRadius: '10px',
            color: 'white',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: `0 4px 15px rgba(${isFast ? '16, 185, 129' : '245, 158, 11'}, 0.3)`,
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 25px rgba(${isFast ? '16, 185, 129' : '245, 158, 11'}, 0.5)`)}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = `0 4px 15px rgba(${isFast ? '16, 185, 129' : '245, 158, 11'}, 0.3)`)}
        >
          <Navigation size={16} />
          Llegar al punto
        </button>
      </div>
    </div>
  );
};
