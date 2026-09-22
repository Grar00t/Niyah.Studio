import type { DatasetAnalysis, NearDuplicateFinding, NearDuplicateOptions } from '../datasets/core';

export type DatasetWorkerRequest =
  | { id: string; type: 'ANALYZE'; name: string; bytes: ArrayBuffer }
  | { id: string; type: 'NEAR_DUPLICATES'; analysis: DatasetAnalysis; options: NearDuplicateOptions };

export type DatasetWorkerResponse =
  | { id: string; type: 'ANALYZE_DONE'; analysis: DatasetAnalysis }
  | { id: string; type: 'NEAR_DUPLICATES_DONE'; findings: NearDuplicateFinding[] }
  | { id: string; type: 'ERROR'; error: string };
