import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const forbidden = [
  /(?:^|["'\/])firebase(?:["'\/]|$)/i,
  /@google\/generative-ai/i,
  /@google\/genai/i,
  /google-analytics/i,
  /googletagmanager/i,
  /mixpanel/i,
  /segment\.io/i,
  /posthog/i,
];
const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'target']);
const textExt = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.html', '.css', '.toml', '.yml', '.yaml']);
const allowDocs = new Set([
  'SYSTEM_CONTRACT.md',
  'AI_STUDIO_OPENING_PROMPT.md',
  'AI_STUDIO_SUGGESTION_POLICY.md',
  'AGENTS.md',
  'README.md',
  'docs/AI_STUDIO_BOUNDARY.md',
]);
const failures = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { await walk(path); continue; }
    if (!textExt.has(extname(entry.name))) continue;
    const rel = relative(root, path).replaceAll('\\', '/');
    if (rel === 'scripts/check-forbidden.mjs') continue;
    const text = await readFile(path, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(text) && !allowDocs.has(rel)) failures.push(`${rel}: ${pattern}`);
    }
  }
}

await walk(root);
if (failures.length) {
  console.error('FORBIDDEN_DEPENDENCY_OR_TELEMETRY_REFERENCE');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('FORBIDDEN_REFERENCE_GATE=PASS');
