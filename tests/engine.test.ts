import { describe, expect, it } from 'vitest';
import { OfflineEngineAdapter } from '../src/engine/OfflineEngineAdapter';

describe('offline engine adapter', () => {
  it('fails closed for browser inference', async () => {
    const adapter = new OfflineEngineAdapter();
    const result = await adapter.runInference({
      prompt: 'hello',
      checkpointPath: '',
      tokenizerPath: '',
      maxNewTokens: 32,
      temperature: 0,
      seed: 42,
      backend: 'cpu',
    });
    expect(result.status).toBe('UNSUPPORTED');
    expect(result.stderr).toContain('ENGINE_OFFLINE');
    expect(result.stdout).toBe('');
  });

  it('exposes no native capabilities', async () => {
    const capabilities = await new OfflineEngineAdapter().getCapabilities();
    expect(Object.values(capabilities).every((value) => value === false)).toBe(true);
  });
});
