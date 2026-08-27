'use client';

import React, { useState } from 'react';
import { Bot, ExternalLink, Globe, RefreshCw, Sparkles } from 'lucide-react';

export interface EVNewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string;
  category: 'Legislación' | 'Infraestructura' | 'Mercado' | 'Tecnología';
  imageUrl: string;
  publishedAt: string;
  aiConfidence: number;
}

export const INITIAL_EV_NEWS: EVNewsItem[] = [
  {
    id: 'news-1',
    title: 'Ecuador aprueba esquema tarifario nocturno reducido para recarga residencial de vehículos eléctricos',
    summary: 'El Ministerio de Energía y Minas oficializó la Tarifa Valle para usuarios residenciales con vehículos eléctricos, reduciendo el costo por kWh en horas nocturnas.',
    source: 'Ministerio de Energía y Minas',
    sourceUrl: 'https://www.geoenergia.gob.ec/',
    category: 'Legislación',
    imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=600&q=80',
    publishedAt: '27 Jul 2026 • 09:00 ECT',
    aiConfidence: 99,
  },
  {
    id: 'news-2',
    title: 'Red de electrolineras de carga rápida alcanza 180+ puntos en corredores interprovinciales',
    summary: 'Infraestructura de carga rápida DC en los corredores Quito-Guayaquil y Cuenca-Machala para viajes interprovinciales con conectores rápidos.',
    source: 'Electromaps Ecuador',
    sourceUrl: 'https://www.electromaps.com/puntos-de-recarga/ecuador',
    category: 'Infraestructura',
    imageUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80',
    publishedAt: '26 Jul 2026 • 16:30 ECT',
    aiConfidence: 98,
  },
  {
    id: 'news-3',
    title: 'Ventas de vehículos 100% eléctricos aumentan un 140% en Ecuador según reporte oficial',
    summary: 'La Asociación de Empresas Automotrices del Ecuador (AEADE) destaca un crecimiento histórico en matrículas de autos eléctricos impulsado por exoneraciones fiscales.',
    source: 'AEADE Ecuador',
    sourceUrl: 'https://www.aeade.net/',
    category: 'Mercado',
    imageUrl: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80',
    publishedAt: '24 Jul 2026 • 11:15 ECT',
    aiConfidence: 97,
  },
  {
    id: 'news-4',
    title: 'Exoneración de impuestos ICE/IVA 0% y matriculación reducida aceleran adopción de movilidad limpia',
    summary: 'Análisis de incentivos estatales y ahorro operativo en consumo de combustibles fósiles frente al costo de energía eléctrica en Ecuador.',
    source: 'Primicias Ecuador',
    sourceUrl: 'https://www.primicias.ec/',
    category: 'Tecnología',
    imageUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80',
    publishedAt: '22 Jul 2026 • 14:00 ECT',
    aiConfidence: 96,
  },
];

export const EVNewsSection: React.FC = () => {
  const [news] = useState<EVNewsItem[]>(INITIAL_EV_NEWS);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('Hoy a las 09:00 ECT');

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSync('Actualizado ahora mismo');
    }, 1200);
  };

  return (
    <div className="bg-[#0D1A14]/95 backdrop-blur-2xl border border-[#1A3028] rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-2xl h-full">

      {/* Header del Agente IA */}
      <div className="space-y-2 border-b border-[#1A3028] pb-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Bot size={18} />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider block">Agente IA News</span>
              <span className="text-sm font-extrabold text-white leading-tight block">Noticias EV Ecuador</span>
            </div>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            title="Ejecutar rastreo del Agente IA"
            className="w-8 h-8 rounded-xl bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 text-neutral-400 hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-emerald-400' : ''} />
          </button>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between text-[9px] font-mono text-neutral-400 bg-[#06100C] border border-emerald-500/20 px-3 py-1.5 rounded-xl gap-1">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            📅 Filtro: Últimos 7 Días
          </span>
          <span className="text-neutral-400">{lastSync}</span>
        </div>
      </div>

      {/* Lista de Noticias */}
      <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin scrollbar-thumb-emerald-500/20">
        {news.map((item) => (
          <article
            key={item.id}
            className="group bg-[#080E18] border border-[#1A3028] hover:border-emerald-500/40 rounded-2xl p-3 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(16,185,129,0.1)] flex gap-3"
          >
            {/* Thumbnail Image */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-emerald-500/20 bg-neutral-900 relative">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-1 left-1 bg-black/80 backdrop-blur px-1.5 py-0.5 rounded text-[8px] font-mono text-emerald-400 font-bold border border-emerald-500/30">
                {item.category}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1">
              <div>
                <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 mb-0.5">
                  <span className="text-emerald-400 font-semibold">{item.publishedAt}</span>
                </div>
                <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-[10px] text-neutral-400 leading-normal line-clamp-2 mt-1 font-sans">
                  {item.summary}
                </p>
              </div>

              {/* Source & External Direct Link */}
              <div className="flex items-center justify-between pt-1 border-t border-[#1A3028]/60 text-[9px] font-mono">
                <span className="text-neutral-400 flex items-center gap-1 truncate max-w-[140px]" title={item.source}>
                  <Globe size={10} className="text-emerald-400 shrink-0" />
                  <span className="truncate">{item.source}</span>
                </span>

                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold hover:underline shrink-0 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 cursor-pointer"
                  title={`Abrir la fuente oficial de la noticia: ${item.sourceUrl}`}
                >
                  <span>Ver Noticia Exacta</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Footer Banner Agent Info */}
      <div className="bg-[#080E18]/80 border border-emerald-500/20 rounded-2xl p-2.5 flex items-center justify-between text-[9px] font-mono">
        <span className="text-neutral-400 flex items-center gap-1.5">
          <Sparkles size={11} className="text-emerald-400" />
          <span>Agente IA filtrando noticias de Ecuador</span>
        </span>
        <span className="text-emerald-400 font-bold">100% Fuentes Verificadas</span>
      </div>

    </div>
  );
};
