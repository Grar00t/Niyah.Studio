import type { InferenceRequest, NativeResult } from '../engine/EngineAdapter';
import { makeReceipt } from './types';

export function makeInferenceReceipt(result: NativeResult, startedAt: string, request: InferenceRequest) {
  const receipt = makeReceipt('engine.inference', result.status, 'NATIVE_PROCESS', JSON.stringify({
    verification: 'Native process execution only; answer quality is not evaluated.',
    executionStatus: result.executionStatus ?? result.status,
    qualityStatus: result.qualityStatus ?? 'NOT_EVALUATED',
    durationMs: result.durationMs ?? null,
    stdout: result.stdout,
    stderr: result.stderr,
    modelId: result.identity?.modelId ?? null,
    request,
  }));
  receipt.startedAt = startedAt;
  receipt.exitCode = result.exitCode;
  receipt.engineCommit = result.identity?.commit ?? null;
  receipt.executableSha256 = result.identity?.executableSha256 ?? null;
  receipt.inputSha256 = result.identity ? [result.identity.checkpointSha256, result.identity.tokenizerSha256] : [];
  return receipt;
}
