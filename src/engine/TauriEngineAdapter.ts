import { invoke } from '@tauri-apps/api/core';
import type {
  EngineAdapter,
  EngineCapabilities,
  EngineIdentity,
  EvaluationRequest,
  InferenceRequest,
  NativeResult,
  NativeModel,
  PrepareDatasetRequest,
  ProbeRequest,
  ShardDatasetRequest,
  TrainingNewRequest,
  TrainingResumeRequest,
} from './EngineAdapter';

const NOT_WIRED = 'UNSUPPORTED: this native operation is not connected. Only verified CPU inference is currently implemented.';
const unsupported = (): NativeResult => ({ status: 'UNSUPPORTED', stdout: '', stderr: NOT_WIRED, exitCode: null });

export class TauriEngineAdapter implements EngineAdapter {
  readonly kind = 'tauri' as const;

  async getIdentity(): Promise<EngineIdentity> {
    return invoke<EngineIdentity>('engine_status');
  }

  async getCapabilities(): Promise<EngineCapabilities> {
    return invoke<EngineCapabilities>('engine_capabilities');
  }

  async getModels(): Promise<NativeModel[]> {
    return invoke<NativeModel[]>('engine_models');
  }

  async prepareDataset(_request: PrepareDatasetRequest): Promise<NativeResult> { return unsupported(); }
  async shardDataset(_request: ShardDatasetRequest): Promise<NativeResult> { return unsupported(); }
  async trainNew(_request: TrainingNewRequest): Promise<NativeResult> { return unsupported(); }
  async trainResume(_request: TrainingResumeRequest): Promise<NativeResult> { return unsupported(); }
  async evaluate(_request: EvaluationRequest): Promise<NativeResult> { return unsupported(); }
  async runInference(request: InferenceRequest): Promise<NativeResult> {
    try {
      return await invoke<NativeResult>('engine_inference', { request });
    } catch (error: unknown) {
      return { status: 'FAIL', executionStatus: 'FAILED', qualityStatus: 'NOT_EVALUATED',
        stdout: '', stderr: error instanceof Error ? error.message : String(error), exitCode: null };
    }
  }
  async probe(_request: ProbeRequest): Promise<NativeResult> { return unsupported(); }
  async cancelActiveRun(): Promise<NativeResult> { return unsupported(); }
}
