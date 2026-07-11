import React, { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, ReferenceDot } from 'recharts';
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
  const selectedVehiclePhoto = useTripStore(state => state.selectedVehicle?.photoUrl);

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

  const progressPercent = useMemo(() => {
    if (!totalDistanceKm || totalDistanceKm <= 0) return 0;
    return Math.min(100, Math.max(0, (currentDistance / totalDistanceKm) * 100));
  }, [currentDistance, totalDistanceKm]);

  const currentAlt = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    const targetDist = Math.round(currentDistance * 10) / 10;
    
    let closestPoint = chartData[0];
    let minDiff = Infinity;
    for (const p of chartData) {
      const diff = Math.abs(p.dist - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = p;
      }
    }
    return closestPoint?.alt || 0;
  }, [chartData, currentDistance]);

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
              <linearGradient id="strokeProgressGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset={`${progressPercent}%`} stopColor="#10b981" />
                <stop offset={`${progressPercent}%`} stopColor="#4b5563" />
              </linearGradient>
              <linearGradient id="fillProgressGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset={`${progressPercent}%`} stopColor="#10b981" stopOpacity={0.4} />
                <stop offset={`${progressPercent}%`} stopColor="#4b5563" stopOpacity={0.05} />
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
            
            {currentDistance >= 0 && (
              <ReferenceLine 
                x={Math.round(currentDistance * 10) / 10} 
                stroke="#3fff8b" 
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            )}

            {currentDistance >= 0 && (
              <ReferenceDot
                x={Math.round(currentDistance * 10) / 10}
                y={currentAlt}
                r={14}
                shape={(props: any) => {
                  const { cx, cy } = props;
                  return (
                    <g transform={`translate(${cx - 14}, ${cy - 14})`}>
                      {selectedVehiclePhoto ? (
                        <foreignObject width="28" height="28">
                          <img 
                            src={selectedVehiclePhoto} 
                            alt="Auto" 
                            style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '50%', 
                              objectFit: 'cover', 
                              border: '1.5px solid var(--color-primary)', 
                              boxShadow: '0 0 8px rgba(63, 255, 139, 0.6)' 
                            }} 
                          />
                        </foreignObject>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="#3fff8b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '28px', height: '28px' }}>
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                          <circle cx="7" cy="17" r="2"/>
                          <path d="M9 17h6"/>
                          <circle cx="17" cy="17" r="2"/>
                        </svg>
                      )}
                    </g>
                  );
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="alt"
              stroke="url(#strokeProgressGrad)"
              fillOpacity={1}
              fill="url(#fillProgressGrad)"
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

