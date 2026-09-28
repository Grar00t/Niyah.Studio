# Local maintenance evidence — 2026-09-28

## Executed repairs

- PostgreSQL `niyah_rag` originally contained no `rag_chunks` table or vector
  extension. The existing WSL Python installations lacked the retrieval packages.
  Installed an isolated CPU environment, initialized the missing extension/schema,
  and ingested seven explicitly approved Engine documents into 49 chunks.
- The RAG CLI now binds source bytes, chunk content, provenance, and the embedding
  weight/config/tokenizer bundle. Its PowerShell entry point uses the same WSL
  database. Existing scripts and other databases were preserved.
- Updated the source CLI snapshot to Engine `1ac94f267b6bd12e450d6e1b2f4ad38abf24fb89`.
  Native UI functionality remains explicitly unimplemented and unpinned.
- Added a pinned external pose loader for the missing constant adjacency buffer.
  A concurrent edit to the downloaded definition made this buffer nonpersistent;
  that edit was preserved and verified. No checkpoint weights were rewritten.

## Executed gates

- Studio web verification: 18 tests, typecheck, build, dependency/network/contract
  checks passed.
- RAG: five unit tests and ten live PostgreSQL/CPU-embedding conditions passed,
  including Arabic retrieval, exact replay, idempotence, rollback, mutation,
  tampering, identity mismatch, and no-context behavior. Test schemas were removed.
- Windows-to-WSL query returned real Arabic-query retrieval results. Re-ingest
  skipped all seven unchanged files and wrote zero duplicate chunks.
- Pose: three loader regression tests; pinned CPU model load and deterministic finite
  `[2,34]` output on synthetic CSI passed. Benchmark accuracy was not reproduced.
- Engine: existing Linux CPU 39/39, CUDA 53/53, sanitizer 39/39 receipts remain at
  the unchanged integration revision. Its fresh Windows build passed 39/39.
  Engine PR #34 passed all nine GitHub checks and merged without rewriting history.

## Asset preservation and cleanup

Refreshed the existing project registry and explicit voice/vision/model roots:
2,629 records, including 279 paths already missing from the prior registry. Missing
entries are not attributed to this cleanup. The four MMFi archives remain intact;
selected ground-truth/CSI/RGB entries passed ZIP CRC reading, not a full archive test.

Deleted 12 exact duplicates only after matching retained originals by SHA-256:
839,025,101 bytes. Also purged the identified Windows pip download cache (570 files,
approximately 53.5 MB). Checkpoints, datasets, model caches, Git history, unique
source, and the unrelated dirty RuView checkout were preserved.

## Limits

Original Niyah STEP0100/STEP0200 generation still degenerates. Four memorized SFT
fixtures pass, while held-out/general conversational quality fails. Qwen is a
locally usable candidate, not an authoritative judge. Retrieval provides cited
source excerpts; no free-form answer generator or Studio native UI was connected.
The pose sidecar's weight hash conflicts with its recorded LFS identity; the cause
of that sidecar inconsistency and the published accuracy are not established.

Machine-specific logs, hashes, source manifest, deletion ledger, and the final
receipt live under `D:\NIYAH-HUMAIN-GIFT\MAINTENANCE-20260928`. Those local artifacts,
model files, and datasets are not committed to this repository.
