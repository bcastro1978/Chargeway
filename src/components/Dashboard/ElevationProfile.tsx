import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { ElevationPoint } from '@/lib/services/elevation';
import { SegmentTip } from '@/lib/agents/RouteAdvisorAgent';
import { useTripStore } from '@/lib/store/useTripStore';

interface ElevationProfileProps {
  data: ElevationPoint[];
  totalDistanceKm?: number;
  segmentTips?: SegmentTip[];
  hoveredSegment?: number | null;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ 
  data, 
  totalDistanceKm, 
  segmentTips = [],
  hoveredSegment = null
}) => {
  const currentDistance = useTripStore(state => state.currentDistance);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Calculate cumulative distance along the route for each sample point
    const totalDist = totalDistanceKm || 0;
    return data.map((p, i) => ({
      dist: totalDist > 0 ? Math.round((i / Math.max(1, data.length - 1)) * totalDist * 10) / 10 : i,
      alt: Math.round(p.elevation),
      label: `${Math.round(p.elevation)} m`
    }));
  }, [data, totalDistanceKm]);

  const { minAlt, maxAlt, totalGain, totalLoss } = useMemo(() => {
    if (!data || data.length === 0) return { minAlt: 0, maxAlt: 100, totalGain: 0, totalLoss: 0 };

    let min = Infinity, max = -Infinity, gain = 0, loss = 0;
    for (let i = 0; i < data.length; i++) {
      const e = data[i].elevation;
      if (e < min) min = e;
      if (e > max) max = e;
      if (i > 0) {
        const diff = data[i].elevation - data[i - 1].elevation;
        if (diff > 0) gain += diff;
        else loss += Math.abs(diff);
      }
    }
    return { minAlt: min, maxAlt: max, totalGain: Math.round(gain), totalLoss: Math.round(loss) };
  }, [data]);

  if (!data || data.length === 0) return null;

  // Calculate proper Y-axis domain with padding
  const range = maxAlt - minAlt;
  const padding = Math.max(range * 0.15, 50); // At least 50m padding to show variation
  const yMin = Math.floor((minAlt - padding) / 100) * 100;
  const yMax = Math.ceil((maxAlt + padding) / 100) * 100;

  // Generate readable ticks for Y axis
  const tickCount = 4;
  const tickStep = Math.round((yMax - yMin) / (tickCount - 1) / 100) * 100 || 100;
  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += tickStep) {
    yTicks.push(v);
  }

  return (
    <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 p-5 rounded-2xl h-full flex flex-col gap-4">
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>📈 Perfil de Elevación</span>
          </h3>
          <div className="flex gap-3 text-[11px] font-medium">
            <span className="text-emerald-400">▲ +{totalGain} m</span>
            <span className="text-rose-400">▼ −{totalLoss} m</span>
          </div>
        </div>

        {/* Elevation range info */}
        <div className="flex gap-4 text-[11px] text-neutral-500">
          <span>Mín: {Math.round(minAlt)} m</span>
          <span>Máx: {Math.round(maxAlt)} m</span>
          <span>Desnivel: {Math.round(maxAlt - minAlt)} m</span>
        </div>
      </div>

      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAltGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="dist"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(v: number) => `${v} km`}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              ticks={yTicks}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(v: number) => `${v}`}
              axisLine={false}
              tickLine={false}
              unit=" m"
            />
            <Tooltip
              contentStyle={{
                background: '#1a1a2e',
                border: '1px solid #374151',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#d1d5db'
              }}
              labelFormatter={(v: any) => `${v} km`}
              formatter={(value: any) => [`${value} m`, 'Altitud']}
            />
            
            {/* Highlighted segment from hover */}
            {hoveredSegment !== null && segmentTips[hoveredSegment] && (
              <ReferenceArea
                x1={segmentTips[hoveredSegment].startKm}
                x2={segmentTips[hoveredSegment].endKm}
                fill={
                  segmentTips[hoveredSegment].type === 'subida' ? '#ef4444' :
                  segmentTips[hoveredSegment].type === 'bajada' ? '#10b981' : '#3b82f6'
                }
                fillOpacity={0.15}
              />
            )}
            
            {currentDistance > 0 && (
              <ReferenceLine x={Math.round(currentDistance * 10) / 10} stroke="#f59e0b" strokeWidth={2} strokeDasharray="3 3" label={{ position: 'top', value: '🚗', fill: '#f59e0b', fontSize: 14 }} />
            )}

            <Area
              type="monotone"
              dataKey="alt"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorAltGrad)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

