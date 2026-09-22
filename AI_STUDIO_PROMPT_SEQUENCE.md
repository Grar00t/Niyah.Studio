# Suggested AI Studio Sequence

Use `AI_STUDIO_OPENING_PROMPT.md` first.

After it finishes and shows three suggestions, you can click a suggestion only when it follows `AI_STUDIO_SUGGESTION_POLICY.md`.

If the suggestions drift toward provider integrations, use these fallback prompts.

## Fallback 1 — WEB_VERIFIABLE: Dataset hardening

Audit the current deterministic dataset pipeline end-to-end. Fix the highest evidence-backed correctness or performance defect without adding cloud/runtime dependencies. Move expensive deterministic work to a Web Worker where justified, add regression tests, and run the full web verification gate. Do not expand into native engine work.

## Fallback 2 — WEB_VERIFIABLE: Evidence graph hardening

Audit the current Evidence Graph against `docs/GRAPH_CONTRACT.md`. Improve search, filtering, selection, pan/zoom, accessibility, deterministic layout identity, and performance without inventing nodes or metrics. Add tests for graph-model derivation where useful and run the full web verification gate.

## Fallback 3 — WEB_VERIFIABLE: Workstation UX hardening

Audit Chat, Dataset, Training, Evaluation, Checkpoint, Probe, Evidence, and Runtime Inspector surfaces as one desktop workstation. Improve information architecture and accessibility without adding marketing surfaces, fake metrics, simulated native output, provider SDKs, or cloud requirements. Preserve the three-region composition and purple evidence identity. Run the full web verification gate.

## Native transition prompt — only after local export

LOCAL_NATIVE_REQUIRED: Pin one exact `Grar00t/Niyah.Engine` revision and one local platform artifact set in `contracts/engine.lock.json`. Inspect the exact CLI source at that commit before editing. Implement the smallest typed Tauri/Rust bridge for ONE operation only, preferably `niyah run`, with structured argv, canonicalized paths, artifact SHA-256 verification, stdout/stderr/exit-code capture, and no arbitrary shell execution. Add a native smoke test. Do not implement training in the same patch.
