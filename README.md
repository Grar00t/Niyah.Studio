# Niyah Studio

Local-first React/Tauri engineering workstation for `Grar00t/Niyah.Engine`.

Niyah Studio is the control plane. `Niyah.Engine` remains the model execution source of truth.

## Repository contract

This repository intentionally does **not** contain a browser language model, simulated trainer, fake CUDA runtime, fake terminal, cloud database, hosted model dependency, telemetry, or marketing SDK.

Google AI Studio may be used to develop the repository, but the downloaded application must not require Gemini, Firebase, Google services, or any cloud credential to use its local core.

## Current scaffold

### Web-verifiable

- React 19 + TypeScript strict + Vite.
- ChatGPT-like local workstation shell.
- Fail-closed `EngineAdapter` with `ENGINE_OFFLINE` browser behavior.
- Deterministic UTF-8 TXT / JSONL / JSON / CSV parsing.
- SHA-256 source and record identity.
- CRLF and trailing-whitespace normalization.
- Exact duplicate groups.
- Seeded deterministic train/validation/test assignment.
- Exact cross-split leakage detection.
- Deterministic near-duplicate analysis using token shingles + Jaccard similarity with explicit budgets.
- Dataset manifest model.
- Evidence receipts and export contract.
- Purple Obsidian-inspired evidence/provenance graph with search, kind filters, selection, pan, and zoom.
- Training / Evaluation / Checkpoint / Probe contract surfaces that do not simulate native results.
- Static guard against Firebase/Gemini/Google marketing/telemetry dependencies.
- Static remote-runtime boundary guard.

### Native scaffold only

- Tauri v2 shell.
- Minimal typed `engine_status` / `engine_capabilities` commands.
- No arbitrary shell access.
- `contracts/engine.lock.json` starts unpinned.
- `contracts/engine-cli.snapshot.json` records a repository-source CLI contract snapshot from Niyah.Engine commit `b80050086d6c8476650cda0d4529c3fd0dd5b8c1`; this is not runtime proof.

Native inference, training, evaluation, and probe execution are intentionally **not** claimed as implemented or verified yet.

## Verify web scope

```bash
npm install --no-audit --no-fund
npm run verify
npm run dev
```

The development server is fixed to port `3000` for Google AI Studio Build compatibility.

## Google AI Studio workflow

1. Create/push this repository as a private GitHub repository.
2. Import it into Google AI Studio Build using React.
3. Keep the repository system instructions.
4. Paste `AI_STUDIO_OPENING_PROMPT.md` as the first project prompt.
5. Follow only suggestions that conform to `AI_STUDIO_SUGGESTION_POLICY.md`.
6. If suggestions drift, use `AI_STUDIO_PROMPT_SEQUENCE.md`.

## Native transition

After exporting locally, the next native gate is deliberately small:

1. pin one exact Niyah.Engine revision and local artifact set in `contracts/engine.lock.json`;
2. verify artifact SHA-256;
3. inspect the exact CLI at that pinned revision;
4. implement one typed Tauri/Rust operation, preferably `niyah run`;
5. capture stdout, stderr, exit code, and artifact identity;
6. run a real native smoke test;
7. only then expand to training process management.

## GitHub bootstrap

`PUSH_TO_GITHUB.ps1` is included for a local machine with authenticated `git` and `gh`. It creates `Grar00t/Niyah.Studio` as private if it does not exist, otherwise it only pushes when `origin` points to that exact repository.
