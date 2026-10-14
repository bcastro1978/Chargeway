'use client';

import React from 'react';
import { useTripStore } from '@/lib/store/useTripStore';
import { LogOut, User, Loader2, UserCog } from 'lucide-react';

interface AuthButtonProps {
  onOpenProfile?: () => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onOpenProfile }) => {
  const { user, isLoadingUser, loginWithGoogle, logout } = useTripStore();

  if (isLoadingUser) {
    return (
      <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-4 rounded-2xl flex justify-center items-center gap-2">
        <Loader2 size={16} className="animate-spin text-emerald-500" />
        <span className="text-xs text-neutral-400">Verificando sesión...</span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="bg-neutral-900/60 backdrop-blur-md border border-neutral-800 hover:border-neutral-700/80 p-2 sm:p-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg shadow-black/20 transition-all">
        {/* Clickable Profile Area */}
        <button
          onClick={onOpenProfile}
          type="button"
          className="flex items-center gap-2.5 overflow-hidden text-left hover:opacity-90 transition cursor-pointer group"
          title="Ver y editar mi perfil"
        >
          <div className="relative shrink-0">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name || 'Usuario'}
                className="w-8 h-8 rounded-full object-cover border border-neutral-700 group-hover:border-emerald-500/60 transition shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 group-hover:border-emerald-500/60 flex items-center justify-center shrink-0 transition">
                <User size={14} className="text-neutral-400 group-hover:text-emerald-400" />
              </div>
            )}
            {user.is_admin && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-neutral-900" title="Administrador" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition truncate">
              {user.full_name || 'Conductor EV'}
            </span>
            <span className="text-[10px] text-neutral-500 truncate group-hover:text-neutral-400 transition">
              {user.email}
            </span>
          </div>
        </button>

        {/* Action Buttons: Edit Profile + Logout */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onOpenProfile}
            type="button"
            className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-emerald-500/15 text-neutral-400 hover:text-emerald-400 border border-neutral-700/50 hover:border-emerald-500/40 transition-all cursor-pointer flex items-center gap-1"
            title="Editar Mi Perfil"
          >
            <UserCog size={15} />
            <span className="hidden xl:inline text-[11px] font-mono font-medium">Editar</span>
          </button>
          <button
            onClick={logout}
            type="button"
            className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 border border-neutral-700/50 hover:border-rose-500/30 transition-all cursor-pointer"
            title="Cerrar Sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={loginWithGoogle}
      className="w-full bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700/80 text-white rounded-2xl p-3.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg shadow-black/20 hover:shadow-black/40 cursor-pointer"
    >
      {/* Google Icon SVG */}
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      <span>Iniciar Sesión con Google</span>
    </button>
  );
};
