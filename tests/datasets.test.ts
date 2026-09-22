import { describe, expect, it } from 'vitest';
import { analyzeTextDataset, assignDeterministicSplits, findCrossSplitLeakage, normalizeRecord, sha256Hex } from '../src/datasets/core';

describe('dataset core', () => {
  it('normalizes CRLF and trailing whitespace deterministically', () => {
    expect(normalizeRecord('a  \r\nb\t\r\n')).toBe('a\nb');
  });

  it('computes stable SHA-256', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('detects exact duplicates', async () => {
    const bytes = new TextEncoder().encode('hello world\n\nhello world\n\nمرحبا بالعالم');
    const result = await analyzeTextDataset('x.txt', bytes);
    expect(result.exactDuplicateGroups).toHaveLength(1);
    expect(result.exactDuplicateGroups[0]).toHaveLength(2);
  });

  it('split assignment is deterministic for the same seed', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(assignDeterministicSplits(ids, 'seed')).toEqual(assignDeterministicSplits(ids, 'seed'));
  });

  it('detects cross-split duplicate leakage', async () => {
    const result = await analyzeTextDataset('x.txt', new TextEncoder().encode('same record\n\nsame record'));
    const [a, b] = result.records;
    if (!a || !b) throw new Error('fixture failure');
    const leakage = findCrossSplitLeakage(result, [
      { recordId: a.id, split: 'train' },
      { recordId: b.id, split: 'test' },
    ]);
    expect(leakage).toHaveLength(1);
  });
});
