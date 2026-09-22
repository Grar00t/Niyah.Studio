import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const contractsDir = join(root, 'contracts');

async function readJson(name) {
  const path = join(contractsDir, name);
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`${name}: invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const files = await readdir(contractsDir);
for (const file of files.filter((name) => name.endsWith('.json'))) await readJson(file);

const lock = await readJson('engine.lock.json');
if (lock.schema_version !== 1) throw new Error('engine.lock.json: schema_version must be 1');
if (lock.repository !== 'Grar00t/Niyah.Engine') throw new Error('engine.lock.json: repository identity mismatch');
if (lock.commit !== null && !/^[a-f0-9]{40}$/.test(lock.commit)) throw new Error('engine.lock.json: invalid commit SHA');
if (!lock.artifacts || typeof lock.artifacts !== 'object') throw new Error('engine.lock.json: artifacts missing');

let pinnedArtifacts = 0;
for (const name of ['niyah', 'niyah-train', 'niyah_probe']) {
  const artifact = lock.artifacts[name];
  if (!artifact || typeof artifact !== 'object') throw new Error(`engine.lock.json: missing ${name}`);
  const bothNull = artifact.path === null && artifact.sha256 === null;
  const bothPinned = typeof artifact.path === 'string' && artifact.path.length > 0 && typeof artifact.sha256 === 'string' && /^[a-f0-9]{64}$/.test(artifact.sha256);
  if (!bothNull && !bothPinned) throw new Error(`engine.lock.json: ${name} path/hash must be both null or both pinned`);
  if (bothPinned) pinnedArtifacts += 1;
}
if (pinnedArtifacts > 0 && lock.commit === null) throw new Error('engine.lock.json: pinned artifacts require an exact engine commit');

const snapshot = await readJson('engine-cli.snapshot.json');
if (snapshot.source_repository !== 'Grar00t/Niyah.Engine') throw new Error('engine-cli.snapshot.json: repository mismatch');
if (!/^[a-f0-9]{40}$/.test(snapshot.source_commit ?? '')) throw new Error('engine-cli.snapshot.json: invalid source commit');
if (snapshot.evidence_scope !== 'repository-source contract snapshot; not runtime reproduction') throw new Error('engine-cli.snapshot.json: evidence scope changed');

console.log('CONTRACT_GATE=PASS');
console.log(`ENGINE_LOCK=${pinnedArtifacts === 0 ? 'UNPINNED' : 'PINNED'}`);
console.log(`CLI_SNAPSHOT_COMMIT=${snapshot.source_commit}`);
