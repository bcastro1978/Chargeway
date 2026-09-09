'use client';

import React, { useState, useEffect } from 'react';
import { Charger } from '@/lib/services/charging';
import { fetchNearbyAmenities, NearbyPlace } from '@/lib/services/places';
import { X, MapPin, Zap, Clock, Navigation, CheckCircle2, AlertCircle, ExternalLink, DollarSign, Coffee, Utensils, ShoppingBag, Store, Sparkles, ChevronDown, ChevronUp, Star } from 'lucide-react';

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

        {/* Sección Carga y Disfruta (Amenidades Google Places) */}
        <AmenitiesSection lat={charger.location.lat} lng={charger.location.lng} />
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

interface AmenitiesSectionProps {
  lat: number;
  lng: number;
}

const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ lat, lng }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amenities, setAmenities] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Reset when coordinates change
    setAmenities([]);
    setHasLoaded(false);
    setIsOpen(false);
  }, [lat, lng]);

  const toggleSection = async () => {
    if (!isOpen && !hasLoaded) {
      setLoading(true);
      try {
        const places = await fetchNearbyAmenities(lat, lng, 500);
        setAmenities(places);
        setHasLoaded(true);
      } catch (err) {
        console.error('Error loading amenities:', err);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const getCategoryIcon = (category: NearbyPlace['category']) => {
    switch (category) {
      case 'cafe':
        return <Coffee size={13} style={{ color: '#f59e0b' }} />;
      case 'restaurant':
        return <Utensils size={13} style={{ color: '#ef4444' }} />;
      case 'shopping':
        return <ShoppingBag size={13} style={{ color: '#8b5cf6' }} />;
      case 'convenience':
        return <Store size={13} style={{ color: '#3b82f6' }} />;
      default:
        return <Sparkles size={13} style={{ color: '#10b981' }} />;
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '10px',
      overflow: 'hidden',
      transition: 'all 0.2s'
    }}>
      <button
        onClick={toggleSection}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={14} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.03em' }}>
            Carga y Disfruta
          </span>
          <span style={{
            fontSize: '0.68rem',
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            padding: '2px 6px',
            borderRadius: '6px',
            fontWeight: 600
          }}>
            Google Places
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.4)' }}>
          <span style={{ fontSize: '0.72rem' }}>{isOpen ? 'Ocultar' : 'Ver qué hacer'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {loading ? (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
              Buscando comercios cercanos...
            </div>
          ) : amenities.length === 0 ? (
            <div style={{ padding: '12px 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
              No se hallaron comercios registrados en 400m
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {amenities.map(place => (
                <a
                  key={place.id}
                  href={place.mapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    textDecoration: 'none',
                    color: 'white',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getCategoryIcon(place.category)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {place.name}
                      </div>
                      {place.address && (
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {place.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {place.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 700 }}>
                        <Star size={10} fill="#fbbf24" />
                        <span>{place.rating}</span>
                      </div>
                    )}
                    <ExternalLink size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
