# Verification Ledger — bootstrap workspace

Date: 2026-09-22

## Executed and passed in this build environment

```text
FORBIDDEN_REFERENCE_GATE=PASS
REMOTE_RUNTIME_BOUNDARY=PASS
CONTRACT_GATE=PASS
ENGINE_LOCK=UNPINNED
CLI_SNAPSHOT_COMMIT=b80050086d6c8476650cda0d4529c3fd0dd5b8c1
WORKER_TYPESCRIPT_CHECK=PASS
CORE_RUNTIME_SMOKE=PASS
GIT_DIFF_CHECK=PASS
```

The core runtime smoke directly exercised:

- SHA-256 known-answer value for `abc`;
- TXT record parsing;
- exact duplicate grouping;
- deterministic split reproducibility;
- exact cross-split leakage detection;
- deterministic near-duplicate detection.

## Not verified in this build environment

`npm install` could not complete within the available container network timeout. Therefore these repository gates are **not claimed as reproduced here**:

```text
npm run typecheck
npm test
npm run build
```

Google AI Studio or a normal connected local development machine must execute those gates after dependency installation.

## Native status

Tauri/Niyah.Engine runtime integration is intentionally unpinned and unverified.

`contracts/engine.lock.json` remains `UNPINNED`.

No native inference, training, evaluation, CUDA, checkpoint, or probe PASS is claimed by this repository bootstrap.
