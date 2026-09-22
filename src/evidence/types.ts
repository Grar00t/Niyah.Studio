export type EvidenceStatus = 'NOT_RUN' | 'RUNNING' | 'PASS' | 'FAIL' | 'ABORTED' | 'UNSUPPORTED' | 'STALE';
export type EvidenceSource = 'DETERMINISTIC_LOCAL' | 'NATIVE_PROCESS' | 'FILESYSTEM' | 'TEST_FIXTURE' | 'USER_ACTION';

export interface EvidenceReceipt {
  id: string;
  operation: string;
  status: EvidenceStatus;
  source: EvidenceSource;
  startedAt: string;
  completedAt: string | null;
  inputSha256: string[];
  outputSha256: string[];
  exitCode: number | null;
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
    inputSha256: [],
    outputSha256: [],
    exitCode: null,
    detail,
  };
}
