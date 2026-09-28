# Native Niyah inference over retrieved excerpts

`native_answer.py` connects the existing, read-only `rag.query` result to the real
Niyah.Engine CLI. It uses CPU only, temperature 0 and seed 42. It does not train,
change retrieval ranking, switch to Qwen, or modify the engine or its sampler.

The browser cannot execute this path. Run it in the configured Linux/WSL native
environment. It requires the existing local E5 model/database and an
operator-authored artifact configuration; no download or dependency install occurs.

```bash
/home/a/niyah-rag/.venv/bin/python tools/rag/native_answer.py \
  --config /absolute/native-artifacts.json \
  --question 'What is the generation health of V10 STEP0200 and the SFT canary?' \
  --limit 3 --max-new-tokens 16
```

The configuration shape is:

```json
{
  "schema_version": 1,
  "backend": "cpu",
  "context_length": 256,
  "embedding_model": "the exact identity already bound by rag_config",
  "binary": {"path": "/absolute/niyah", "sha256": "64 lowercase hex characters"},
  "checkpoint": {"path": "/absolute/model.ckpt", "sha256": "64 lowercase hex characters"},
  "tokenizer": {"path": "/absolute/tok.bin", "sha256": "64 lowercase hex characters"}
}
```

The identity in `embedding_model` must include the existing `:bundle-sha256=`
component. The example values above are placeholders, not accepted pins. Obtain
pins from the approved local artifacts; a generated answer must never authorize
new identities. The checkpoint must be tokenizer-bound V2 with actual context 256.
`contracts/engine.lock.json` is not changed or implicitly populated by this tool.

Before model execution, the tool revalidates the retrieved source bytes, chunk
geometry and provenance using the existing source gate. It pins the runtime,
checkpoint, tokenizer and embedding bundle. It checks source and artifact identities
again immediately before inference and before accepting the result. Changed,
missing or symlinked artifacts, changed sources, forged excerpts, wrong embeddings,
empty context and unsupported execution refuse the request. Subprocesses receive
argument arrays with `shell=False`; source text never becomes a command.

## Exact context budget

The entire composed prompt is passed to the pinned native `niyah shard` command in
a private temporary directory. Its CRC-checked V1 token stream is read as data;
Python does not implement or approximate the tokenizer. The stream stores
`BOS + encode(prompt) + EOS`; the count used by `niyah run` removes only that final
EOS. Thus the invariant is:

```text
actual_prompt_tokens_including_BOS + max_new_tokens <= actual_context_length(256)
```

Ranked excerpts are retained as exact prefixes of their validated chunks, with
source/chunk hashes, citation, provenance and character offsets recorded. If a full
excerpt does not fit, a bounded prefix search uses actual native counts of the
complete candidate prompt. The final prompt is explicitly checked; this does not
assume monotonic BPE lengths or estimate tokens from characters. Selection need not
maximize context or relevance. A ranked hit may contain headers or irrelevant text;
retrieval similarity is not an answerability test. Later hits that cannot fit are
recorded as omitted. The question/instructions are never silently truncated.

## Result contract

One JSON object is written to stdout. `schema_version=1`, `kind=NIYAH_NATIVE_RAG`.

| Field | Meaning |
| --- | --- |
| `status` | `NATIVE_RAG_EXECUTED`, `NATIVE_EXECUTION_FAILED`, or `REFUSED` |
| `generation_status` | `NATIVE_EXECUTION_OK`, `NATIVE_EXECUTION_FAILED`, `NOT_EXECUTED`, or `REJECTED_AFTER_EXECUTION` |
| `identities` | Actual file paths, sizes and SHA256 for the native binary/checkpoint/tokenizer |
| `retrieval` | Original source-gated retrieval hits and embedding identity |
| `prompt` | Exact text/hash, native token IDs including BOS, token reservation, exact excerpts and omitted citations |
| `tokenization_trace` | Native counting argv, prompt hashes, stdout/stderr and return codes |
| `execution` | Native inference argv, CPU backend, stdout/stderr, return code, timeout/UTF-8 flags and exact base64 streams |
| `behavioral_quality` | `FAIL` for mechanically detected empty/repetitive output, otherwise `NOT_ESTABLISHED`; grounding and factual correctness are not certified |
| `error` | Refusal code/detail; no usable output is authorized on refusal |

Exit 0 means native execution returned 0, including when behavioral quality is
`FAIL`. It is never an answer-quality PASS. Exit 2 means refusal or execution
failure. Consumers must inspect `status`, `generation_status` and
`behavioral_quality` separately and show exact unverified model output as such.
A partial process result may be retained for evidence after refusal; it must not be
presented as an accepted answer. Invalid UTF-8 is rejected; exact bytes remain in
base64. Native model generation can remain poor even when retrieval works.

## Verification

```bash
cd tools/rag
python -m unittest -v test_native_answer test_rag
/home/a/niyah-rag/.venv/bin/python test_native_integration.py \
  --config /absolute/native-artifacts.json --output /new/evidence.json
```

Unit tests visibly use fabricated fixtures for boundary checks only. The opt-in
integration gate performs two actual read-only retrieval/native CPU runs, records
source hashes, checks context reservation and deterministic prompt/output replay,
and preserves all real process evidence. It never declares answer quality PASS.
The evidence output must not already exist.
