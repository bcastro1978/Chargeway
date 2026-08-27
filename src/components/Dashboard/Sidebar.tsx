'use client';

import React from 'react';
import { Home, LayoutGrid, Clock, PhoneCall, Settings, LogOut, Zap } from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab = 'home',
  onTabChange,
  onLogout,
}) => {
  return (
    <aside className="w-16 md:w-20 bg-[#0A1F17]/90 backdrop-blur-2xl border border-[#133D2D] rounded-3xl py-6 flex flex-col items-center justify-between shadow-2xl shrink-0 h-full min-h-[640px]">
      
      {/* Top Logo */}
      <div className="flex flex-col items-center gap-6">
        <div className="w-10 h-10 rounded-2xl bg-[#00F59B]/15 border border-[#00F59B]/40 flex items-center justify-center text-[#00F59B] shadow-[0_0_15px_rgba(0,245,155,0.3)]">
          <Zap size={22} className="fill-[#00F59B]" />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-4">
          <button
            onClick={() => onTabChange?.('home')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'home'
                ? 'bg-[#00F59B] text-[#021B11] shadow-[0_0_20px_rgba(0,245,155,0.5)] font-bold'
                : 'text-[#84A999] hover:text-white hover:bg-[#0F2B20]'
            }`}
            title="Inicio / Planificador"
          >
            <Home size={20} />
          </button>

          <button
            onClick={() => onTabChange?.('dashboard')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-[#00F59B] text-[#021B11] shadow-[0_0_20px_rgba(0,245,155,0.5)] font-bold'
                : 'text-[#84A999] hover:text-white hover:bg-[#0F2B20]'
            }`}
            title="Dashboard Electrolineras"
          >
            <LayoutGrid size={20} />
          </button>

          <button
            onClick={() => onTabChange?.('history')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#00F59B] text-[#021B11] shadow-[0_0_20px_rgba(0,245,155,0.5)] font-bold'
                : 'text-[#84A999] hover:text-white hover:bg-[#0F2B20]'
            }`}
            title="Historial de Viajes"
          >
            <Clock size={20} />
          </button>

          <button
            onClick={() => onTabChange?.('support')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'support'
                ? 'bg-[#00F59B] text-[#021B11] shadow-[0_0_20px_rgba(0,245,155,0.5)] font-bold'
                : 'text-[#84A999] hover:text-white hover:bg-[#0F2B20]'
            }`}
            title="Asistencia en Ruta"
          >
            <PhoneCall size={20} />
          </button>

          <button
            onClick={() => onTabChange?.('settings')}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#00F59B] text-[#021B11] shadow-[0_0_20px_rgba(0,245,155,0.5)] font-bold'
                : 'text-[#84A999] hover:text-white hover:bg-[#0F2B20]'
            }`}
            title="Configuración"
          >
            <Settings size={20} />
          </button>
        </nav>
      </div>

      {/* Bottom Exit / Logout */}
      <button
        onClick={onLogout}
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-[#84A999] hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
        title="Cerrar Sesión / Salir"
      >
        <LogOut size={20} />
      </button>

    </aside>
  );
};
