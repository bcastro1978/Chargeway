'use client';

import React, { useState } from 'react';
import { Download, X, Share, Plus } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

// ─── iOS Instructions Overlay ────────────────────────────────
const IosInstructions: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 10000,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    padding: '20px',
  }}>
    <div style={{
      width: '100%', maxWidth: '420px',
      background: 'linear-gradient(135deg, #111111 0%, #1c1c1c 100%)',
      border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: '24px',
      padding: '24px',
      boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.1)',
      position: 'relative',
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', width: '30px', height: '30px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#a3a3a3',
        }}
      >
        <X size={14} />
      </button>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <img src="/logo.png" alt="ChargeWay" style={{ width: '48px', height: '48px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }} />
        <div>
          <p style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem', margin: 0 }}>Instalar ChargeWay</p>
          <p style={{ color: '#737373', fontSize: '0.72rem', margin: 0 }}>Agrega la app a tu pantalla principal</p>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {[
          {
            num: '1',
            icon: <Share size={16} color="#10b981" />,
            text: <>Toca el botón <strong style={{ color: '#e5e5e5' }}>Compartir</strong> <Share size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> en la barra de Safari</>,
          },
          {
            num: '2',
            icon: <Plus size={16} color="#10b981" />,
            text: <>Selecciona <strong style={{ color: '#e5e5e5' }}>"Agregar a pantalla de inicio"</strong> en el menú que aparece</>,
          },
          {
            num: '3',
            icon: <span style={{ fontSize: '14px' }}>✅</span>,
            text: <>Toca <strong style={{ color: '#e5e5e5' }}>"Agregar"</strong> para confirmar. ChargeWay aparecerá en tu pantalla principal como una app nativa.</>,
          },
        ].map(step => (
          <div key={step.num} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {step.icon}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#a3a3a3', lineHeight: 1.5, margin: 0, paddingTop: '4px' }}>
              {step.text}
            </p>
          </div>
        ))}
      </div>

      {/* Arrow pointing down toward Safari share bar */}
      <div style={{
        marginTop: '20px',
        textAlign: 'center',
        fontSize: '0.68rem', color: '#525252',
      }}>
        ↓ El botón Compartir está en la barra inferior de Safari
      </div>
    </div>
  </div>
);

// ─── Main Install Button ──────────────────────────────────────
export const PwaInstallButton: React.FC = () => {
  const { isMobile, isInstallable, isInstalled, isIos, install } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Always render on mobile (unless already installed or dismissed). 
  // We no longer require isInstallable to be true, because if Chrome blocks the native prompt
  // (due to cache, cooldown, or SW issues), we still want the user to see the button and get instructions.
  const forceShow = typeof window !== 'undefined' && window.location.search.includes('forcePwa=true');
  if (!forceShow && (!isMobile || isInstalled || dismissed)) return null;

  const handleClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
    } else if (install) {
      try {
        await install();
        // If install returns without triggering outcome, it means deferredPrompt was null.
        // We will show a manual fallback alert.
      } catch (e) {
        alert("Para instalar: Abre el menú de Chrome (tres puntos) y selecciona 'Agregar a la pantalla principal'.");
      }
    }
  };

  return (
    <>
      {showIosGuide && <IosInstructions onClose={() => setShowIosGuide(false)} />}

      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(5,150,105,0.08) 100%)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: '16px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'fadeIn 0.4s ease-out',
      }}>
        {/* App icon */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
          background: 'rgba(16,185,129,0.15)',
          border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px rgba(16,185,129,0.2)',
        }}>
          <img src="/logo.png" alt="ChargeWay" style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'cover' }} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: '0.8rem', color: '#ffffff', margin: 0 }}>Instala ChargeWay</p>
          <p style={{ fontSize: '0.67rem', color: '#737373', margin: 0 }}>Acceso directo desde tu pantalla principal</p>
        </div>

        {/* Install CTA */}
        <button
          onClick={handleClick}
          style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 0 12px rgba(16,185,129,0.35)',
          }}
        >
          <Download size={13} />
          Instalar
        </button>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          title="Cerrar"
          style={{
            flexShrink: 0,
            background: 'none', border: 'none',
            color: '#525252', cursor: 'pointer',
            padding: '4px', borderRadius: '6px',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </>
  );
};
