'use client';

import React, { useState } from 'react';
import { ChevronDown, Leaf } from 'lucide-react';

const faqData = [
  {
    question: '¿Me quedaré sin batería en medio del camino?',
    answer: 'Es el miedo más común, ¡pero no te preocupes! ChargeWay calcula tu ruta de forma inteligente, sugiriendo paradas exactas en estaciones de carga para que siempre tengas energía de sobra.'
  },
  {
    question: '¿El mantenimiento de un eléctrico es muy caro?',
    answer: 'Todo lo contrario. Al no tener motor a combustión, te olvidas de los cambios de aceite, bujías y filtros. El mantenimiento de un VE es hasta un 60% más económico a largo plazo.'
  },
  {
    question: '¿Las montañas y subidas agotan la batería rápido?',
    answer: 'Sí consumen energía al subir, pero los autos eléctricos tienen "frenado regenerativo". Al bajar, el auto actúa como un generador y recarga la batería, haciendo que la ruta sea súper eficiente.'
  },
  {
    question: '¿Tarda demasiado en cargar la batería?',
    answer: 'No tanto como crees. Con un cargador rápido en la ruta, puedes pasar del 20% al 80% en unos 30-40 minutos. Es el tiempo perfecto para estirar las piernas y tomar un café antes de seguir.'
  }
];

export const EducationSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-24 bg-[#F9FAFB] text-[#1F2937]">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center p-3 bg-[#DCFCE7] rounded-full mb-6">
            <Leaf className="w-8 h-8 text-[#10B981]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#111827]">Mitos y Verdades</h2>
          <p className="text-lg text-[#4B5563]">
            Es totalmente normal tener dudas antes de cambiar tu forma de moverte. Aquí te aclaramos las más comunes.
          </p>
        </div>

        <div className="space-y-4">
          {faqData.map((faq, index) => (
            <div 
              key={index} 
              className={`border border-[#E5E7EB] rounded-[2rem] overflow-hidden transition-all duration-300 ${openIndex === index ? 'bg-white shadow-md' : 'bg-white/50 hover:bg-white'}`}
            >
              <button
                className="w-full text-left px-8 py-6 flex items-center justify-between focus:outline-none"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
              >
                <span className="font-semibold text-lg text-[#111827]">{faq.question}</span>
                <div className={`p-2 rounded-full transition-colors ${openIndex === index ? 'bg-[#ECFDF5]' : 'bg-[#F3F4F6]'}`}>
                  <ChevronDown 
                    className={`w-5 h-5 text-[#059669] transition-transform duration-300 ${openIndex === index ? 'rotate-180' : ''}`} 
                  />
                </div>
              </button>
              
              <div 
                className={`px-8 overflow-hidden transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-48 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-[#4B5563] leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
