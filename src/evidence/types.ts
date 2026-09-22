export type EvidenceStatus = 'NOT_RUN' | 'RUNNING' | 'PASS' | 'FAIL' | 'ABORTED' | 'UNSUPPORTED' | 'STALE';
export type EvidenceSource = 'DETERMINISTIC_LOCAL' | 'NATIVE_PROCESS' | 'FILESYSTEM' | 'TEST_FIXTURE' | 'USER_ACTION';

export interface EvidenceReceipt {
  id: string;
  operation: string;
  status: EvidenceStatus;
  source: EvidenceSource;
  startedAt: string;
  completedAt: string | null;
  engineCommit: string | null;
  executableSha256: string | null;
  inputSha256: string[];
  outputSha256: string[];
  exitCode: number | null;
  detail: string;
}

export interface RunReceiptDocument {
  schema_version: 1;
  receipt_id: string;
  operation: string;
  status: EvidenceStatus;
  source: EvidenceSource;
  started_at: string;
  completed_at: string | null;
  engine_commit: string | null;
  executable_sha256: string | null;
  input_sha256: string[];
  output_sha256: string[];
  exit_code: number | null;
  detail: string;
}

export function makeReceipt(
  operation: string,
  status: EvidenceStatus,
  source: EvidenceSource,
  detail: string,
): EvidenceReceipt {
  const startedAt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    operation,
    status,
    source,
    startedAt,
    completedAt: status === 'RUNNING' || status === 'NOT_RUN' ? null : startedAt,
    engineCommit: null,
    executableSha256: null,
    inputSha256: [],
    outputSha256: [],
    exitCode: null,
    detail,
  };
}

export function toRunReceiptDocument(receipt: EvidenceReceipt): RunReceiptDocument {
  return {
    schema_version: 1,
    receipt_id: receipt.id,
    operation: receipt.operation,
    status: receipt.status,
    source: receipt.source,
    started_at: receipt.startedAt,
    completed_at: receipt.completedAt,
    engine_commit: receipt.engineCommit,
    executable_sha256: receipt.executableSha256,
    input_sha256: [...receipt.inputSha256],
    output_sha256: [...receipt.outputSha256],
    exit_code: receipt.exitCode,
    detail: receipt.detail,
  };
}
