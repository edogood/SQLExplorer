'use client';
import { useEffect, useMemo, useState } from 'react';

export function VisualizerClient() {
  const [data, setData] = useState<any>(null);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    fetch('/api/schema').then((r) => r.json()).then(setData);
  }, []);

  const graph = useMemo(() => {
    if (!data?.tables) return { nodes: [], edges: [] };
    const nodes = data.tables.map((t: any, i: number) => ({ id: t.table_name, x: 120 + (i % 3) * 220, y: 80 + Math.floor(i / 3) * 140 }));
    return { nodes, edges: data.foreignKeys ?? [] };
  }, [data]);

  return (
    <section className="panel">
      <h1>Visualizer</h1>
      <div className="table-wrap">
        <svg width="760" height="420" viewBox="0 0 760 420" role="img" aria-label="Database graph">
          {graph.edges.map((e: any, i: number) => {
            const from = graph.nodes.find((n: any) => n.id === e.table_name);
            const to = graph.nodes.find((n: any) => n.id === e.foreign_table_name);
            if (!from || !to) return null;
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#888" />;
          })}
          {graph.nodes.map((n: any) => (
            <g key={n.id} onClick={() => setSelected(n.id)} style={{ cursor: 'pointer' }}>
              <rect x={n.x - 60} y={n.y - 20} width="120" height="40" rx="10" fill="#e6f3f0" stroke="#0f766e" />
              <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="12">{n.id}</text>
            </g>
          ))}
        </svg>
      </div>
      {selected && <p>Tabella selezionata: <strong>{selected}</strong></p>}
    </section>
  );
}
