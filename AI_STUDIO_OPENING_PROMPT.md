# Niyah Studio — First Prompt After GitHub Import

You are operating inside an existing repository named `Niyah.Studio`.

Do NOT regenerate the repository from scratch.
Do NOT replace its architecture with a Google/Firebase/Gemini-native stack.
Do NOT optimize for a demo that only works while hosted inside Google AI Studio.

The repository must remain a downloadable, local-first product whose core runtime works without Google services, Firebase, Gemini, cloud authentication, telemetry, or hosted inference.

## STEP 0 — Read the contracts before editing

Read these files completely and treat them as binding:

- `AGENTS.md`
- `SYSTEM_CONTRACT.md`
- `AI_STUDIO_SUGGESTION_POLICY.md`
- `docs/ARCHITECTURE.md`
- `docs/ENGINE_CONTRACT.md`
- `docs/DATA_CONTRACT.md`
- `docs/EVIDENCE_MODEL.md`
- `docs/GRAPH_CONTRACT.md`
- `docs/SECURITY.md`
- `docs/AI_STUDIO_BOUNDARY.md`
- `contracts/engine.lock.json`
- `contracts/engine-cli.snapshot.json`
- `contracts/*.schema.json`
- `scripts/check-forbidden.mjs`
- `scripts/check-network-boundary.mjs`

Then inspect the complete source tree and tests before editing.

## STEP 1 — Establish the real baseline

Run the repository verification in this environment.

Use:

```text
npm install --no-audit --no-fund
npm run check:forbidden
npm run check:network-boundary
npm run check:contracts
npm run typecheck
npm test
npm run build
```

If installation generates `package-lock.json`, keep it and use it as the dependency lock going forward.

Record the exact commands and results.
Never say PASS for a command that did not execute successfully.
Never hide a failure by deleting a test, weakening TypeScript strictness, or weakening a guard script.

## STEP 2 — Understand the product boundary

`Grar00t/Niyah.Engine` is the only native model execution source of truth.

The repository contains `contracts/engine-cli.snapshot.json`, which is a source-code contract snapshot tied to a specific Niyah.Engine commit. It is NOT proof that a local binary exists or ran successfully.

The browser/AI Studio environment is `AI_STUDIO_WEB_PREVIEW`.

Therefore native features must display one of:

- `ENGINE_OFFLINE`
- `UNPINNED`
- `UNSUPPORTED`

Do not implement a substitute model in TypeScript.
Do not fabricate native output to make screens look complete.

Forbidden browser substitutes include:

- TypeScript Transformer inference;
- JavaScript trainer;
- simulated AdamW/backpropagation;
- synthetic loss curves;
- fake CUDA/device status;
- fake terminal output;
- fake checkpoints;
- generated benchmark numbers;
- fake streaming tokens.

## STEP 3 — Product target

Advance the current scaffold into a polished local AI engineering workstation.

The primary layout must remain a three-region desktop workspace:

```text
LEFT NAVIGATION      CENTER WORKSPACE                    RIGHT INSPECTOR
----------------     -------------------------------     -----------------
New Chat             Chat / active engineering view     engine identity
Conversations        prompt composer                    pinned commit
Datasets             dataset workbench                  executable hash
Training             training controls                  backend
Evaluation           evaluation                         dataset identity
Checkpoints          checkpoint inspection              checkpoint identity
Probe                native probe surface               evidence receipt
Evidence Graph       graph visualization                active process state
Evidence             evidence ledger                    measured state only
```

The visual character should be restrained, serious, technical, and desktop-oriented.
Use the existing dark neutral palette and purple accent system.

Do not add:

- marketing landing pages;
- hero sections;
- pricing;
- testimonials;
- product hype;
- fake KPIs;
- decorative cards everywhere;
- provider branding;
- Google/Gemini/Firebase logos or promotional surfaces.

## STEP 4 — Chat surface

Make Chat feel as clean and usable as a modern high-quality AI chat interface, but preserve the native truth boundary.

Requirements:

- conversation timeline;
- user messages;
- native Niyah response messages only when a real adapter returns them;
- multiline composer;
- attachments prepared for local files;
- checkpoint selector architecture;
- generation configuration architecture;
- explicit runtime state;
- slash-command palette for Studio actions where useful.

Do not implement arbitrary shell commands from chat.
Slash commands must map to validated Studio operations.

In web preview, sending a prompt must fail closed through `OfflineEngineAdapter` and display the real `ENGINE_OFFLINE` state.
Do not fake a response.

## STEP 5 — Dataset Workbench

Strengthen deterministic local data engineering.

Preserve immutable source input.

Current supported directions:

- UTF-8 TXT;
- JSONL;
- JSON;
- CSV;
- SHA-256 source identity;
- deterministic normalization;
- exact duplicates;
- deterministic seeded train/validation/test assignment;
- exact cross-split leakage;
- deterministic near-duplicate analysis using documented token shingles + Jaccard similarity;
- evidence receipts;
- manifest preview/export.

Improve this into a production-quality workflow.

Add where justified and tested:

- drag/drop import;
- format/encoding diagnostics;
- source-line provenance;
- record search/filter/sort;
- exact duplicate group inspection;
- near-duplicate pair inspection;
- split counts and split explorer;
- leakage review queue;
- safe derived transformations;
- manifest export;
- audit/evidence export.

For large datasets:

- avoid materializing unnecessary duplicate copies;
- move heavy deterministic work to Web Workers;
- use transferable buffers where appropriate;
- use OPFS only as browser-private internal storage when useful;
- handle storage quota and unsupported conditions explicitly;
- never describe OPFS as a normal user filesystem path.

Do not use an LLM to decide whether records are factually true or “good”.
AI-assisted review, if ever added later, must be optional and labeled `AI_SUGGESTION`, never deterministic evidence.

## STEP 6 — Purple Evidence Graph

Treat `docs/GRAPH_CONTRACT.md` as binding.

Deepen the existing graph into an Obsidian-inspired local provenance graph with a dark canvas and restrained purple visual language.

This is NOT a decorative “thinking animation”.

Graph node families should support the architecture even when some families currently have zero nodes:

- Studio project;
- Niyah.Engine revision;
- executable identity;
- dataset;
- record;
- tokenizer;
- shard;
- training run;
- checkpoint;
- evaluation;
- conversation;
- inference receipt;
- evidence receipt.

Graph relationships may include:

- `contains`;
- `derived_from`;
- `prepared_with`;
- `trained_with`;
- `produced`;
- `evaluated_on`;
- `generated_by`;
- `references`;
- `verified_by`;
- `records`.

Requirements:

- deterministic identity for every node;
- never create fake nodes to fill empty space;
- search;
- node-kind filters;
- selection inspector;
- keyboard accessibility;
- pan/zoom;
- stable performance;
- clear distinction between visual purple glow and evidentiary PASS/FAIL state.

If you add a force simulation, it is layout-only and must not generate semantic relationships.

## STEP 7 — Training surface

Build a complete professional control surface around the real `niyah-train` contract snapshot.

The screen may contain configuration forms and validation in web preview, but must not claim training started.

Support architectural distinction between:

- `new` training;
- `resume` training.

The source contract snapshot currently records the real argument families.
Do not invent additional engine flags.

Training visualization must be designed to consume actual native events later.
The documented progress line is:

```text
update=I/N loss=L
```

Unknown native lines must remain raw log records.
Do not generate sample loss points in production UI.
If there are no native events, chart state is EMPTY / NOT_RUN.

## STEP 8 — Evaluation surface

Build the UI around the native `niyah eval` contract only.

Keep these evidence classes visibly separate:

- MEASURED;
- DERIVED;
- USER_ANNOTATED;
- UNKNOWN.

Do not infer “intelligence”, “truth”, “production-ready”, or similar judgments from loss/perplexity alone.

## STEP 9 — Checkpoints

Model checkpoint state explicitly:

- DISCOVERED;
- HASHED;
- COMPATIBLE;
- VERIFIED;
- CORRUPT;
- UNKNOWN.

Existence is not verification.
Never overwrite or delete artifacts silently.

Prepare comparison UI that can later compare objective metadata and actual generated outputs without declaring a winner automatically.

## STEP 10 — Probe

Use the checked-in `engine-cli.snapshot.json` as the current source-contract reference for the `niyah_probe` UI.

Do not simulate probe results.
Prepare the interface to display raw native output later.

## STEP 11 — Evidence ledger

Every deterministic or native operation should produce an explicit receipt when it actually runs.

Strengthen the ledger so receipts can be inspected and exported.

Preserve:

- operation;
- status;
- source;
- timestamps;
- engine identity when available;
- input hashes;
- output hashes;
- exit code;
- raw detail/failure reason.

Never convert absence of error into PASS.

## STEP 12 — React quality

Use React as UI/control-plane only.

Requirements:

- small focused components;
- feature-oriented modules;
- stable state boundaries;
- avoid giant `App.tsx` as features grow;
- avoid duplicated derived state;
- keep high-frequency native events away from broad rerenders;
- lazy-load heavy surfaces if useful;
- preserve strict TypeScript;
- accessible keyboard/focus behavior;
- responsive but desktop-first layout.

Do not add a large state-management framework unless repository complexity proves it necessary.

## STEP 13 — Tauri boundary

You may improve `src-tauri` contracts and types, but this environment does not prove native integration.

Do not claim Tauri/Niyah.Engine execution passed unless it really ran here with a real pinned engine artifact.

Native architecture remains:

```text
React
  -> typed Tauri command
  -> Rust validation
  -> pinned known executable
  -> structured argv
  -> Niyah.Engine
```

Never expose arbitrary shell execution.
Never accept a raw command string from the frontend.
Never enable unrestricted shell/plugin permissions for convenience.

## STEP 14 — Provider/runtime prohibition

The following are hard failures unless the owner explicitly changes the repository contract:

- Firebase dependency/configuration;
- Gemini/GenAI runtime dependency;
- Google Analytics / Tag Manager;
- ad or marketing SDK;
- telemetry/tracking;
- silent remote logging;
- cloud database as a core requirement;
- cloud authentication as a core requirement;
- remote dataset upload;
- hosted model used to impersonate Niyah.Engine.

Do not weaken:

```text
npm run check:forbidden
npm run check:network-boundary
npm run check:contracts
```

to make your changes pass.

## STEP 15 — Verification before finishing

At minimum execute:

```text
npm run check:forbidden
npm run check:network-boundary
npm run check:contracts
npm run typecheck
npm test
npm run build
```

Fix real failures.
Do not suppress them.

Inspect the rendered application as well as build output.
Verify the main flow:

```text
open app
-> import explicit fixture
-> inspect deterministic dataset findings
-> rebuild deterministic split
-> run deterministic near-duplicate check
-> inspect purple evidence graph
-> inspect evidence receipt
-> open Chat
-> send prompt
-> verify truthful ENGINE_OFFLINE behavior
```

## Completion format

Return exactly these sections:

### IMPLEMENTED
Only code actually present.

### EXECUTED_AND_PASSED
Only verification actually executed successfully.

### FAILED_OR_BLOCKED
Exact failures/blockers.

### NATIVE_UNVERIFIED
Everything requiring local desktop + real Niyah.Engine.

### ARCHITECTURAL_DEVIATIONS
If none, write `NONE`.

### NEXT_SMALLEST_NATIVE_GATE
One small evidence-backed local step only.

### THREE_SAFE_NEXT_PROMPTS
Propose exactly three clickable follow-up prompts conforming to `AI_STUDIO_SUGGESTION_POLICY.md`.
Prefix each with either `WEB_VERIFIABLE` or `LOCAL_NATIVE_REQUIRED`.

Then stop. Do not auto-expand scope beyond the completed turn.
