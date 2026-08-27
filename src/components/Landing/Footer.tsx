'use client';

import React from 'react';

interface FooterProps {
  onGoToApp: () => void;
  onOpenAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onGoToApp }) => {
  return (
    <footer className="w-full bg-[#030A07] border-t border-[#00FF87]/20 py-10 px-6 text-slate-400 font-sans text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ChargeWay Logo" className="w-7 h-7 rounded-lg object-cover border border-[#00FF87]/40" />
          <span className="text-base font-bold text-white tracking-tight">
            Charge<span className="text-[#00FF87]">Way</span> AI
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-xs text-slate-300 font-medium">
          <a href="#descubrir" className="hover:text-[#00FF87] transition-colors">Descubrir</a>
          <button onClick={onGoToApp} className="hover:text-[#00FF87] transition-colors">Planificador Web</button>
          <a href="#calculadora" className="hover:text-[#00FF87] transition-colors">Calculadora de Ahorro</a>
          <a href="mailto:chargewayec@gmail.com" className="hover:text-[#00FF87] transition-colors">Contacto</a>
        </div>

        {/* Copyright */}
        <p className="text-slate-500 text-[11px] font-mono">
          © 2026 ChargeWay AI · Ecuador EV Mobility Network
        </p>

      </div>
    </footer>
  );
};
