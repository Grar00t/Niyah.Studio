import { useMemo, useState } from 'react';
import type { EvidenceGraph as Graph } from '../graph/model';

const kindRadius: Record<string, number> = {
  studio: 18,
  engine: 16,
  dataset: 14,
  record: 7,
  evidence: 9,
};

function hashNumber(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function EvidenceGraph({ graph }: { graph: Graph }) {
  const [selected, setSelected] = useState<string | null>(null);
  const layout = useMemo(() => {
    const cx = 360;
    const cy = 250;
    return new Map(
      graph.nodes.map((node, index) => {
        if (node.id === 'studio') return [node.id, { x: cx, y: cy }] as const;
        const h = hashNumber(node.id);
        const angle = ((h % 3600) / 3600) * Math.PI * 2;
        const ring = 90 + ((h >>> 12) % 150);
        const jitter = (index % 7) * 4;
        return [node.id, { x: cx + Math.cos(angle) * (ring + jitter), y: cy + Math.sin(angle) * (ring + jitter) }] as const;
      }),
    );
  }, [graph.nodes]);

  const selectedNode = graph.nodes.find((node) => node.id === selected) ?? null;

  return (
    <div className="graph-wrap">
      <svg viewBox="0 0 720 500" role="img" aria-label="Evidence relationship graph">
        <defs>
          <filter id="purpleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {graph.edges.map((edge) => {
          const a = layout.get(edge.source);
          const b = layout.get(edge.target);
          if (!a || !b) return null;
          return <line key={`${edge.source}:${edge.target}:${edge.relation}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="graph-edge" />;
        })}
        {graph.nodes.map((node) => {
          const p = layout.get(node.id);
          if (!p) return null;
          const active = selected === node.id;
          return (
            <g key={node.id} transform={`translate(${p.x} ${p.y})`} onClick={() => setSelected(node.id)} className="graph-node" tabIndex={0}>
              <circle r={kindRadius[node.kind] ?? 8} className={`node-${node.kind} ${active ? 'node-active' : ''}`} filter={node.kind === 'studio' || active ? 'url(#purpleGlow)' : undefined} />
              {(node.kind !== 'record' || active) && <text y={(kindRadius[node.kind] ?? 8) + 15} textAnchor="middle">{node.label}</text>}
            </g>
          );
        })}
      </svg>
      <div className="graph-detail">
        {selectedNode ? <><strong>{selectedNode.label}</strong><span>{selectedNode.detail}</span></> : <span>Select a node to inspect evidence provenance.</span>}
      </div>
    </div>
  );
}
