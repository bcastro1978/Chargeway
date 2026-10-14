import React, { useState } from 'react';
import { X, Car, MapPin, History, User } from 'lucide-react';
import GarageManager from './GarageManager';
import FavoriteLocationsManager from './FavoriteLocationsManager';
import TripHistoryManager from './TripHistoryManager';
import { UserProfileManager } from './UserProfileManager';

export const ProfileModal = ({ 
  userId, 
  onClose,
  initialTab = 'profile'
}: { 
  userId: string; 
  onClose: () => void;
  initialTab?: 'profile' | 'garage' | 'locations' | 'history';
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'garage' | 'locations' | 'history'>(initialTab);

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      style={{ animationDuration: '0.2s' }}
    >
      <div 
        className="glass-card flex flex-col overflow-hidden shadow-2xl relative w-full max-w-4xl max-h-[90vh]"
        style={{ padding: '0', borderRadius: '24px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800/50 bg-black/40">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Mi Perfil</h2>
            <p className="text-sm text-neutral-400 mt-1">Administra tus datos personales, vehículos, consumos y destinos</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-6 border-b border-neutral-800/50 bg-black/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'profile' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <User size={18} />
            DATOS PERSONALES
          </button>
          <button
            onClick={() => setActiveTab('garage')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'garage' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Car size={18} />
            MI GARAJE
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'history' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <History size={18} />
            HISTORIAL DE VIAJES
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 shrink-0 cursor-pointer ${
              activeTab === 'locations' 
                ? 'border-emerald-500 text-emerald-400' 
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <MapPin size={18} />
            DESTINOS FAVORITOS
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">
          {activeTab === 'profile' && (
            <UserProfileManager 
              userId={userId} 
              onClose={onClose} 
              onSwitchTab={(tab) => setActiveTab(tab)} 
            />
          )}
          {activeTab === 'garage' && <GarageManager userId={userId} />}
          {activeTab === 'history' && <TripHistoryManager userId={userId} />}
          {activeTab === 'locations' && <FavoriteLocationsManager userId={userId} />}
        </div>
      </div>
    </div>
  );
};
