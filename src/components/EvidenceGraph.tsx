import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';
import type { EvidenceGraphModel, GraphNodeKind } from '../graph/model';

const kindRadius: Record<GraphNodeKind, number> = {
  studio: 18,
  engine: 16,
  dataset: 14,
  record: 6,
  tokenizer: 10,
  shard: 10,
  training_run: 11,
  checkpoint: 11,
  evaluation: 10,
  conversation: 9,
  inference: 9,
  evidence: 8,
};

const kinds: GraphNodeKind[] = [
  'studio', 'engine', 'dataset', 'record', 'tokenizer', 'shard', 'training_run',
  'checkpoint', 'evaluation', 'conversation', 'inference', 'evidence',
];

function hashNumber(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function EvidenceGraph({ graph }: { graph: EvidenceGraphModel }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [enabledKinds, setEnabledKinds] = useState<Set<GraphNodeKind>>(() => new Set(kinds));
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const drag = useRef<{ pointerId: number; x: number; y: number; cameraX: number; cameraY: number } | null>(null);

  const visibleNodes = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return graph.nodes.filter((node) => enabledKinds.has(node.kind) && (
      needle.length === 0 || node.label.toLocaleLowerCase().includes(needle) || node.detail.toLocaleLowerCase().includes(needle)
    ));
  }, [enabledKinds, graph.nodes, query]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [graph.edges, visibleIds],
  );

  const layout = useMemo(() => {
    const cx = 420;
    const cy = 280;
    const map = new Map<string, { x: number; y: number }>();
    for (const [index, node] of graph.nodes.entries()) {
      if (node.id === 'studio') {
        map.set(node.id, { x: cx, y: cy });
        continue;
      }
      const h = hashNumber(node.id);
      const angle = ((h % 65521) / 65521) * Math.PI * 2;
      const familyOffset = kinds.indexOf(node.kind) * 7;
      const ring = 92 + ((h >>> 12) % 170) + familyOffset;
      const jitter = (index % 11) * 2.5;
      map.set(node.id, { x: cx + Math.cos(angle) * (ring + jitter), y: cy + Math.sin(angle) * (ring + jitter) });
    }
    return map;
  }, [graph.nodes]);

  const selectedNode = graph.nodes.find((node) => node.id === selected) ?? null;

  function toggleKind(kind: GraphNodeKind) {
    setEnabledKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  }

  function onWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    setCamera((current) => ({ ...current, scale: Math.max(0.45, Math.min(2.8, current.scale * factor)) }));
  }

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest('.graph-node')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, cameraX: camera.x, cameraY: camera.y };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    setCamera((cameraState) => ({
      ...cameraState,
      x: current.cameraX + (event.clientX - current.x),
      y: current.cameraY + (event.clientY - current.y),
    }));
  }

  function onPointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  return (
    <div className="graph-wrap">
      <div className="graph-toolbar">
        <input value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Search evidence graph" aria-label="Search evidence graph" />
        <button onClick={() => setCamera({ x: 0, y: 0, scale: 1 })}>Reset view</button>
        <span>{visibleNodes.length}/{graph.nodes.length} nodes</span>
      </div>
      <div className="graph-kind-filter" aria-label="Graph node filters">
        {kinds.map((kind) => (
          <button key={kind} className={enabledKinds.has(kind) ? 'on' : ''} onClick={() => toggleKind(kind)}>{kind.replaceAll('_', ' ')}</button>
        ))}
      </div>
      <svg
        viewBox="0 0 840 560"
        role="img"
        aria-label="Evidence relationship graph"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <defs>
          <filter id="purpleGlow" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g transform={`translate(${camera.x} ${camera.y}) scale(${camera.scale})`}>
          {visibleEdges.map((edge) => {
            const a = layout.get(edge.source);
            const b = layout.get(edge.target);
            if (!a || !b) return null;
            return (
              <line
                key={`${edge.source}:${edge.target}:${edge.relation}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="graph-edge"
              />
            );
          })}
          {visibleNodes.map((node) => {
            const point = layout.get(node.id);
            if (!point) return null;
            const active = selected === node.id;
            const radius = kindRadius[node.kind];
            return (
              <g
                key={node.id}
                transform={`translate(${point.x} ${point.y})`}
                onClick={(event: MouseEvent<SVGGElement>) => { event.stopPropagation(); setSelected(node.id); }}
                onKeyDown={(event: KeyboardEvent<SVGGElement>) => { if (event.key === 'Enter' || event.key === ' ') setSelected(node.id); }}
                className="graph-node"
                tabIndex={0}
                role="button"
                aria-label={`${node.kind}: ${node.label}`}
              >
                <circle r={radius} className={`node-${node.kind} ${active ? 'node-active' : ''}`} filter={node.kind === 'studio' || active ? 'url(#purpleGlow)' : undefined} />
                {(node.kind !== 'record' || active) && <text y={radius + 15} textAnchor="middle">{node.label}</text>}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="graph-detail">
        {selectedNode ? (
          <>
            <strong>{selectedNode.label}</strong>
            <span>{selectedNode.kind.replaceAll('_', ' ')} · {selectedNode.detail}</span>
            {selectedNode.status && <code>{selectedNode.status}</code>}
          </>
        ) : <span>Select a node to inspect evidence provenance.</span>}
      </div>
    </div>
  );
}
