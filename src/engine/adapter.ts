import type { EngineAdapter } from './EngineAdapter';
import { OfflineEngineAdapter } from './OfflineEngineAdapter';
import { TauriEngineAdapter } from './TauriEngineAdapter';

let adapter: EngineAdapter | null = null;

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function getEngineAdapter(): EngineAdapter {
  if (!adapter) adapter = isTauriRuntime() ? new TauriEngineAdapter() : new OfflineEngineAdapter();
  return adapter;
}

export function setEngineAdapter(next: EngineAdapter): void {
  adapter = next;
}
