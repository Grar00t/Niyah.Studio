import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { EngineIdentity, InferenceRequest, NativeResult } from '../src/engine/EngineAdapter';
import { TauriEngineAdapter } from '../src/engine/TauriEngineAdapter';
import { makeInferenceReceipt } from '../src/evidence/inference';
import { NativeContractView, type NativeSurface } from '../src/components/NativeContractView';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

// Explicit protocol fixtures: these are never used as application model output.
const request: InferenceRequest = { prompt: 'السلام عليكم', modelId: 'v10-sft-canary', maxNewTokens: 32, temperature: 0, seed: 42, backend: 'cpu' };
const fixture: NativeResult = {
  status: 'PASS', executionStatus: 'SUCCEEDED', qualityStatus: 'NOT_EVALUATED',
  stdout: 'TEST FIXTURE native stdout', stderr: 'TEST FIXTURE diagnostics', exitCode: 0, durationMs: 10,
  identity: { repository: 'Grar00t/Niyah.Engine', commit: 'a'.repeat(40), executableSha256: 'b'.repeat(64), modelId: request.modelId,
    checkpointSha256: 'c'.repeat(64), tokenizerSha256: 'd'.repeat(64), backend: 'cpu' },
};

describe('native inference protocol', () => {
  it('forwards the selected model identifier through the typed bridge command', async () => {
    invoke.mockResolvedValueOnce(fixture);
    expect(await new TauriEngineAdapter().runInference(request)).toEqual(fixture);
    expect(invoke).toHaveBeenLastCalledWith('engine_inference', { request });
  });

  it('turns bridge rejection into a failed execution with no fabricated output', async () => {
    invoke.mockRejectedValueOnce(new Error('ARTIFACT_HASH_MISMATCH'));
    const result = await new TauriEngineAdapter().runInference(request);
    expect(result.status).toBe('FAIL');
    expect(result.exitCode).toBeNull();
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('ARTIFACT_HASH_MISMATCH');
    expect(result.qualityStatus).toBe('NOT_EVALUATED');
  });

  it('preserves both process streams and verified identity without certifying answer quality', () => {
    const receipt = makeInferenceReceipt(fixture, '2026-09-28T00:00:00.000Z', request);
    expect(receipt.exitCode).toBe(0);
    expect(receipt.engineCommit).toBe(fixture.identity?.commit);
    expect(receipt.inputSha256).toEqual(['c'.repeat(64), 'd'.repeat(64)]);
    expect(JSON.parse(receipt.detail)).toMatchObject({ stdout: fixture.stdout, stderr: fixture.stderr, qualityStatus: 'NOT_EVALUATED', request });
    expect(receipt.startedAt).toBe('2026-09-28T00:00:00.000Z');
  });

  it.each<NativeSurface>(['training', 'evaluation', 'checkpoints', 'probe'])('does not enable %s just because the runtime is online', (surface) => {
    const engine: EngineIdentity = { status: 'ONLINE', repository: 'test fixture', commit: null, executableSha256: null, backend: 'cpu', detail: 'TEST FIXTURE' };
    const markup = renderToStaticMarkup(createElement(NativeContractView, { surface, engine }));
    expect(markup).toContain('<button disabled="">Operation not connected</button>');
    expect(markup).toContain('is not connected in this view');
  });
});
