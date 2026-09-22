import type { DatasetAnalysis } from '../datasets/core';
import type { EvidenceReceipt } from '../evidence/types';
import type { EngineIdentity } from '../engine/EngineAdapter';

export type GraphNodeKind =
  | 'studio'
  | 'engine'
  | 'dataset'
  | 'record'
  | 'tokenizer'
  | 'shard'
  | 'training_run'
  | 'checkpoint'
  | 'evaluation'
  | 'conversation'
  | 'inference'
  | 'evidence';

export interface GraphNode {
  id: string;
  label: string;
  kind: GraphNodeKind;
  detail: string;
  status?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface EvidenceGraphModel {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function buildEvidenceGraph(
  engine: EngineIdentity,
  dataset: DatasetAnalysis | null,
  receipts: EvidenceReceipt[],
): EvidenceGraphModel {
  const nodes: GraphNode[] = [
    { id: 'studio', label: 'Niyah Studio', kind: 'studio', detail: 'Local-first control plane' },
    {
      id: 'engine',
      label: 'Niyah.Engine',
      kind: 'engine',
      detail: `${engine.status}${engine.commit ? ` @ ${engine.commit.slice(0, 12)}` : ' · UNPINNED'}`,
      status: engine.status,
    },
  ];
  const edges: GraphEdge[] = [{ source: 'studio', target: 'engine', relation: 'controls' }];

  if (dataset) {
    const datasetId = `dataset:${dataset.sourceSha256}`;
    nodes.push({
      id: datasetId,
      label: dataset.sourceName,
      kind: 'dataset',
      detail: `${dataset.format.toUpperCase()} · ${dataset.records.length} records · ${dataset.sourceSha256.slice(0, 12)}`,
    });
    edges.push({ source: 'studio', target: datasetId, relation: 'inspects' });
    for (const record of dataset.records.slice(0, 80)) {
      const recordNodeId = `record:${record.id}`;
      nodes.push({
        id: recordNodeId,
        label: `#${record.index + 1}`,
        kind: 'record',
        detail: `${record.id} · ${record.flags.join(', ') || 'no flags'}`,
      });
      edges.push({ source: datasetId, target: recordNodeId, relation: 'contains' });
    }
  }

  for (const receipt of receipts.slice(-60)) {
    const receiptId = `evidence:${receipt.id}`;
    const kind: GraphNodeKind = receipt.operation === 'engine.inference' ? 'inference' : 'evidence';
    nodes.push({
      id: receiptId,
      label: receipt.operation,
      kind,
      detail: `${receipt.status} · ${receipt.source}`,
      status: receipt.status,
    });
    edges.push({ source: 'studio', target: receiptId, relation: 'records' });
    if (receipt.operation.startsWith('engine.')) edges.push({ source: 'engine', target: receiptId, relation: 'generated_by' });
  }

  return { nodes, edges };
}
