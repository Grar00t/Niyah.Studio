# Niyah Studio

Local-first React/Tauri engineering workstation for `Grar00t/Niyah.Engine`.

Niyah Studio is the control plane. `Niyah.Engine` remains the model execution source of truth.

## Repository contract

This repository intentionally does **not** contain a browser language model, simulated trainer, fake CUDA runtime, fake terminal, cloud database, hosted model dependency, telemetry, or marketing SDK.

Google AI Studio may be used to develop the repository, but the downloaded application must not require Gemini, Firebase, Google services, or any cloud credential to use its local core.

## Current scope

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

### Native Windows CPU inference

- Tauri v2 shell with typed `engine_status`, `engine_capabilities`, `engine_models`, and `engine_inference` commands.
- `contracts/engine.lock.json` pins a local Windows x86_64 CPU build; startup verifies the executable SHA-256 and actual CLI contract.
- `src-tauri/models.local.json` pins two existing V10 checkpoints and their tokenizer. The frontend selects a catalog ID; it cannot supply executable or checkpoint paths.
- Inference uses structured process arguments, a 120-second timeout, bounded stdout/stderr capture, and artifact hash checks before and after execution.
- Evidence export includes the exact request, model/runtime identities, both process streams, exit code, and a separate `NOT_EVALUATED` answer-quality status.
- `contracts/engine-cli.snapshot.json` records a repository-source CLI contract snapshot from Niyah.Engine commit `1ac94f267b6bd12e450d6e1b2f4ad38abf24fb89`, including prompt prefix/suffix, finetune, warmup, and backend selection; this is not runtime proof.

Only inference is connected. Training, evaluation, checkpoint, probe, and cancellation controls remain unavailable. A browser build stays `ENGINE_OFFLINE`; another machine without the exact local artifacts fails verification.

The pinned models are experimental: STEP0200 repeats tokens, and the four-fixture SFT canary fails unseen/grounded prompts. `ONLINE` means the native runtime is available. A successful process is not an answer-quality pass or a conversational release.

### Local retrieval tool

[`tools/rag`](tools/rag/README.md) provides a separate, tested WSL/PostgreSQL
retrieval CLI and Windows PowerShell entry point. It indexes explicitly approved,
hash-bound source manifests, uses cached multilingual E5 weights on CPU, and
returns source excerpts with provenance. Runtime dependencies are pinned. This
[`native_answer.py`](tools/rag/NATIVE_ANSWER.md) additionally passes validated
excerpts to the pinned native CPU runtime with an exact native-tokenizer context
budget. It remains a separate WSL CLI, not a Studio chat feature. It records failed
or unestablished answer quality separately from successful retrieval/execution.

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

## Verify native scope

On Windows with the Rust/MSVC and Tauri prerequisites already installed:

```powershell
npm ci --no-audit --no-fund
npm run build
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib -- --test-threads=1
cargo test --locked --manifest-path src-tauri/Cargo.toml --lib pinned_native_dispatch -- --ignored --nocapture
cargo build --locked --manifest-path src-tauri/Cargo.toml --features custom-protocol --bin niyah-studio
```

The ordinary tests use explicitly labeled fixtures. The opt-in `pinned_native_dispatch`
test requires the exact local artifacts and invokes real Engine subprocesses through
the production Tauri handler with a mock IPC transport. It checks Arabic output on
a learned greeting, deterministic replay, and the baseline's separately recorded
execution result. It does not test the displayed native WebView or prove model
generalization. `custom-protocol` embeds the built frontend in the desktop executable.

## GitHub bootstrap

`PUSH_TO_GITHUB.ps1` is included for a local machine with authenticated `git` and `gh`. It creates `Grar00t/Niyah.Studio` as private if it does not exist, otherwise it only pushes when `origin` points to that exact repository.
