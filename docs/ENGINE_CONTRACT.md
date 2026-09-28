# Engine Contract

`Grar00t/Niyah.Engine` is authoritative. Studio adapter method names are application concepts, not proof that a native command exists.

Before wiring any adapter method to native execution:

1. pin the exact engine revision;
2. inspect current CLI/API contracts;
3. map only existing options;
4. reject unknown options;
5. pass structured argv, never a concatenated shell command;
6. capture stdout, stderr, exit code, timestamps, and artifact hashes;
7. verify postconditions before emitting PASS.

If no mapped capability exists, return `UNSUPPORTED`.

## Implemented mapping

The local Windows CPU integration maps `engine_inference` to `niyah run` at
the revision and binary hash in `contracts/engine.lock.json`. Requests contain
only prompt, catalog model ID, token cap, temperature, seed, and CPU backend.
The backend rejects unknown fields, obtains paths and trained prefix/suffix
from its embedded model catalog, and checks all artifact hashes before and
after execution. Only verified catalog entries appear in `engine_models`.

`engine_status=ONLINE` verifies the runtime. `capabilities.inference=true`
additionally requires a verified local model. Every other native capability
remains false. The browser adapter remains offline.

`NativeResult.status=PASS` and `executionStatus=SUCCEEDED` describe process
execution only; `qualityStatus=NOT_EVALUATED` is explicit even for exit code 0.
The UI exports the exact request and captured process evidence. Source-grounded
answer validation is a separate behavioral gate, not an inference capability flag.
