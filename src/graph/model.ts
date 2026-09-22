import type { DatasetAnalysis } from '../datasets/core';
import type { EvidenceReceipt } from '../evidence/types';
import type { EngineIdentity } from '../engine/EngineAdapter';

export type GraphNodeKind = 'studio' | 'engine' | 'dataset' | 'record' | 'evidence';

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  detail: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface EvidenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildEvidenceGraph(
  engine: EngineIdentity,
  dataset: DatasetAnalysis | null,
  receipts: EvidenceReceipt[],
): EvidenceGraph {
  const nodes: GraphNode[] = [
    { id: 'studio', label: 'Niyah Studio', kind: 'studio', detail: 'Local-first control plane' },
    {
      id: 'engine',
      label: 'Niyah.Engine',
      kind: 'engine',
      detail: `${engine.status}${engine.commit ? ` @ ${engine.commit.slice(0, 8)}` : ''}`,
    },
  ];
  const edges: GraphEdge[] = [{ source: 'studio', target: 'engine', relation: 'controls' }];

  if (dataset) {
    const datasetId = `dataset:${dataset.sourceSha256}`;
    nodes.push({
      id: datasetId,
      label: dataset.sourceName,
      kind: 'dataset',
      detail: `${dataset.records.length} records · ${dataset.sourceSha256.slice(0, 12)}`,
    });
    edges.push({ source: 'studio', target: datasetId, relation: 'inspects' });
    for (const record of dataset.records.slice(0, 24)) {
      const recordNodeId = `record:${record.id}`;
      nodes.push({ id: recordNodeId, label: record.id, kind: 'record', detail: record.flags.join(', ') || 'record' });
      edges.push({ source: datasetId, target: recordNodeId, relation: 'contains' });
    }
  }

  for (const receipt of receipts.slice(-24)) {
    const receiptId = `evidence:${receipt.id}`;
    nodes.push({ id: receiptId, label: receipt.operation, kind: 'evidence', detail: `${receipt.status} · ${receipt.source}` });
    edges.push({ source: 'studio', target: receiptId, relation: 'records' });
  }

  return { nodes, edges };
}
