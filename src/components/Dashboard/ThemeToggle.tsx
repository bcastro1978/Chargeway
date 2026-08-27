'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTripStore } from '@/lib/store/useTripStore';

export const ThemeToggle: React.FC = () => {
  const theme = useTripStore(state => state.theme);
  const toggleTheme = useTripStore(state => state.toggleTheme);

  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-all duration-300 flex items-center justify-center gap-1.5 text-xs font-bold shadow-md cursor-pointer ${
        isLight
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20'
          : 'bg-neutral-900/90 border-neutral-800 text-emerald-400 hover:bg-neutral-800'
      }`}
      title={isLight ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}
    >
      {isLight ? (
        <>
          <Sun size={16} className="text-amber-500 animate-spin-slow" />
          <span className="hidden sm:inline">Modo Claro</span>
        </>
      ) : (
        <>
          <Moon size={16} className="text-emerald-400" />
          <span className="hidden sm:inline">Modo Oscuro</span>
        </>
      )}
    </button>
  );
};
