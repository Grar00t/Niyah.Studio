import type { EngineAdapter, EngineIdentity, InferenceRequest, NativeResult } from './EngineAdapter';

export class OfflineEngineAdapter implements EngineAdapter {
  readonly kind = 'offline' as const;

  async getIdentity(): Promise<EngineIdentity> {
    return {
      status: 'ENGINE_OFFLINE',
      repository: 'Grar00t/Niyah.Engine',
      commit: null,
      executableSha256: null,
      backend: null,
      detail: 'Native bridge is unavailable in browser/AI Studio preview.',
    };
  }

  async runInference(_request: InferenceRequest): Promise<NativeResult> {
    return {
      status: 'UNSUPPORTED',
      stdout: '',
      stderr: 'ENGINE_OFFLINE: native Niyah.Engine execution is unavailable in this environment.',
      exitCode: null,
    };
  }

  async cancelActiveRun(): Promise<NativeResult> {
    return {
      status: 'UNSUPPORTED',
      stdout: '',
      stderr: 'ENGINE_OFFLINE: there is no native process to cancel.',
      exitCode: null,
    };
  }
}
