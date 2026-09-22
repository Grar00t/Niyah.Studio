/// <reference lib="webworker" />
import { analyzeTextDataset, findNearDuplicates } from '../datasets/core';
import type { DatasetWorkerRequest, DatasetWorkerResponse } from './protocol';

const worker = self as DedicatedWorkerGlobalScope;

worker.onmessage = (event: MessageEvent<DatasetWorkerRequest>) => {
  void handle(event.data);
};

async function handle(request: DatasetWorkerRequest): Promise<void> {
  try {
    let response: DatasetWorkerResponse;
    if (request.type === 'ANALYZE') {
      const analysis = await analyzeTextDataset(request.name, new Uint8Array(request.bytes));
      response = { id: request.id, type: 'ANALYZE_DONE', analysis };
    } else {
      const findings = findNearDuplicates(request.analysis.records, request.options);
      response = { id: request.id, type: 'NEAR_DUPLICATES_DONE', findings };
    }
    worker.postMessage(response);
  } catch (error) {
    const response: DatasetWorkerResponse = {
      id: request.id,
      type: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
    worker.postMessage(response);
  }
}
