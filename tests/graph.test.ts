import { describe, expect, it } from 'vitest';
import { buildEvidenceGraph } from '../src/graph/model';
import { makeReceipt } from '../src/evidence/types';

const engine = {
  status: 'ENGINE_OFFLINE' as const,
  repository: 'Grar00t/Niyah.Engine',
  commit: null,
  executableSha256: null,
  backend: null,
  detail: 'offline',
};

describe('evidence graph model', () => {
  it('contains only grounded baseline nodes when no dataset or receipts exist', () => {
    const graph = buildEvidenceGraph(engine, null, []);
    expect(graph.nodes.map((node) => node.id).sort()).toEqual(['engine', 'studio']);
    expect(graph.edges).toHaveLength(1);
  });

  it('links engine inference receipts to the engine', () => {
    const receipt = makeReceipt('engine.inference', 'UNSUPPORTED', 'NATIVE_PROCESS', 'offline');
    const graph = buildEvidenceGraph(engine, null, [receipt]);
    const receiptId = `evidence:${receipt.id}`;
    expect(graph.nodes.find((node) => node.id === receiptId)?.kind).toBe('inference');
    expect(graph.edges).toContainEqual({ source: 'engine', target: receiptId, relation: 'generated_by' });
  });
});
