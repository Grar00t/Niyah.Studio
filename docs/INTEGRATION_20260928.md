# Native inference and retrieval integration — 2026-09-28

## Implemented and exercised

Studio now verifies the pinned Windows CPU Engine and model catalog, reports
inference availability, and dispatches typed inference requests. The production
Tauri handler was exercised through mock IPC transport with actual local Engine
processes: the calibrated canary answered `السلام عليكم` with `وعليكم السلام.`
on two deterministic runs. STEP0200 ran separately with its known repetition.
These checks establish execution and fixture replay, not general answer quality.

The WSL RAG CLI supplies PostgreSQL excerpts to native inference after source,
embedding, tokenizer, checkpoint, and runtime identity checks. Native tokenization
enforces a 240-token prompt plus 16 reserved generation tokens within context 256.
Two real baseline runs passed all seven plumbing/replay conditions. The new and
existing RAG unit suite passes 15 tests; the Studio web suite passes 25 tests.
Portable native Rust tests pass 7 tests, with the local-artifact integration test
run separately and passed. Missing artifacts fail closed on other machines.

RAG is a separate WSL CLI. Studio chat does not yet retrieve context automatically.
Training, evaluation, checkpoint, and probe UI operations remain unavailable.

## Behavioral gates remain failed

A bounded extraction test asked for the date in a retrieved receipt title. The
expected `2026-09-28` was absent from the question and verified in the actual used
excerpt and final prompt before inference. The expected answer plus EOS uses
6 native tokens, within the 16-token generation cap. Both models failed:

| Checkpoint | Actual output | Exact extraction |
| --- | --- | --- |
| STEP0200 | ` و` repeated 16 times | FAIL |
| Calibrated0040 | `بخير،اعدك؟` | FAIL |

Exit codes were 0. The missing-evidence and output-space explanations are excluded
for this specific prompt; the underlying learning failure remains unexplained.

## Numerical diagnosis, not a speculative Engine patch

CPU FP32 probes at Engine revision `1ac94f267b6bd12e450d6e1b2f4ad38abf24fb89`
compared formatted fixtures, unseen prompts, and the original raw prompts.
STEP0200 repeatedly selected token 276 despite first-token entropy near 8.37 nats
and top-token probability near 0.42%. This is a greedy loop over weakly conditioned
logits, not a saturated one-token probability distribution.

The calibrated checkpoint matched 4/4 formatted fixtures, 1/3 unseen expected
responses, and 0/4 raw expected responses. Overfitting is not established as the
sole cause. All weights were finite. KV and full-forward logits matched exactly
across all 256 positions of one consumed training sample (3,145,728 comparisons
per checkpoint). First-layer RMSNorm and RoPE checks against double-precision
references showed maximum absolute errors of 3.55e-7 and 7.07e-5 respectively.
Bounded 0.1x/10x epsilon and input-embedding interventions changed no tested
first-token argmax. These are limited measurements, not universal correctness proof.

`ROOT_CAUSE=NOT_ESTABLISHED`. No Engine, sampler, tokenizer, checkpoint, or training
change was justified or performed for this integration. No long training run started.

## Evidence and reproduction

Local evidence root: `D:\NIYAH-HUMAIN-GIFT\INTEGRATION-20260928`.

- `logits/reproduce.sh`, `logits/conclusion.json`, and the two numerical probe sources
  preserve commands, sample provenance, hashes, top-k values, entropy, and comparisons.
- `rag/NATIVE-RAG-RECEIPT.json` records live retrieval/inference and replay checks.
- `rag/NATIVE-RAG-EXTRACTIVE-RECEIPT.json` records pre-execution answer presence and
  the two exact-extraction failures; companion SHA256 manifests fence raw evidence.
- `studio/native-dispatch-receipt.json` records the actual pinned subprocess output
  behind the Tauri handler, including execution/quality separation.
- The repository README documents web/native gates; `tools/rag/NATIVE_ANSWER.md`
  documents the operator-pinned native RAG configuration and reproduction command.

The external evidence is retained locally rather than committed as model/data or
build artifacts. `ONLINE`, process `PASS`, and matching hashes do not certify
semantic correctness. General conversational and grounded-answer readiness remain
failed behavioral gates.
