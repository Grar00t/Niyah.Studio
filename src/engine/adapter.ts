import type { EngineAdapter } from './EngineAdapter';
import { OfflineEngineAdapter } from './OfflineEngineAdapter';

let adapter: EngineAdapter | null = null;

export function getEngineAdapter(): EngineAdapter {
  if (!adapter) adapter = new OfflineEngineAdapter();
  return adapter;
}

export function setEngineAdapter(next: EngineAdapter): void {
  adapter = next;
}
