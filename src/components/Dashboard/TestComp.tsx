import React, { useState, useRef } from 'react';

interface Waypoint { id: string; name: string; lat: number; lng: number; }
interface Props { locations: Waypoint[]; onChange: (l: Waypoint[]) => void; }

export const RouteSearch: React.FC<Props> = ({ locations, onChange }) => {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdx = useRef<number | null>(null);

  const handleDrop = (toIdx: number) => {
    const fromIdx = dragIdx.current;
    if (fromIdx === null || fromIdx === toIdx) return;
    const n = [...locations];
    const [m] = n.splice(fromIdx, 1);
    n.splice(toIdx, 0, m);
    dragIdx.current = null;
    setDragOverIdx(null);
    onChange(n);
  };

  const renderRow = (loc: Waypoint, idx: number) => {
    const isDragTarget = dragOverIdx === idx;
    return (
      <React.Fragment key={loc.id}>
        <div
          draggable={true}
          onDragStart={() => { dragIdx.current = idx; }}
          onDragOver={(e) => { e.preventDefault(); if (dragOverIdx !== idx) setDragOverIdx(idx); }}
          onDragLeave={() => setDragOverIdx(null)}
          onDrop={(e) => { e.preventDefault(); handleDrop(idx); }}
          onDragEnd={() => { dragIdx.current = null; setDragOverIdx(null); }}
          style={{ background: isDragTarget ? 'red' : 'blue' }}
        >
          {loc.name}
        </div>
      </React.Fragment>
    );
  };

  return (
    <div>
      <div>
        <h3>Title</h3>
      </div>
      {locations.map(renderRow)}
    </div>
  );
};
