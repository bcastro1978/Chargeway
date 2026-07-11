import React, { useState } from 'react';
import { X, Car, MapPin } from 'lucide-react';
import GarageManager from './GarageManager';
import FavoriteLocationsManager from './FavoriteLocationsManager';

export const ProfileModal = ({ userId, onClose }: { userId: string, onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<'garage' | 'locations'>('garage');

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
            <p className="text-sm text-neutral-400 mt-1">Administra tus vehículos y destinos frecuentes</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-neutral-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-6 border-b border-neutral-800/50 bg-black/20">
          <button
            onClick={() => setActiveTab('garage')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'garage' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Car size={18} />
            MI GARAJE
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`pb-4 text-sm font-bold tracking-wide transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'locations' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <MapPin size={18} />
            DESTINOS FAVORITOS
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/50">
          {activeTab === 'garage' ? (
            <GarageManager userId={userId} />
          ) : (
            <FavoriteLocationsManager userId={userId} />
          )}
        </div>
      </div>
    </div>
  );
};
