'use client';

import React, { useState } from 'react';
import { ChevronDown, Leaf, HelpCircle } from 'lucide-react';

const faqData = [
  {
    question: '¿Me quedaré sin batería en medio del camino en carretera?',
    answer: 'ChargeWay calcula tu ruta considerando la topografía andina y el consumo en pendientes, sugiriendo paradas exactas en puntos de recarga con un margen de seguridad garantizado.'
  },
  {
    question: '¿El mantenimiento de un vehículo eléctrico es muy costoso?',
    answer: 'Todo lo contrario. Al carecer de motor de combustión interna, caja de cambios compleja y fluidos de aceite, el costo de mantenimiento preventivo es hasta un 60% inferior respecto a un vehículo a gasolina.'
  },
  {
    question: '¿Las pendientes y la altitud afectan drásticamente la batería?',
    answer: 'En ascensos el consumo es mayor, pero en los descensos el sistema de frenado regenerativo devuelve hasta un 15% de la energía gastada a la batería, optimizando el rendimiento general.'
  },
  {
    question: '¿Cómo funciona la reserva de parqueaderos para anfitriones?',
    answer: 'Los anfitriones cuentan con 5 reservas mensuales libres de comisión. A partir de la 6ª reserva, ChargeWay aplica una comisión del 20% mediante saldo prepagado sin mensualidades obligatorias.'
  }
];

export const EducationSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-16 bg-[#081610] rounded-3xl border border-[#1A3028] text-white my-6">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] rounded-full text-xs font-semibold uppercase tracking-wider mb-4">
            <HelpCircle size={14} />
            <span>Mitos y Preguntas Frecuentes</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 text-white">Todo lo que necesitas saber</h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto">
            Aclaramos las dudas más comunes sobre la movilidad eléctrica y el ecosistema ChargeWay en Ecuador.
          </p>
        </div>

        <div className="space-y-3.5">
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className={`border rounded-2xl overflow-hidden transition-all duration-300 ${openIndex === index ? 'border-[#00FF87]/40 bg-[#0D1A14]' : 'border-[#1A3028] bg-[#05110C] hover:border-neutral-700'}`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-5 text-left font-bold text-base text-white flex items-center justify-between gap-4"
              >
                <span>{faq.question}</span>
                <ChevronDown 
                  size={18} 
                  className={`text-[#00FF87] transition-transform duration-300 shrink-0 ${openIndex === index ? 'rotate-180' : ''}`}
                />
              </button>

              {openIndex === index && (
                <div className="px-5 pb-5 pt-1 text-sm text-neutral-300 leading-relaxed border-t border-[#1A3028]/60">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
