export type EngineStatus = 'ONLINE' | 'ENGINE_OFFLINE' | 'UNPINNED' | 'ERROR';
export type EngineBackend = 'cpu' | 'cuda';

export interface EngineIdentity {
  status: EngineStatus;
  repository: string;
  commit: string | null;
  executableSha256: string | null;
  backend: EngineBackend | null;
  detail: string;
}

export interface EngineCapabilities {
  prepare: boolean;
  shard: boolean;
  training: boolean;
  evaluation: boolean;
  inference: boolean;
  probe: boolean;
  cancellation: boolean;
}

export interface InferenceRequest {
  prompt: string;
  checkpointPath: string;
  tokenizerPath: string;
  maxNewTokens: number;
  temperature: number;
  seed: number;
  backend: EngineBackend;
}

export interface PrepareDatasetRequest {
  corpusPath: string;
  tokenizerOut: string;
  shardOut: string;
  targetVocab: number;
  minPairFrequency: number;
  sequenceLength: number;
  recordMode: 'stream' | 'blank-line';
  responseDelimiters: string[];
}

export interface ShardDatasetRequest {
  tokenizerPath: string;
  corpusPath: string;
  shardOut: string;
  sequenceLength: number;
  recordMode: 'stream' | 'blank-line';
  responseDelimiters: string[];
}

export interface EvaluationRequest {
  tokenizerPath: string;
  checkpointPath: string;
  heldoutPath: string;
  format: 'text' | 'shard';
  sequenceLength: number | null;
}

export interface TrainingNewRequest {
  tokenizerPath: string;
  shardPaths: string[];
  checkpointOut: string;
  cursorOut: string;
  updates: number;
  batchSize: number;
  accumulationSteps: number;
  modelSeed: number;
  dataSeed: number;
  contextLength: number;
  embeddingDim: number;
  layers: number;
  heads: number;
  kvHeads: number;
  ffnHiddenDim: number;
  rmsNormEps: number;
  tieWordEmbeddings: 0 | 1;
  learningRate: number;
  beta1: number;
  beta2: number;
  epsilon: number;
  weightDecay: number;
  maxGradNorm: number;
}

export interface TrainingResumeRequest {
  tokenizerPath: string;
  shardPaths: string[];
  checkpointIn: string;
  cursorIn: string;
  checkpointOut: string;
  cursorOut: string;
  updates: number;
  batchSize: number;
  accumulationSteps: number;
}

export interface ProbeRequest {
  tokenizerPath: string;
  shardPath?: string;
  checkpointPath?: string;
  prompt?: string;
  topK?: number;
  traceSteps?: number;
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
  getCapabilities(): Promise<EngineCapabilities>;
  prepareDataset(request: PrepareDatasetRequest): Promise<NativeResult>;
  shardDataset(request: ShardDatasetRequest): Promise<NativeResult>;
  trainNew(request: TrainingNewRequest): Promise<NativeResult>;
  trainResume(request: TrainingResumeRequest): Promise<NativeResult>;
  evaluate(request: EvaluationRequest): Promise<NativeResult>;
  runInference(request: InferenceRequest): Promise<NativeResult>;
  probe(request: ProbeRequest): Promise<NativeResult>;
  cancelActiveRun(): Promise<NativeResult>;
}
