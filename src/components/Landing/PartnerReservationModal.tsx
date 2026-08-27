'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, CheckCircle2, Building2, User, Mail, Phone, Car, AlertTriangle, Check, Lock } from 'lucide-react';
import { Charger } from '@/lib/services/charging';
import { fetchHostSchedules, createReservation, fetchReservations } from '@/lib/services/partner';
import { useTripStore } from '@/lib/store/useTripStore';
import type { HostSchedule, ChargerReservation } from '@/types/partner';

interface PartnerReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  charger: Charger | null;
}

const DAYS_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const PartnerReservationModal: React.FC<PartnerReservationModalProps> = ({
  isOpen,
  onClose,
  charger,
}) => {
  const { user, selectedVehicle } = useTripStore();

  const [schedules, setSchedules] = useState<HostSchedule[]>([]);
  const [existingReservations, setExistingReservations] = useState<ChargerReservation[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [driverName, setDriverName] = useState('');
  const [driverEmail, setDriverEmail] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && charger) {
      setIsSuccess(false);

      // Pre-fill user profile email & inferred name
      if (user?.email) {
        setDriverEmail(user.email);
        const inferredName = user.user_metadata?.full_name || user.email.split('@')[0];
        setDriverName((prev) => prev || inferredName);
      }

      // Pre-fill selected vehicle model from active app state
      if (selectedVehicle) {
        setVehicleModel(`${selectedVehicle.brand} ${selectedVehicle.model}`);
      }

      Promise.all([
        fetchHostSchedules(charger.id),
        fetchReservations(),
      ]).then(([fetchedSchedules, fetchedReservations]) => {
        setSchedules(fetchedSchedules);
        setExistingReservations(fetchedReservations);
      });
    }
  }, [isOpen, charger, user, selectedVehicle]);

  // Helper to check if a specific slot overlaps with active existing reservations
  const isSlotReserved = (slot: string, date: string): boolean => {
    if (!charger) return false;
    const [slotStartStr, slotEndStr] = slot.split(' - ');
    const slotStartH = parseInt(slotStartStr.split(':')[0], 10);
    const slotEndH = parseInt(slotEndStr.split(':')[0], 10);

    return existingReservations.some((res) => {
      if (res.charging_point_id !== charger.id) return false;
      if (res.status === 'rejected') return false; // Rejected reservations don't block slots

      const resDate = (res.reservation_date || '').split('T')[0];
      if (resDate !== date) return false;

      // Parse reservation start and end hours
      const resStartH = parseInt((res.start_time || '00:00').split(':')[0], 10);
      const resEndH = parseInt((res.end_time || '00:00').split(':')[0], 10);

      // Overlap: slotStart < resEnd && slotEnd > resStart
      return slotStartH < resEndH && slotEndH > resStartH;
    });
  };

  // Recalculate available and blocked slots whenever date, schedules, or reservations change
  useEffect(() => {
    if (!selectedDate || schedules.length === 0) {
      const defaultList = ['08:00 - 09:00', '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '14:00 - 15:00', '15:00 - 16:00', '16:00 - 17:00'];
      setAvailableSlots(defaultList);
      setDateError(null);
      return;
    }

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.getDay(); // 0: Sunday, 1: Monday...
    const sched = schedules.find((s) => s.day_of_week === dayOfWeek);

    if (sched && !sched.is_enabled) {
      setDateError(`El anfitrión no brinda servicio los días ${DAYS_MAP[dayOfWeek]}. Selecciona otra fecha.`);
      setAvailableSlots([]);
      setSelectedSlots([]);
      return;
    }

    const openHour = sched ? parseInt(sched.open_time.split(':')[0], 10) : 8;
    const closeHour = sched ? parseInt(sched.close_time.split(':')[0], 10) : 20;

    const slots: string[] = [];
    for (let h = openHour; h < closeHour; h++) {
      const hStart = h < 10 ? `0${h}:00` : `${h}:00`;
      const hEnd = h + 1 < 10 ? `0${h + 1}:00` : `${h + 1}:00`;
      slots.push(`${hStart} - ${hEnd}`);
    }

    setAvailableSlots(slots);

    // Check if ALL slots for this date are already reserved!
    const freeSlots = slots.filter((slot) => !isSlotReserved(slot, selectedDate));
    if (freeSlots.length === 0 && slots.length > 0) {
      setDateError(`⚠️ Sin cupos disponibles para el ${selectedDate}. Todos los horarios de este día ya han sido reservados. Por favor selecciona otra fecha.`);
      setSelectedSlots([]);
    } else {
      setDateError(null);
      // Keep valid non-reserved selection or preselect first free slot
      const validSelected = selectedSlots.filter((s) => !isSlotReserved(s, selectedDate));
      if (validSelected.length > 0) {
        setSelectedSlots(validSelected);
      } else if (freeSlots.length > 0) {
        setSelectedSlots([freeSlots[0]]);
      } else {
        setSelectedSlots([]);
      }
    }
  }, [selectedDate, schedules, existingReservations]);

  if (!isOpen || !charger) return null;

  const handleToggleSlot = (slot: string) => {
    if (isSlotReserved(slot, selectedDate)) return; // Cannot select reserved slot

    if (selectedSlots.includes(slot)) {
      if (selectedSlots.length === 1) return; // Must keep at least 1 slot selected
      setSelectedSlots(selectedSlots.filter((s) => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot].sort());
    }
  };

  const handleSubmitReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) {
      alert('Por favor selecciona al menos un horario disponible.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate continuous start_time and end_time range
      const sortedSlots = [...selectedSlots].sort();
      const firstSlot = sortedSlots[0];
      const lastSlot = sortedSlots[sortedSlots.length - 1];
      const startT = firstSlot.split(' - ')[0];
      const endT = lastSlot.split(' - ')[1];
      const timeSpanLabel = `${startT} - ${endT} (${selectedSlots.length} hr${selectedSlots.length > 1 ? 's' : ''})`;

      await createReservation({
        charging_point_id: charger.id,
        driver_name: driverName || 'Conductor ChargeWay',
        driver_email: driverEmail || 'conductor@chargeway.ec',
        driver_phone: driverPhone || '+593990000000',
        vehicle_model: vehicleModel || 'BYD Yuan Plus / EV',
        reservation_date: selectedDate,
        start_time: startT,
        end_time: endT,
      });

      // Dispatch Notification Emails to Host & Driver via Server API
      fetch('/api/partner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_reservation_notification',
          hostEmail: (charger as any).host_email || 'anfitrion@chargeway.ec',
          driverEmail: driverEmail || 'conductor@chargeway.ec',
          driverName,
          pointName: charger.nombre || charger.operator,
          reservationDate: selectedDate,
          slot: timeSpanLabel,
        }),
      }).catch((e) => console.warn('Notification email dispatch:', e));

      setIsSuccess(true);
    } catch (err) {
      console.error('Error enviando reserva:', err);
      alert('Hubo un inconveniente al enviar tu solicitud. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate Power KW & Estimated % Charge Gained
  const extractKw = (potencyStr?: string): number => {
    if (!potencyStr) return 7.0;
    const match = potencyStr.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 7.0;
  };

  const chargerPowerKw = extractKw(charger.potencia);
  const batteryCapacityKwh = selectedVehicle?.specs?.usable_battery_kwh || (selectedVehicle as any)?.batteryCapacity || 60;
  const totalHours = selectedSlots.length;
  const totalKwhDelivered = Number((chargerPowerKw * totalHours).toFixed(1));
  const estimatedSocPercentGained = Math.min(100, Math.round((totalKwhDelivered / batteryCapacityKwh) * 100));

  const sortedSelected = [...selectedSlots].sort();
  const summaryTimeText = sortedSelected.length > 0
    ? `${sortedSelected[0].split(' - ')[0]} - ${sortedSelected[sortedSelected.length - 1].split(' - ')[1]} (${sortedSelected.length} bloque${sortedSelected.length > 1 ? 's' : ''})`
    : 'Ninguno seleccionado';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-lg animate-fade-in font-sans">
      <div className="relative w-full max-w-xl bg-[#0B1713] border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-white space-y-4 max-h-[92vh] flex flex-col">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#1A3028] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                ⚡ Solicitar Reserva de Carga
              </h3>
              <p className="text-[11px] text-emerald-400 font-semibold truncate max-w-xs">
                {charger.nombre || charger.operator} ({charger.canton})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {!isSuccess ? (
          <form onSubmit={handleSubmitReservation} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
            
            {/* Card del Punto Seleccionado */}
            <div className="bg-[#050E0A] p-3 rounded-2xl border border-[#1A3028] flex items-center gap-3">
              {charger.photo_url ? (
                <img src={charger.photo_url} alt="Cargador" className="w-12 h-12 rounded-xl object-cover border border-emerald-500/50" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                  <Building2 size={24} />
                </div>
              )}
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">
                  {charger.tipo_cargador || 'Conector Anfitrión'} • {charger.potencia}
                </span>
                <h4 className="text-xs font-black text-white truncate">{charger.nombre || charger.operator}</h4>
                <p className="text-[10px] text-neutral-400 truncate">{charger.provincia}, {charger.canton} • Tarifa: {charger.costo || '$0.15/kWh'}</p>
              </div>
            </div>

            {/* 📅 Selección de Fecha */}
            <div className="space-y-1.5">
              <label className="text-neutral-200 font-bold flex items-center gap-1.5 text-xs">
                <Calendar size={14} className="text-emerald-400" />
                <span>1. Selecciona el Día de Carga</span>
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white text-xs outline-none"
              />
              {dateError && (
                <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-500/60 text-rose-300 text-[11px] flex items-center gap-2.5 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                  <AlertTriangle size={16} className="shrink-0 text-rose-400 animate-pulse" />
                  <span>{dateError}</span>
                </div>
              )}
            </div>

            {/* ⏰ Selección de Horario Disponible (Bloqueo Automático de Horarios Reservados) */}
            {!dateError && availableSlots.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-neutral-200 font-bold flex items-center gap-1.5 text-xs">
                    <Clock size={14} className="text-emerald-400" />
                    <span>2. Horarios de Atención (Los ocupados están bloqueados)</span>
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    {selectedSlots.length} disponible(s) seleccionado(s)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => {
                    const isReserved = isSlotReserved(slot, selectedDate);
                    const isSelected = selectedSlots.includes(slot);

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isReserved}
                        onClick={() => handleToggleSlot(slot)}
                        className={`p-2.5 rounded-xl border text-center transition-all font-mono font-bold text-[11px] flex flex-col items-center justify-center gap-0.5 ${
                          isReserved
                            ? 'bg-rose-950/20 border-rose-900/40 text-rose-400/60 cursor-not-allowed opacity-60 line-through'
                            : isSelected
                            ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-[1.02] cursor-pointer'
                            : 'bg-[#050E0A] border-[#1A3028] text-neutral-300 hover:border-emerald-500/50 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {isReserved ? (
                            <span className="text-[9px] text-rose-400 font-bold bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-500/30 flex items-center gap-1">
                              <Lock size={10} /> Ocupado
                            </span>
                          ) : (
                            <>
                              {isSelected && <Check size={13} className="shrink-0 text-slate-950" />}
                              <span>{slot}</span>
                            </>
                          )}
                        </div>
                        {isReserved && <span className="text-[10px] text-rose-300/50 font-sans font-normal">{slot}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 🔋 Card de Estimación de Carga Recibida */}
            {!dateError && selectedSlots.length > 0 && (
              <div className="bg-[#051810] p-3 rounded-2xl border border-emerald-500/40 flex items-center justify-between shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                    ⚡
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-400 font-mono uppercase block font-semibold">
                      Carga Estimada ({selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Batería Standard 60 kWh'})
                    </span>
                    <h5 className="text-xs font-black text-white flex items-center gap-1.5">
                      <span className="text-emerald-400 text-sm">+{estimatedSocPercentGained}% Batería</span>
                      <span className="text-neutral-300 text-[10px] font-mono">({totalKwhDelivered} kWh)</span>
                    </h5>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-cyan-300 font-mono font-bold bg-cyan-950/60 px-2 py-1 rounded-lg border border-cyan-500/40">
                    {chargerPowerKw} kW • {totalHours} hr{totalHours > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* 👤 Datos del Conductor (Cargados Automáticamente desde Perfil / Vehículo) */}
            <div className="space-y-2.5 pt-2 border-t border-[#1A3028]">
              <label className="text-neutral-200 font-bold block text-xs">
                3. Tus Datos de Conductor para la Reserva
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-neutral-400 text-[10px] block mb-1 flex items-center gap-1">
                    <User size={11} /> Nombre Completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tu nombre y apellido"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 text-[10px] block mb-1 flex items-center gap-1">
                    <Mail size={11} /> Correo Electrónico (Cargado de tu perfil)
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu@correo.com"
                    value={driverEmail}
                    onChange={(e) => setDriverEmail(e.target.value)}
                    className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 text-[10px] block mb-1 flex items-center gap-1">
                    <Phone size={11} /> Teléfono (WhatsApp)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+593 99 123 4567"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 text-[10px] block mb-1 flex items-center gap-1">
                    <Car size={11} /> Modelo de Vehículo Eléctrico (Cargado de tu auto activo)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. BYD Yuan Plus / Tesla Model 3"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl px-3 py-2 text-white outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-emerald-400 font-mono font-bold truncate max-w-[200px]">
                {summaryTimeText}
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !!dateError || selectedSlots.length === 0}
                className="group relative py-3 px-6 sm:px-8 rounded-full font-black text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer overflow-hidden bg-gradient-to-r from-[#006699] via-[#008888] to-[#059669] text-white border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.55)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                <span>{isSubmitting ? 'Enviando Solicitud...' : '📅 Solicitar Reserva al Anfitrión'}</span>
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-300 text-slate-950 flex items-center justify-center font-bold text-[10px] shadow-[0_2px_6px_rgba(0,0,0,0.4)] shrink-0 group-hover:translate-x-0.5 transition-transform">
                  →
                </div>
              </button>
            </div>
          </form>
        ) : (
          /* PANTALLA DE CONFIRMACIÓN EXITOSA */
          <div className="text-center py-8 space-y-4 text-xs">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)] animate-bounce">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-black text-white">¡Solicitud de Reserva Enviada!</h4>
              <p className="text-neutral-300 text-xs max-w-md mx-auto leading-relaxed">
                Hemos notificado al anfitrión de <strong className="text-emerald-400">{charger.nombre || charger.operator}</strong> sobre tu reserva.
              </p>
            </div>

            <div className="bg-[#050E0A] p-4 rounded-2xl border border-[#1A3028] max-w-md mx-auto text-left space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">Fecha Reservada:</span>
                <span className="font-bold text-white">{selectedDate}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">Rango de Horario:</span>
                <span className="font-bold text-emerald-400">{summaryTimeText}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">Conductor:</span>
                <span className="font-bold text-white">{driverName}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-neutral-400">Notificación:</span>
                <span className="font-bold text-cyan-400">Enviada a {driverEmail}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
              Una vez que el anfitrión apruebe tu reserva, recibirás en tu correo tu <strong>Pase Digital QR</strong> para ingresar al punto de carga.
            </p>

            <div className="pt-2 flex justify-center">
              <button
                onClick={onClose}
                className="group relative py-3 px-8 rounded-full font-bold text-xs tracking-wide transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer overflow-hidden bg-gradient-to-r from-[#006699] via-[#008888] to-[#059669] text-white border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.35),inset_0_1px_1px_rgba(255,255,255,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.55)]"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
