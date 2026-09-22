export type EngineStatus = 'ONLINE' | 'ENGINE_OFFLINE' | 'UNPINNED' | 'ERROR';

export interface EngineIdentity {
  status: EngineStatus;
  repository: string;
  commit: string | null;
  executableSha256: string | null;
  backend: 'cpu' | 'cuda' | null;
  detail: string;
}

export interface InferenceRequest {
  prompt: string;
  checkpointPath: string;
  tokenizerPath: string;
  maxNewTokens: number;
  temperature: number;
  seed: number;
  backend: 'cpu' | 'cuda';
}

export interface NativeResult {
  status: 'PASS' | 'FAIL' | 'UNSUPPORTED' | 'ABORTED';
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface EngineAdapter {
  readonly kind: 'offline' | 'tauri';
  getIdentity(): Promise<EngineIdentity>;
  runInference(request: InferenceRequest): Promise<NativeResult>;
  cancelActiveRun(): Promise<NativeResult>;
}
