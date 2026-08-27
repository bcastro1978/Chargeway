'use client';

import React, { useState } from 'react';
import { X, Star, CheckCircle2, MessageSquare } from 'lucide-react';
import { submitChargerReview } from '@/lib/services/partner';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservationId: string;
  chargingPointId: string;
  chargerName: string;
  driverName: string;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  reservationId,
  chargingPointId,
  chargerName,
  driverName,
  onSuccess,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const wordCount = comment.trim() === '' ? 0 : comment.trim().split(/\s+/).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wordCount > 200) return;
    setIsSubmitting(true);

    try {
      await submitChargerReview({
        reservation_id: reservationId,
        charging_point_id: chargingPointId,
        driver_name: driverName || 'Conductor EV',
        rating,
        comment: comment.trim(),
      });

      setIsSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error enviando reseña:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-[#0B1713] border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden text-white space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A3028] pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              ⭐ Calificar Servicio de Carga
            </h3>
            <p className="text-[11px] text-emerald-400 font-bold">{chargerName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Star Selector */}
            <div className="text-center space-y-2 py-2">
              <label className="text-neutral-300 font-bold block">
                ¿Cómo calificas tu experiencia de carga en este punto?
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      size={28}
                      className={
                        (hoverRating !== null ? star <= hoverRating : star <= rating)
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                          : 'text-neutral-700'
                      }
                    />
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-bold text-amber-400 block">
                {rating === 5
                  ? '¡Excelente (5 estrellas)!'
                  : rating === 4
                  ? 'Muy Bueno (4 estrellas)'
                  : rating === 3
                  ? 'Aceptable (3 estrellas)'
                  : rating === 2
                  ? 'Regular (2 estrellas)'
                  : 'Malo (1 estrella)'}
              </span>
            </div>

            {/* Comment Area */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-neutral-300 font-bold">Comentario u Observaciones</label>
                <span
                  className={`text-[10px] ${
                    wordCount > 200 ? 'text-rose-400 font-bold' : 'text-neutral-400'
                  }`}
                >
                  {wordCount} / 200 palabras
                </span>
              </div>
              <textarea
                rows={4}
                required
                placeholder="Escribe tu opinión sobre el punto de carga, hospitalidad del anfitrión o velocidad..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full bg-[#050E0A] border border-[#1A3028] focus:border-emerald-500 rounded-xl p-3 text-white outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || wordCount > 200}
                className="py-2.5 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <MessageSquare size={14} />
                <span>Publicar Calificación</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="text-base font-black text-white">¡Gracias por tu Reseña!</h4>
            <p className="text-xs text-neutral-300 leading-relaxed max-w-sm mx-auto">
              Tu calificación de <strong className="text-amber-400">{rating} estrellas</strong> ha sido registrada y actualizará inmediatamente la reputación de este punto en el mapa de ChargeWay.
            </p>
            <button
              onClick={() => {
                setIsSubmitted(false);
                onClose();
              }}
              className="mt-2 py-2 px-6 rounded-full bg-emerald-500 text-neutral-950 font-black text-xs"
            >
              Cerrar
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
