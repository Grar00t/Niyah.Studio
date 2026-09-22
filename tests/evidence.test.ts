import { describe, expect, it } from 'vitest';
import { makeReceipt, toRunReceiptDocument } from '../src/evidence/types';

describe('evidence receipts', () => {
  it('serializes to the repository run-receipt contract', () => {
    const receipt = makeReceipt('dataset.analyze', 'PASS', 'DETERMINISTIC_LOCAL', 'ok');
    receipt.inputSha256 = ['a'.repeat(64)];
    const document = toRunReceiptDocument(receipt);
    expect(document.schema_version).toBe(1);
    expect(document.receipt_id).toBe(receipt.id);
    expect(document.status).toBe('PASS');
    expect(document.input_sha256).toEqual(['a'.repeat(64)]);
  });

  it('does not complete RUNNING receipts', () => {
    const receipt = makeReceipt('engine.training', 'RUNNING', 'NATIVE_PROCESS', 'started');
    expect(receipt.completedAt).toBeNull();
  });
});
