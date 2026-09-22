# Opening Prompt for Google AI Studio

You are now operating inside the existing `Niyah.Studio` repository.

Do not regenerate this project from scratch. Inspect the repository first and treat these files as binding architecture contracts:

- `AGENTS.md`
- `SYSTEM_CONTRACT.md`
- `docs/ARCHITECTURE.md`
- `docs/ENGINE_CONTRACT.md`
- `docs/DATA_CONTRACT.md`
- `docs/EVIDENCE_MODEL.md`
- `docs/SECURITY.md`
- `contracts/*.json`
- `scripts/check-forbidden.mjs`

## Mission for this session

Advance the existing application from a verified scaffold into the strongest possible **AI_STUDIO_WEB_PREVIEW** implementation without violating the native-engine boundary.

### 1. Inspect before editing

Read the complete source tree and current tests. Run the existing verification commands before changing code:

```text
npm install --no-audit --no-fund
npm run check:forbidden
npm run typecheck
npm test
npm run build
```

Record the real baseline. Do not call a gate PASS unless it executed successfully.

### 2. Preserve the core architecture

Niyah.Engine is external and authoritative.

Do NOT create:
- a TypeScript model;
- a TypeScript trainer;
- fake inference;
- fake CLI output;
- synthetic loss curves;
- simulated CUDA;
- fabricated checkpoints;
- invented native APIs.

When native execution is unavailable in AI Studio, use `ENGINE_OFFLINE` or `UNSUPPORTED`.

Do not weaken the fail-closed behavior to make the application appear more complete.

### 3. Strict cloud/runtime prohibition

This repository must remain runnable after download without Gemini, Firebase, Google services, or any hosted AI provider.

Do not add:
- Firebase packages or configuration;
- Gemini/GenAI runtime SDKs;
- Google Analytics or Tag Manager;
- advertising/marketing SDKs;
- telemetry or remote logging;
- cloud authentication;
- cloud databases;
- silent remote upload of datasets.

Do not delete or weaken `scripts/check-forbidden.mjs`.

Gemini is acting only as the development agent in AI Studio. It must not become a runtime dependency of the product.

### 4. UI target

Keep the product visually closer to a serious AI workstation than a generic dashboard.

Use the current three-region desktop composition:
- compact left navigation;
- central ChatGPT-like workspace;
- collapsible/right runtime inspector.

Preserve restrained dark surfaces and the purple accent system.

Do not turn every area into cards.
Do not add a marketing landing page, hero section, testimonials, pricing, product slogans, fake KPIs, or onboarding fluff.

### 5. Evidence Graph

Deepen the existing purple graph into an Obsidian-inspired engineering graph, while keeping every graph entity grounded in application state.

Graph entity families should be extensible to:
- engine revision;
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

Graph edges represent explicit relationships such as:
- derived_from;
- trained_with;
- evaluated_on;
- produced;
- generated_by;
- references;
- verified_by.

Requirements:
- no fabricated nodes;
- no fake metrics;
- searchable nodes;
- type filters;
- hover/selection inspector;
- pan/zoom if implemented cleanly;
- preserve performance on larger graphs;
- deterministic identity for graph entities;
- purple glow may be visual only and must not imply validation status.

### 6. Dataset Workbench

Strengthen real deterministic local functionality:
- TXT, JSONL, JSON, CSV parsing where implemented robustly;
- strict UTF-8 handling;
- SHA-256 source identity;
- immutable original input;
- explicit derived transforms;
- exact duplicate groups;
- deterministic split assignment;
- exact cross-split leakage;
- review flags;
- exportable manifest and evidence receipts.

Add near-duplicate analysis only if it is deterministic, documented, tested, and does not freeze the UI. Prefer a Worker for expensive analysis.

Do not use an LLM to decide whether data is true or good.

### 7. Browser-local storage

If persistent project state materially improves the workflow, use browser-local mechanisms only.

Prefer:
- IndexedDB for structured metadata;
- OPFS for larger internal artifacts where supported;
- Web Workers for heavy computation.

Treat OPFS as browser-private storage, not a normal filesystem path.
Handle quota/unsupported conditions explicitly.
Do not make persistence a prerequisite for basic operation.

### 8. Chat surface

Make the chat experience excellent while preserving truth.

The composer may accept user prompts, attachments, and explicit Studio slash commands, but engine-dependent execution must fail closed while offline.

Do not fake streamed tokens.
Do not animate fake typing to imply native generation.

If no engine is available, the UI should clearly explain that dataset and evidence tooling remains functional while native model execution is offline.

### 9. Training / Evaluation / Checkpoints

Build complete professional control surfaces around the typed adapter contract, but do not generate native results.

Training UI should be ready to render actual native events later.
Evaluation UI should distinguish measured/derived/unknown evidence.
Checkpoint UI should distinguish discovered/hashed/compatible/verified/corrupt/unknown.

Unknown native capabilities remain disabled or `UNSUPPORTED`.

### 10. Performance and React discipline

Keep high-frequency/transient state out of broad application rerenders.
Use stable component boundaries.
Avoid unnecessary effects and duplicated derived state.
Lazy-load heavy feature surfaces where useful.
Keep large dataset processing off the main thread when practical.

### 11. Tests and regression protection

Expand tests around every new deterministic behavior.
Minimum gates before completion:

```text
npm run check:forbidden
npm run typecheck
npm test
npm run build
```

Do not suppress failing tests.
Do not delete tests to obtain green output.

### 12. Tauri boundary

You may inspect and improve the Tauri scaffold if doing so does not require inventing Niyah.Engine commands.

Do NOT claim native integration verified inside AI Studio.
Do NOT bundle a fake engine binary.
Do NOT expose arbitrary shell access.

Keep the next desktop step explicit and small.

## Completion response

When finished, do not give a marketing summary.
Return an evidence ledger with exactly these sections:

### IMPLEMENTED
Only functionality present in the repository.

### EXECUTED_AND_PASSED
Only commands/tests actually executed successfully in this session.

### FAILED_OR_BLOCKED
Include exact failures and why they remain.

### NATIVE_UNVERIFIED
Anything requiring local Tauri/Niyah.Engine execution.

### ARCHITECTURAL_DEVIATIONS
Any deviation from repository contracts, with justification. If none, say `NONE`.

### NEXT_SMALLEST_NATIVE_GATE
One evidence-backed next step for local desktop integration. Do not expand scope.

Then stop.
