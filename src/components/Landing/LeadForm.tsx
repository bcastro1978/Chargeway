'use client';

import React, { useState } from 'react';
import { X, Loader2, CheckCircle, Leaf } from 'lucide-react';

interface LeadFormProps {
  dailyKm: number;
  brand: string;
  model: string;
  onClose: () => void;
}

export const LeadForm = ({ dailyKm, brand, model, onClose }: LeadFormProps) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          contact_info: contact,
          daily_km: dailyKm,
          brand_interest: brand,
          model_interest: model
        })
      });

      if (!res.ok) throw new Error('Error saving lead');
      
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827]/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#4B5563] transition-colors"
        >
          <X size={20} />
        </button>

        {status === 'success' ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-[#ECFDF5] text-[#10B981] rounded-full flex items-center justify-center mb-6">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-3xl font-bold mb-3 text-[#111827]">¡Perfecto!</h3>
            <p className="text-[#4B5563] text-lg">
              Un asesor experto en <strong>{brand}</strong> se contactará contigo para darte todos los detalles sobre el <strong>{model}</strong>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-10">
            <div className="mb-8">
              <div className="w-12 h-12 bg-[#ECFDF5] rounded-full flex items-center justify-center mb-6">
                <Leaf className="text-[#10B981] w-6 h-6" />
              </div>
              <h3 className="text-3xl font-bold mb-3 text-[#111827]">Conoce más</h3>
              <p className="text-[#4B5563]">
                Descubre cómo el <strong>{brand} {model}</strong> se adapta a tus recorridos de {dailyKm} km.
              </p>
            </div>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151]">Tu nombre</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. María López"
                  className="w-full px-5 py-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#10B981] focus:bg-white outline-none transition-all text-[#111827]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-[#374151]">Correo o celular</label>
                <input 
                  type="text" 
                  required
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="maria@email.com o 099..."
                  className="w-full px-5 py-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] focus:border-[#10B981] focus:bg-white outline-none transition-all text-[#111827]"
                />
              </div>
            </div>

            {status === 'error' && (
              <p className="text-[#EF4444] text-sm mb-4 bg-[#FEF2F2] p-3 rounded-lg text-center">
                Ocurrió un error. Por favor intenta nuevamente.
              </p>
            )}

            <button 
              type="submit" 
              disabled={status === 'loading'}
              className="w-full py-4 rounded-2xl bg-[#10B981] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#059669] transition-all disabled:opacity-70 shadow-lg shadow-[#10B981]/20"
            >
              {status === 'loading' ? <Loader2 className="animate-spin" size={24} /> : 'Solicitar información'}
            </button>
            <p className="text-xs text-center text-[#9CA3AF] mt-5">
              Solo usaremos tus datos para contactarte. Sin spam.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
