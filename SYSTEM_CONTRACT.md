# Niyah Studio System Contract

Niyah Studio is a local-first engineering workstation. React is the presentation/control plane. The real Niyah.Engine native runtime is the only model execution source of truth.

## Runtime modes

- **AI_STUDIO_WEB_PREVIEW**: deterministic dataset tooling works; native engine shows `ENGINE_OFFLINE`; no simulations.
- **LOCAL_DESKTOP_SIDECAR**: Tauri/Rust launches pinned Niyah.Engine executables through typed commands and validated argv.
- **LOCAL_DESKTOP_FFI**: future optimization only after measured need.

## Product surfaces

Chat, Datasets, Training, Evaluation, Checkpoints, Evidence Graph, Evidence Ledger, Runtime Inspector.

## Truth contract

No fake numbers. No decorative training curves. No simulated CUDA. No fake terminal. No inferred PASS. Documentation is not runtime evidence.

## Cloud exclusion

Core runtime is intentionally cloud-independent. Do not add Firebase, Gemini runtime calls, Google analytics/marketing integrations, telemetry, tracking, or remote data upload.
