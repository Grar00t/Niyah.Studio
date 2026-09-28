import type {
  EngineAdapter,
  EngineCapabilities,
  EngineIdentity,
  EvaluationRequest,
  InferenceRequest,
  NativeResult,
  PrepareDatasetRequest,
  ProbeRequest,
  ShardDatasetRequest,
  TrainingNewRequest,
  TrainingResumeRequest,
} from './EngineAdapter';

const OFFLINE = 'ENGINE_OFFLINE: native Niyah.Engine execution is unavailable in this environment.';

function unsupported(detail = OFFLINE): NativeResult {
  return { status: 'UNSUPPORTED', stdout: '', stderr: detail, exitCode: null };
}

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

  async getCapabilities(): Promise<EngineCapabilities> {
    return { prepare: false, shard: false, training: false, evaluation: false, inference: false, probe: false, cancellation: false };
  }

  async getModels() { return []; }

  async prepareDataset(_request: PrepareDatasetRequest): Promise<NativeResult> { return unsupported(); }
  async shardDataset(_request: ShardDatasetRequest): Promise<NativeResult> { return unsupported(); }
  async trainNew(_request: TrainingNewRequest): Promise<NativeResult> { return unsupported(); }
  async trainResume(_request: TrainingResumeRequest): Promise<NativeResult> { return unsupported(); }
  async evaluate(_request: EvaluationRequest): Promise<NativeResult> { return unsupported(); }
  async runInference(_request: InferenceRequest): Promise<NativeResult> { return unsupported(); }
  async probe(_request: ProbeRequest): Promise<NativeResult> { return unsupported(); }
  async cancelActiveRun(): Promise<NativeResult> { return unsupported('ENGINE_OFFLINE: there is no native process to cancel.'); }
}
