'use client';

import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, XCircle, Clock, ChevronRight, X, Sparkles } from 'lucide-react';
import { fetchReservations } from '@/lib/services/partner';
import type { ChargerReservation } from '@/types/partner';
import { useTripStore } from '@/lib/store/useTripStore';

interface InAppNotificationBannerProps {
  onOpenAdminPanel: () => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({ onOpenAdminPanel }) => {
  const { user } = useTripStore();
  const [latestReservation, setLatestReservation] = useState<ChargerReservation | null>(null);
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'pending' | 'confirmed' | 'rejected';
    reservation: ChargerReservation;
  } | null>(null);
  const [seenReservationIds, setSeenReservationIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkNewNotifications = async () => {
      try {
        const reservations = await fetchReservations();
        if (!reservations || reservations.length === 0) return;

        // Get newest reservation
        const newest = reservations[0];

        // Check if we haven't alerted for this reservation yet
        if (newest && !seenReservationIds.has(newest.id)) {
          setSeenReservationIds((prev) => new Set([...prev, newest.id]));

          if (newest.status === 'pending') {
            setToastNotification({
              id: newest.id,
              title: '⚡ ¡Nueva Solicitud de Reserva!',
              message: `${newest.driver_name} solicita cargar el ${newest.reservation_date} (${newest.start_time} - ${newest.end_time}).`,
              type: 'pending',
              reservation: newest,
            });
          } else if (newest.status === 'confirmed') {
            setToastNotification({
              id: newest.id,
              title: '✅ ¡Reserva Aprobada!',
              message: `Tu reserva para el ${newest.reservation_date} fue confirmada por el anfitrión. Pase QR listo.`,
              type: 'confirmed',
              reservation: newest,
            });
          } else if (newest.status === 'rejected') {
            setToastNotification({
              id: newest.id,
              title: '❌ Reserva Rechazada',
              message: `El anfitrión no pudo aceptar tu reserva para el ${newest.reservation_date}.`,
              type: 'rejected',
              reservation: newest,
            });
          }
        }
      } catch (err) {
        console.warn('InAppNotification check exception:', err);
      }
    };

    checkNewNotifications();
    interval = setInterval(checkNewNotifications, 8000);

    return () => clearInterval(interval);
  }, [seenReservationIds]);

  if (!toastNotification) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] max-w-md w-full animate-bounce-in font-sans">
      <div className="relative bg-[#091D17]/95 border-2 border-emerald-400 p-4 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.5)] backdrop-blur-xl text-white flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
          toastNotification.type === 'pending'
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
            : toastNotification.type === 'confirmed'
            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-400/50'
            : 'bg-rose-500/20 text-rose-400 border border-rose-400/50'
        }`}>
          {toastNotification.type === 'pending' && <Clock size={20} className="animate-pulse" />}
          {toastNotification.type === 'confirmed' && <CheckCircle2 size={20} />}
          {toastNotification.type === 'rejected' && <XCircle size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Sparkles size={12} className="text-emerald-400 animate-spin" />
            <h4 className="text-xs font-black text-white">{toastNotification.title}</h4>
          </div>
          <p className="text-[11px] text-neutral-300 leading-tight">
            {toastNotification.message}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                onOpenAdminPanel();
                setToastNotification(null);
              }}
              className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.4)] cursor-pointer"
            >
              <span>Ver en Panel Anfitrión</span>
              <ChevronRight size={12} />
            </button>

            <button
              onClick={() => setToastNotification(null)}
              className="py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-[10px] font-semibold cursor-pointer"
            >
              Ignorar
            </button>
          </div>
        </div>

        <button
          onClick={() => setToastNotification(null)}
          className="text-neutral-400 hover:text-white p-1 rounded-lg"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
