import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const runtimeRoots = ['src', 'src-tauri'];
const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'target', 'gen']);
const textExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.rs']);
const forbiddenRuntimePatterns = [
  /https?:\/\//i,
  /wss?:\/\//i,
  /navigator\.sendBeacon\s*\(/i,
  /new\s+WebSocket\s*\(/i,
  /EventSource\s*\(/i,
  /\bfetch\s*\(\s*[`'"]https?:/i,
];
const failures = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!textExt.has(extname(entry.name))) continue;
    const text = await readFile(path, 'utf8');
    const rel = relative(root, path).replaceAll('\\', '/');
    for (const pattern of forbiddenRuntimePatterns) {
      if (pattern.test(text)) failures.push(`${rel}: ${pattern}`);
    }
  }
}

for (const runtimeRoot of runtimeRoots) await walk(join(root, runtimeRoot));

if (failures.length > 0) {
  console.error('REMOTE_RUNTIME_BOUNDARY=FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('REMOTE_RUNTIME_BOUNDARY=PASS');
