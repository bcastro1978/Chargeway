'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: '¿ChargeWay es una aplicación gratuita?',
    answer: 'Sí, ChargeWay es 100% gratuita para todos los conductores de vehículos eléctricos en Ecuador. Puedes planificar rutas interprovinciales, verificar disponibilidad de conectores y calcular consumos sin costo.'
  },
  {
    question: '¿Cómo funciona el cálculo de frenado regenerativo en los Andes?',
    answer: 'Nuestros algoritmos analizan la elevación topográfica de cada carretera en Ecuador. En bajadas prolongadas (por ejemplo, descendiendo desde los 3,200 m de la Sierra hacia la Costa), la app calcula la energía que recarga la batería.'
  },
  {
    question: '¿Es compatible con conectores Chinos (GB/T) y Europeos (CCS2)?',
    answer: '¡Totalmente! Mapeamos el tipo exacto de conector en cada electrolinera de Ecuador: CCS Combo 2, GB/T DC (muy común en modelos BYD), Type 2 Mennekes y adaptadores Tesla/NACS.'
  },
  {
    question: '¿Puedo usar la aplicación sin conexión a internet?',
    answer: 'Sí. ChargeWay está construida como una PWA (Progressive Web App). Puedes instalarla directamente en tu teléfono iOS o Android y guardar mapas y puntos de carga offline.'
  },
  {
    question: '¿Cómo se verifica la información de las electrolineras?',
    answer: 'Contamos con verificación cruzada en tiempo real: reportes de la comunidad de conductores EV en Ecuador, convenios con operadores de carga y sensores de estado de conectores.'
  }
];

export const FaqSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faqs" className="py-20 lg:py-28 bg-[#0c0e12] relative border-t border-neutral-800/80">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center mb-12">
          <span className="text-emerald-400 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 inline-block mb-3">
            Preguntas Frecuentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
            Resuelve todas tus dudas
          </h2>
          <p className="text-neutral-400 text-sm">
            Todo lo que necesitas saber antes de salir a la carretera en tu auto eléctrico.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="bg-[#171a1f] border border-neutral-800 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between text-white font-bold text-sm hover:text-emerald-400 transition-colors cursor-pointer gap-3"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle size={16} className="text-emerald-400 shrink-0" />
                    <span>{faq.question}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-neutral-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-emerald-400' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-neutral-300 leading-relaxed border-t border-neutral-800/60">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
