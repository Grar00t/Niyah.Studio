import { describe, expect, it } from 'vitest';
import {
  analyzeTextDataset,
  assignDeterministicSplits,
  buildDatasetManifest,
  findCrossSplitLeakage,
  findNearDuplicates,
  jaccardSimilarity,
  normalizeRecord,
  sha256Hex,
} from '../src/datasets/core';

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

  it('parses JSONL and canonicalizes object key order', async () => {
    const bytes = new TextEncoder().encode('{"b":2,"a":1}\n{"a":1,"b":2}\n');
    const result = await analyzeTextDataset('x.jsonl', bytes);
    expect(result.format).toBe('jsonl');
    expect(result.records).toHaveLength(2);
    expect(result.exactDuplicateGroups).toHaveLength(1);
  });

  it('fails closed on malformed JSONL', async () => {
    const bytes = new TextEncoder().encode('{"ok":1}\n{"broken":\n');
    await expect(analyzeTextDataset('x.jsonl', bytes)).rejects.toThrow(/JSONL_PARSE_ERROR line=2/);
  });

  it('parses quoted CSV deterministically', async () => {
    const bytes = new TextEncoder().encode('id,text\n1,"hello, world"\n2,"مرحبا"\n');
    const result = await analyzeTextDataset('x.csv', bytes);
    expect(result.format).toBe('csv');
    expect(result.records).toHaveLength(2);
    expect(result.records[0]?.normalized).toContain('hello, world');
  });

  it('split assignment is deterministic for the same seed', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(assignDeterministicSplits(ids, 'seed')).toEqual(assignDeterministicSplits(ids, 'seed'));
  });

  it('rejects an empty split seed', () => {
    expect(() => assignDeterministicSplits(['a'], '')).toThrow(/seed/i);
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

  it('computes Jaccard similarity exactly', () => {
    expect(jaccardSimilarity(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3, 12);
  });

  it('finds deterministic near duplicates and skips exact duplicates', async () => {
    const text = [
      'the quick brown fox jumps over the lazy dog',
      'the quick brown fox jumps over a lazy dog',
      'completely unrelated sentence here',
      'the quick brown fox jumps over the lazy dog',
    ].join('\n\n');
    const result = await analyzeTextDataset('x.txt', new TextEncoder().encode(text));
    const findings = findNearDuplicates(result.records, { threshold: 0.5, shingleSize: 2 });
    expect(findings.some((finding) => finding.leftRecordId !== finding.rightRecordId)).toBe(true);
    expect(findings.every((finding) => {
      const left = result.records.find((record) => record.id === finding.leftRecordId);
      const right = result.records.find((record) => record.id === finding.rightRecordId);
      return left?.sha256 !== right?.sha256;
    })).toBe(true);
  });

  it('builds a manifest from measured state', async () => {
    const result = await analyzeTextDataset('x.txt', new TextEncoder().encode('a record\n\nanother record'));
    const assignments = assignDeterministicSplits(result.records.map((record) => record.id), 'seed');
    const manifest = buildDatasetManifest(result, assignments, 'seed');
    expect(manifest.source_sha256).toBe(result.sourceSha256);
    expect(manifest.record_count).toBe(2);
    expect(manifest.split_counts.train + manifest.split_counts.validation + manifest.split_counts.test).toBe(2);
  });
});
