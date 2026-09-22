import { invoke } from '@tauri-apps/api/core';
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

const NOT_WIRED = 'UNSUPPORTED: native operation is intentionally not wired in the scaffold. Pin and inspect Niyah.Engine before implementing it.';
const unsupported = (): NativeResult => ({ status: 'UNSUPPORTED', stdout: '', stderr: NOT_WIRED, exitCode: null });

export class TauriEngineAdapter implements EngineAdapter {
  readonly kind = 'tauri' as const;

  async getIdentity(): Promise<EngineIdentity> {
    return invoke<EngineIdentity>('engine_status');
  }

  async getCapabilities(): Promise<EngineCapabilities> {
    return invoke<EngineCapabilities>('engine_capabilities');
  }

  async prepareDataset(_request: PrepareDatasetRequest): Promise<NativeResult> { return unsupported(); }
  async shardDataset(_request: ShardDatasetRequest): Promise<NativeResult> { return unsupported(); }
  async trainNew(_request: TrainingNewRequest): Promise<NativeResult> { return unsupported(); }
  async trainResume(_request: TrainingResumeRequest): Promise<NativeResult> { return unsupported(); }
  async evaluate(_request: EvaluationRequest): Promise<NativeResult> { return unsupported(); }
  async runInference(_request: InferenceRequest): Promise<NativeResult> { return unsupported(); }
  async probe(_request: ProbeRequest): Promise<NativeResult> { return unsupported(); }
  async cancelActiveRun(): Promise<NativeResult> { return unsupported(); }
}
