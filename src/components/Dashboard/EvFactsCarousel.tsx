'use client';

import React, { useState, useEffect, memo } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

const EV_FACTS = [
  {
    icon: '🔋',
    title: 'Frenado Regenerativo',
    description: 'Las pendientes de Ecuador permiten recuperar hasta un 15% de autonomía al descender usando el motor como generador.'
  },
  {
    icon: '⛰️',
    title: 'Efecto de la Altitud',
    description: 'La densidad del aire disminuye con la altitud, reduciendo la fricción aerodinámica y mejorando la eficiencia en la sierra.'
  },
  {
    icon: '🔌',
    title: 'Velocidad de Carga',
    description: 'La carga DC (Rápida) protege la vida útil de la celda al regular automáticamente la potencia a partir del 80% de SoC.'
  },
  {
    icon: '🌡️',
    title: 'Temperatura y Vida Útil',
    description: 'Mantener la batería entre el 20% y 80% de carga minimiza el estrés térmico y maximiza los ciclos de vida útil.'
  },
  {
    icon: '⚡',
    title: 'Torque Instantáneo',
    description: 'Los motores eléctricos entregan todo su torque desde 0 RPM, brindando una aceleración inmediata y eficiente en subidas empinadas.'
  }
];

export const EvFactsCarousel = memo(function EvFactsCarousel() {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFactIndex((prevIndex) => (prevIndex + 1) % EV_FACTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevFact = () => {
    setCurrentFactIndex((prev) => (prev - 1 + EV_FACTS.length) % EV_FACTS.length);
  };

  const handleNextFact = () => {
    setCurrentFactIndex((prev) => (prev + 1) % EV_FACTS.length);
  };

  return (
    <div className="hud-panel rounded-2xl p-4 border border-white/10 shadow-hud flex flex-col justify-between overflow-hidden">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
        <h3 className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-brand-cyan" />
          <span>INFORMACIÓN SOBRE VEHÍCULOS ELÉCTRICOS EN ECUADOR</span>
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevFact}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextFact}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            aria-label="Siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="relative flex-1 flex flex-col justify-center min-h-0">
        <div
          key={currentFactIndex}
          className="bg-slate-950/50 rounded-xl p-3 border border-white/5 flex flex-col justify-center"
        >
          <div className="flex items-center gap-2 mb-1 font-mono">
            <span className="text-brand-lime text-sm">{EV_FACTS[currentFactIndex].icon}</span>
            <h4 className="text-xs font-bold text-slate-200">{EV_FACTS[currentFactIndex].title}</h4>
          </div>
          <p className="text-xs text-slate-400 leading-normal">
            {EV_FACTS[currentFactIndex].description}
          </p>
        </div>
      </div>

      <div className="flex justify-center gap-1.5 mt-2">
        {EV_FACTS.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentFactIndex(index)}
            className={`h-1.5 rounded-full transition-all cursor-pointer ${
              currentFactIndex === index ? 'bg-brand-cyan w-4' : 'bg-slate-700 hover:bg-slate-600 w-1.5'
            }`}
            aria-label={`Ir al hecho ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
});
