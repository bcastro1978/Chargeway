'use client';

import React, { useState } from 'react';
import { Menu, X, Building2, Car, Zap } from 'lucide-react';

interface NavbarProps {
  onOpenAuth?: () => void;
  onGoToApp: () => void;
  onOpenElectrolinerasMap?: () => void;
  onOpenReportModal?: () => void;
  onOpenPartnerRegister?: () => void;
  onOpenPartnerAdminPanel?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGoToApp,
  onOpenElectrolinerasMap,
  onOpenPartnerRegister,
  onOpenPartnerAdminPanel,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#05110C]/90 backdrop-blur-md border-b border-[#00FF87]/20 transition-all duration-300 shadow-[0_4px_25px_rgba(0,0,0,0.7)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group shrink-0" 
          onClick={onGoToApp}
        >
          <img
            src="/logo.png"
            alt="ChargeWay Logo"
            className="w-9 h-9 rounded-xl object-cover border border-[#00FF87]/50 shadow-[0_0_15px_rgba(0,255,135,0.4)] group-hover:scale-105 transition-all"
          />
          <div className="flex items-center gap-1">
            <span className="text-xl font-extrabold tracking-tight text-white font-sans">
              Charge<span className="text-[#00FF87]">Way</span>
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold uppercase tracking-wider text-neutral-300 font-sans">
          <a 
            href="#conductores" 
            className="hover:text-[#00FF87] transition-colors py-1 flex items-center gap-1.5"
          >
            <Car size={14} className="text-[#00FF87]" />
            <span>Conductores</span>
          </a>

          <a 
            href="#anfitriones" 
            className="hover:text-[#00FF87] transition-colors py-1 flex items-center gap-1.5"
          >
            <Building2 size={14} className="text-[#00FF87]" />
            <span>Parqueos & Negocios</span>
          </a>

          <button
            onClick={() => onOpenElectrolinerasMap && onOpenElectrolinerasMap()}
            className="hover:text-[#00FF87] transition-colors py-1 cursor-pointer flex items-center gap-1.5"
          >
            <Zap size={14} className="text-[#00FF87]" />
            <span>Electrolineras</span>
          </button>

          <a 
            href="#calculadora" 
            className="hover:text-[#00FF87] transition-colors py-1 cursor-pointer"
          >
            Calculadora
          </a>

          <a 
            href="#regiones" 
            className="hover:text-[#00FF87] transition-colors py-1 cursor-pointer"
          >
            Rutas Ecuador
          </a>
        </nav>

        {/* Action Buttons Right */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <button
            onClick={() => onOpenPartnerRegister && onOpenPartnerRegister()}
            className="px-4 py-2 rounded-full bg-[#081C14] hover:bg-[#0E2E21] border border-[#00FF87]/40 text-[#00FF87] font-bold text-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            + Registrar Parqueadero
          </button>

          <button
            onClick={onGoToApp}
            className="px-5 py-2 rounded-full bg-[#00FF87] hover:bg-[#00E077] text-[#030A07] font-bold text-xs tracking-wide shadow-[0_0_20px_rgba(0,255,135,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            Planificador Web
          </button>
        </div>

        {/* Mobile Hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <button
            onClick={() => onOpenPartnerRegister && onOpenPartnerRegister()}
            className="px-3 py-1.5 rounded-full bg-[#081C14] border border-[#00FF87]/40 text-[#00FF87] text-[11px] font-bold sm:hidden"
          >
            + Host
          </button>
          
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-[#081C14] border border-[#00FF87]/30 text-white hover:text-[#00FF87]"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#05110C] border-t border-[#00FF87]/20 px-6 py-5 space-y-4 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <a
            href="#conductores"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-white hover:text-[#00FF87]"
          >
            🚗 Para Conductores EV
          </a>
          <a
            href="#anfitriones"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-white hover:text-[#00FF87]"
          >
            🏢 Para Parqueos y Negocios
          </a>
          <button
            onClick={() => { setMobileMenuOpen(false); onOpenElectrolinerasMap && onOpenElectrolinerasMap(); }}
            className="block text-sm font-medium text-white hover:text-[#00FF87] text-left w-full"
          >
            🔌 Directorio de Electrolineras
          </button>
          <a
            href="#calculadora"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-white hover:text-[#00FF87]"
          >
            📊 Calculadora de Ahorro
          </a>
          
          <div className="pt-2 space-y-2">
            <button
              onClick={() => { setMobileMenuOpen(false); onOpenPartnerRegister && onOpenPartnerRegister(); }}
              className="w-full py-2.5 rounded-full bg-[#081C14] border border-[#00FF87]/50 text-[#00FF87] font-bold text-xs text-center"
            >
              + Registrar Mi Parqueadero Gratis
            </button>
            <button
              onClick={() => { setMobileMenuOpen(false); onGoToApp(); }}
              className="w-full py-2.5 rounded-full bg-[#00FF87] text-[#030A07] font-bold text-xs text-center shadow-[0_0_15px_rgba(0,255,135,0.4)]"
            >
              Abrir Planificador de Rutas
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
