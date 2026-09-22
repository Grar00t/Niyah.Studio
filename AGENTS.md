# Niyah Studio Agent Contract

This repository is a local-first control plane for **Grar00t/Niyah.Engine**.

## Non-negotiable boundaries

1. Never implement a Transformer, trainer, optimizer, tokenizer, evaluator, sampler, CUDA backend, or checkpoint runtime in TypeScript.
2. Never fabricate model output, training metrics, loss, perplexity, GPU telemetry, CLI output, hashes, or test results.
3. In browser/AI Studio preview, native model features must return/display `ENGINE_OFFLINE` or `UNSUPPORTED`.
4. Do not add Firebase, Gemini runtime SDKs, Google analytics/marketing SDKs, telemetry, ad SDKs, tracking pixels, or remote logging.
5. Do not add cloud authentication, cloud databases, cloud storage, or hosted inference unless the owner explicitly changes this repository contract.
6. Do not expose arbitrary shell execution to the frontend.
7. Niyah.Engine remains a separate repository and source of truth.
8. Preserve `contracts/engine.lock.json`; unknown identities remain `null`/`UNPINNED`.
9. Every PASS must be backed by an executed verification condition.
10. Test fixtures must be visibly identified as test fixtures and never presented as production training data.

## Development order

Inspect -> narrow contract -> implement -> tests -> typecheck -> build -> visible verification -> evidence ledger.

## Forbidden dependency gate

`npm run check:forbidden` must stay green. Do not weaken or delete the gate to make a build pass.
