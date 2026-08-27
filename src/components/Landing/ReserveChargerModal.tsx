'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Car, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { createReservation, fetchHostSchedules } from '@/lib/services/partner';
import type { PartnerChargingPoint, HostSchedule } from '@/types/partner';

interface ReserveChargerModalProps {
  isOpen: boolean;
  onClose: () => void;
  point: PartnerChargingPoint | null;
  onSuccess?: () => void;
}

export const ReserveChargerModal: React.FC<ReserveChargerModalProps> = ({
  isOpen,
  onClose,
  point,
  onSuccess,
}) => {
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('BYD Yuan Pro EV');
  const [reservationDate, setReservationDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [schedules, setSchedules] = useState<HostSchedule[]>([]);

  useEffect(() => {
    if (point) {
      fetchHostSchedules(point.id).then(setSchedules);
    }
  }, [point]);

  if (!isOpen || !point) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createReservation({
        charging_point_id: point.id,
        driver_name: driverName || 'Conductor EV',
        driver_email: driverEmail || 'conductor@chargeway.ec',
        driver_phone: driverPhone || '+593991122334',
        reservation_date: reservationDate,
        start_time: startTime,
        end_time: endTime,
        vehicle_model: vehicleModel,
      });

      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error enviando reserva:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-lg bg-[#0B1713] border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-white space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1A3028] pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              ⚡ Solicitar Reserva de Carga
            </h3>
            <p className="text-[11px] text-emerald-400 font-bold">
              {point.name} • {point.city}
            </p>
          </div>
          <button
            onClick={() => {
              setIsSuccess(false);
              onClose();
            }}
            className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="bg-[#050E0A] p-3 rounded-2xl border border-[#1A3028] space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">Anfitrión:</span>
                <span className="font-bold text-white">{point.host_name}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">Conector & Potencia:</span>
                <span className="font-bold text-emerald-400">{point.connector_type} • {point.power_kw} kW</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-300 font-bold mb-1 block">Tu Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Boris Castro"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-bold mb-1 block">Tu Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="ej. boris@gmail.com"
                  value={driverEmail}
                  onChange={(e) => setDriverEmail(e.target.value)}
                  className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-bold mb-1 block">Modelo de tu Auto EV</label>
                <input
                  type="text"
                  required
                  placeholder="ej. BYD Seagull / Tesla Model Y"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-bold mb-1 block">Fecha de Reserva</label>
                <input
                  type="date"
                  required
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-bold mb-1 block">Hora Inicio</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-neutral-300 font-bold mb-1 block">Hora Fin Estimada</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-full border border-neutral-700 text-neutral-300 font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="py-2.5 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <Mail size={14} />
                <span>Enviar Solicitud al Anfitrión</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-base font-black text-white">¡Solicitud Enviada con Éxito!</h4>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-md mx-auto">
              Se ha enviado una notificación al anfitrión <strong className="text-emerald-400">{point.host_name}</strong>. En cuanto el anfitrión confirme la reserva, recibirás tu <strong className="text-emerald-400">Pase con Código QR</strong> en tu correo y en la app.
            </p>
            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="mt-2 py-2 px-6 rounded-full bg-emerald-500 text-neutral-950 font-black text-xs"
            >
              Entendido
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
