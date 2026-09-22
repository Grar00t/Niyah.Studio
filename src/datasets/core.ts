export type DatasetFormat = 'txt' | 'jsonl' | 'json' | 'csv';
export type SplitName = 'train' | 'validation' | 'test';

export interface ParsedRecord {
  id: string;
  index: number;
  sourceLine: number | null;
  raw: string;
  normalized: string;
  sha256: string;
  byteLength: number;
  charLength: number;
  arabicRatio: number;
  latinRatio: number;
  digitRatio: number;
  flags: string[];
}

export interface DatasetAnalysis {
  sourceName: string;
  sourceSha256: string;
  byteLength: number;
  format: DatasetFormat;
  hadUtf8Bom: boolean;
  records: ParsedRecord[];
  exactDuplicateGroups: string[][];
}

export interface SplitAssignment {
  recordId: string;
  split: SplitName;
}

export interface LeakageFinding {
  sha256: string;
  splits: SplitName[];
  recordIds: string[];
}

export interface NearDuplicateFinding {
  leftRecordId: string;
  rightRecordId: string;
  similarity: number;
}

export interface NearDuplicateOptions {
  threshold?: number;
  shingleSize?: number;
  maxRecords?: number;
  maxPairs?: number;
}

export interface DatasetManifest {
  schema_version: 1;
  source_name: string;
  source_sha256: string;
  source_bytes: number;
  format: DatasetFormat;
  record_count: number;
  transformations: string[];
  exact_duplicate_groups: number;
  split_seed: string | null;
  split_counts: Record<SplitName, number>;
  leakage_findings: number;
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

export function detectDatasetFormat(name: string): DatasetFormat {
  const lower = name.toLowerCase();
  if (lower.endsWith('.jsonl')) return 'jsonl';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.csv')) return 'csv';
  return 'txt';
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
}

interface RawRecord {
  raw: string;
  sourceLine: number | null;
}

function parseTxt(text: string): RawRecord[] {
  const normalized = text.replace(/\r\n?/g, '\n');
  const chunks = normalized.split(/\n[\t ]*\n/g);
  let currentLine = 1;
  return chunks.map((chunk) => {
    const result = { raw: chunk, sourceLine: currentLine };
    currentLine += (chunk.match(/\n/g)?.length ?? 0) + 2;
    return result;
  });
}

function parseJsonl(text: string): RawRecord[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const records: RawRecord[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.trim().length === 0) continue;
    try {
      const value: unknown = JSON.parse(line);
      records.push({ raw: stableJson(value), sourceLine: i + 1 });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`JSONL_PARSE_ERROR line=${i + 1}: ${message}`);
    }
  }
  return records;
}

function parseJson(text: string): RawRecord[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`JSON_PARSE_ERROR: ${message}`);
  }
  if (Array.isArray(value)) {
    return value.map((item) => ({ raw: stableJson(item), sourceLine: null }));
  }
  return [{ raw: stableJson(value), sourceLine: null }];
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/\r\n?/g, '\n');

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? '';
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      if (field.length !== 0) throw new Error('CSV_PARSE_ERROR: quote inside unquoted field');
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (quoted) throw new Error('CSV_PARSE_ERROR: unterminated quoted field');
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseCsv(text: string): RawRecord[] {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return [];
  const header = rows[0] ?? [];
  if (header.length === 0 || header.some((value) => value.trim().length === 0)) {
    throw new Error('CSV_PARSE_ERROR: header contains an empty column name');
  }
  if (new Set(header).size !== header.length) throw new Error('CSV_PARSE_ERROR: duplicate header name');

  const records: RawRecord[] = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (row.length === 1 && (row[0] ?? '').trim().length === 0) continue;
    if (row.length !== header.length) {
      throw new Error(`CSV_PARSE_ERROR row=${rowIndex + 1}: expected ${header.length} fields, got ${row.length}`);
    }
    const object: Record<string, string> = {};
    for (let i = 0; i < header.length; i += 1) object[header[i] ?? ''] = row[i] ?? '';
    records.push({ raw: stableJson(object), sourceLine: rowIndex + 1 });
  }
  return records;
}

function parseByFormat(format: DatasetFormat, text: string): RawRecord[] {
  switch (format) {
    case 'txt': return parseTxt(text);
    case 'jsonl': return parseJsonl(text);
    case 'json': return parseJson(text);
    case 'csv': return parseCsv(text);
  }
}

export async function analyzeTextDataset(name: string, bytes: Uint8Array): Promise<DatasetAnalysis> {
  const sourceSha256 = await sha256Hex(bytes);
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const hadUtf8Bom = decoded.startsWith('\uFEFF');
  const text = hadUtf8Bom ? decoded.slice(1) : decoded;
  const format = detectDatasetFormat(name);
  const rawRecords = parseByFormat(format, text);
  const records: ParsedRecord[] = [];

  for (let index = 0; index < rawRecords.length; index += 1) {
    const source = rawRecords[index];
    if (!source) continue;
    const normalized = normalizeRecord(source.raw);
    const flags: string[] = [];
    if (normalized.length === 0) flags.push('EMPTY');
    if (normalized.length < 8 && normalized.length > 0) flags.push('VERY_SHORT');
    if (normalized.length > 20_000) flags.push('VERY_LONG');
    if (/\u0000/.test(normalized)) flags.push('NUL_CHARACTER');
    if (/[^\S\r\n]{8,}/u.test(normalized)) flags.push('LONG_WHITESPACE_RUN');
    const sha256 = await sha256Hex(normalized);
    records.push({
      id: `${sourceSha256.slice(0, 8)}:${index.toString(36).padStart(5, '0')}:${sha256.slice(0, 10)}`,
      index,
      sourceLine: source.sourceLine,
      raw: source.raw,
      normalized,
      sha256,
      byteLength: encoder.encode(normalized).byteLength,
      charLength: normalized.length,
      arabicRatio: ratio(normalized, /[\u0600-\u06FF]/gu),
      latinRatio: ratio(normalized, /[A-Za-z]/g),
      digitRatio: ratio(normalized, /[0-9\u0660-\u0669]/gu),
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
    format,
    hadUtf8Bom,
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
  if (seed.length === 0) throw new Error('Split seed must not be empty');
  if (!Number.isInteger(trainPct) || !Number.isInteger(validationPct)) throw new Error('Split percentages must be integers');
  if (trainPct <= 0 || validationPct < 0 || trainPct + validationPct >= 100) {
    throw new Error('Invalid split percentages');
  }
  return recordIds.map((recordId) => {
    const bucket = fnv1a32(`${seed}:${recordId}`) % 10_000;
    const trainCut = trainPct * 100;
    const validationCut = trainCut + validationPct * 100;
    const split: SplitName = bucket < trainCut ? 'train' : bucket < validationCut ? 'validation' : 'test';
    return { recordId, split };
  });
}

export function findCrossSplitLeakage(
  analysis: DatasetAnalysis,
  assignments: SplitAssignment[],
): LeakageFinding[] {
  const splitById = new Map(assignments.map((entry) => [entry.recordId, entry.split] as const));
  const byHash = new Map<string, { recordIds: string[]; splits: Set<SplitName> }>();
  for (const record of analysis.records) {
    const split = splitById.get(record.id);
    if (!split) continue;
    const entry = byHash.get(record.sha256) ?? { recordIds: [], splits: new Set<SplitName>() };
    entry.recordIds.push(record.id);
    entry.splits.add(split);
    byHash.set(record.sha256, entry);
  }
  return [...byHash.entries()]
    .filter(([, value]) => value.splits.size > 1)
    .map(([sha256, value]) => ({ sha256, splits: [...value.splits].sort(), recordIds: value.recordIds }));
}

function tokenSet(text: string, shingleSize: number): Set<string> {
  const tokens = text.toLocaleLowerCase().match(/[\p{L}\p{N}_]+/gu) ?? [];
  if (tokens.length === 0) return new Set();
  if (tokens.length < shingleSize) return new Set(tokens);
  const result = new Set<string>();
  for (let i = 0; i <= tokens.length - shingleSize; i += 1) {
    result.add(tokens.slice(i, i + shingleSize).join('\u241f'));
  }
  return result;
}

export function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  for (const value of smaller) if (larger.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

export function findNearDuplicates(
  records: ParsedRecord[],
  options: NearDuplicateOptions = {},
): NearDuplicateFinding[] {
  const threshold = options.threshold ?? 0.88;
  const shingleSize = options.shingleSize ?? 3;
  const maxRecords = options.maxRecords ?? 1_500;
  const maxPairs = options.maxPairs ?? 250_000;
  if (!(threshold > 0 && threshold <= 1)) throw new Error('Near-duplicate threshold must be in (0, 1]');
  if (!Number.isInteger(shingleSize) || shingleSize < 1) throw new Error('Shingle size must be a positive integer');
  if (records.length > maxRecords) throw new Error(`NEAR_DUPLICATE_BUDGET_EXCEEDED records=${records.length} max=${maxRecords}`);
  const pairCount = (records.length * (records.length - 1)) / 2;
  if (pairCount > maxPairs) throw new Error(`NEAR_DUPLICATE_PAIR_BUDGET_EXCEEDED pairs=${pairCount} max=${maxPairs}`);

  const sets = records.map((record) => tokenSet(record.normalized, shingleSize));
  const findings: NearDuplicateFinding[] = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const left = records[i];
      const right = records[j];
      const leftSet = sets[i];
      const rightSet = sets[j];
      if (!left || !right || !leftSet || !rightSet) continue;
      if (left.sha256 === right.sha256) continue;
      const similarity = jaccardSimilarity(leftSet, rightSet);
      if (similarity >= threshold) findings.push({ leftRecordId: left.id, rightRecordId: right.id, similarity });
    }
  }
  return findings.sort((a, b) => b.similarity - a.similarity || a.leftRecordId.localeCompare(b.leftRecordId));
}

export function buildDatasetManifest(
  analysis: DatasetAnalysis,
  assignments: SplitAssignment[],
  seed: string | null,
): DatasetManifest {
  const leakage = findCrossSplitLeakage(analysis, assignments);
  const splitCounts: Record<SplitName, number> = { train: 0, validation: 0, test: 0 };
  for (const assignment of assignments) splitCounts[assignment.split] += 1;
  return {
    schema_version: 1,
    source_name: analysis.sourceName,
    source_sha256: analysis.sourceSha256,
    source_bytes: analysis.byteLength,
    format: analysis.format,
    record_count: analysis.records.length,
    transformations: ['CRLF_TO_LF', 'TRAILING_WHITESPACE_TRIM'],
    exact_duplicate_groups: analysis.exactDuplicateGroups.length,
    split_seed: seed,
    split_counts: splitCounts,
    leakage_findings: leakage.length,
  };
}
