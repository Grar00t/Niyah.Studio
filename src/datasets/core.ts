export interface ParsedRecord {
  id: string;
  index: number;
  raw: string;
  normalized: string;
  sha256: string;
  byteLength: number;
  charLength: number;
  arabicRatio: number;
  latinRatio: number;
  flags: string[];
}

export interface DatasetAnalysis {
  sourceName: string;
  sourceSha256: string;
  byteLength: number;
  records: ParsedRecord[];
  exactDuplicateGroups: string[][];
}

export interface SplitAssignment {
  recordId: string;
  split: 'train' | 'validation' | 'test';
}

const encoder = new TextEncoder();

export async function sha256Hex(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeRecord(input: string): string {
  return input.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trimEnd();
}

function ratio(text: string, re: RegExp): number {
  if (text.length === 0) return 0;
  const matches = text.match(re)?.length ?? 0;
  return matches / text.length;
}

export async function analyzeTextDataset(name: string, bytes: Uint8Array): Promise<DatasetAnalysis> {
  const sourceSha256 = await sha256Hex(bytes);
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '');
  const chunks = text.split(/\n\s*\n/g);
  const records: ParsedRecord[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const raw = chunks[index] ?? '';
    const normalized = normalizeRecord(raw);
    const flags: string[] = [];
    if (normalized.length === 0) flags.push('EMPTY');
    if (normalized.length < 8 && normalized.length > 0) flags.push('VERY_SHORT');
    if (normalized.length > 20_000) flags.push('VERY_LONG');
    if (/\u0000/.test(normalized)) flags.push('NUL_CHARACTER');
    const sha256 = await sha256Hex(normalized);
    records.push({
      id: `${sha256.slice(0, 12)}-${index.toString(36).padStart(4, '0')}`,
      index,
      raw,
      normalized,
      sha256,
      byteLength: encoder.encode(normalized).byteLength,
      charLength: normalized.length,
      arabicRatio: ratio(normalized, /[\u0600-\u06FF]/g),
      latinRatio: ratio(normalized, /[A-Za-z]/g),
      flags,
    });
  }

  const groups = new Map<string, string[]>();
  for (const record of records) {
    const group = groups.get(record.sha256) ?? [];
    group.push(record.id);
    groups.set(record.sha256, group);
  }

  return {
    sourceName: name,
    sourceSha256,
    byteLength: bytes.byteLength,
    records,
    exactDuplicateGroups: [...groups.values()].filter((group) => group.length > 1),
  };
}

function fnv1a32(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignDeterministicSplits(
  recordIds: string[],
  seed: string,
  trainPct = 80,
  validationPct = 10,
): SplitAssignment[] {
  if (trainPct <= 0 || validationPct < 0 || trainPct + validationPct >= 100) {
    throw new Error('Invalid split percentages');
  }
  return recordIds.map((recordId) => {
    const bucket = fnv1a32(`${seed}:${recordId}`) % 10_000;
    const trainCut = trainPct * 100;
    const validationCut = trainCut + validationPct * 100;
    const split = bucket < trainCut ? 'train' : bucket < validationCut ? 'validation' : 'test';
    return { recordId, split };
  });
}

export function findCrossSplitLeakage(
  analysis: DatasetAnalysis,
  assignments: SplitAssignment[],
): Array<{ sha256: string; splits: string[]; recordIds: string[] }> {
  const splitById = new Map(assignments.map((entry) => [entry.recordId, entry.split] as const));
  const byHash = new Map<string, { recordIds: string[]; splits: Set<string> }>();
  for (const record of analysis.records) {
    const split = splitById.get(record.id);
    if (!split) continue;
    const entry = byHash.get(record.sha256) ?? { recordIds: [], splits: new Set<string>() };
    entry.recordIds.push(record.id);
    entry.splits.add(split);
    byHash.set(record.sha256, entry);
  }
  return [...byHash.entries()]
    .filter(([, value]) => value.splits.size > 1)
    .map(([sha256, value]) => ({ sha256, splits: [...value.splits].sort(), recordIds: value.recordIds }));
}
