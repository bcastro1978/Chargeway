'use client';

import React from 'react';
import { Map, Zap, CloudSun, ShieldCheck } from 'lucide-react';

const features = [
  {
    icon: <Map className="w-6 h-6 text-[#0ea5e9]" />,
    title: 'Rutas Inteligentes',
    description: 'Encontramos el camino más eficiente, cuidando la batería de tu auto y asegurando que llegues a tu destino con total tranquilidad.',
    color: 'bg-[#E0F2FE]'
  },
  {
    icon: <Zap className="w-6 h-6 text-[#eab308]" />,
    title: 'Estaciones de Carga',
    description: 'Te mostramos todos los cargadores disponibles en tu trayecto, para que nunca te quedes sin energía.',
    color: 'bg-[#FEF9C3]'
  },
  {
    icon: <CloudSun className="w-6 h-6 text-[#10B981]" />,
    title: 'Aprovecha el Entorno',
    description: 'Nuestro sistema inteligente calcula cómo las subidas y bajadas afectan tu batería, maximizando el frenado regenerativo.',
    color: 'bg-[#DCFCE7]'
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-[#8b5cf6]" />,
    title: 'Viaja sin Ansiedad',
    description: 'Con nuestro Índice de Tranquilidad, sabrás exactamente con cuánta energía llegarás. Tu única preocupación será disfrutar el paisaje.',
    color: 'bg-[#EDE9FE]'
  }
];

export const FeaturesSection = () => {
  return (
    <section className="py-24 bg-white text-[#1F2937]">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#111827]">Todo lo que necesitas para tu viaje eléctrico</h2>
          <p className="text-lg text-[#4B5563]">
            Hemos diseñado herramientas amigables y precisas para que disfrutes de la movilidad sostenible sin preocupaciones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="p-8 rounded-[2rem] bg-white border border-[#F3F4F6] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-2xl ${feature.color} flex items-center justify-center mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-[#111827]">{feature.title}</h3>
              <p className="text-[#4B5563] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
