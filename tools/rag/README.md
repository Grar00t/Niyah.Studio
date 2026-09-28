# Local PostgreSQL RAG

This external control-plane tool retrieves source excerpts from PostgreSQL using
multilingual E5 embeddings and full-text reciprocal-rank fusion. It does not run
inside Niyah.Engine, claim native model quality, or authorize teacher output.
Returned excerpts carry source hashes and provenance. They are evidence to inspect,
not automatically certified facts or instruction authority.

## Verified local installation

The 2026-09-28 repair used PostgreSQL 18.6 in WSL Ubuntu, database `niyah_rag`,
the `vector` extension, Python 3.14, and CPU-only PyTorch. The previous scripts
had neither their expected database schema nor Python dependencies. Existing
databases and scripts were retained. No PostgreSQL service is required on Windows;
`Invoke-NiyahRag.ps1` invokes the same WSL installation with argument arrays.

```bash
python3 -m venv /home/a/niyah-rag/.venv
/home/a/niyah-rag/.venv/bin/pip install -r tools/rag/requirements.lock.txt
# Run once as the local database administrator, against the selected database:
sudo -u postgres psql -d niyah_rag -c 'CREATE EXTENSION IF NOT EXISTS vector;'
/home/a/niyah-rag/.venv/bin/python tools/rag/rag.py init
```

Use `NIYAH_RAG_DSN` to select another existing database (default
`dbname=niyah_rag`, peer authentication). Never commit credentials. The model must
already exist locally. Default model: `intfloat/multilingual-e5-small`, revision
`614241f622f53c4eeff9890bdc4f31cfecc418b3` in the Linux user's Hugging Face cache.
`--model-path` overrides the directory. Runtime downloads and GPU use are disabled.
The database binds the exact weight/configuration/tokenizer bundle identity.

## Source approval and use

Supply a JSON manifest with `schema_version: 1`, a nonempty `purpose`, and `sources`.
Each source needs an absolute Linux `path`, exact file `sha256`,
`retrieval_allowed: true`, and `provenance` (for example repository/commit/path).
Only explicitly listed UTF-8 files up to 8 MiB are ingested. Approval is an input
from the operator; a generated model answer cannot grant it. Unlisted sources
already indexed are retained; ingest is not a destructive corpus synchronization.

```bash
python tools/rag/rag.py ingest --manifest /absolute/source-manifest.json
python tools/rag/rag.py query 'ما حالة التوليد؟' --limit 3
```

```powershell
./tools/rag/Invoke-NiyahRag.ps1 -Manifest D:\path\source-manifest.json
./tools/rag/Invoke-NiyahRag.ps1 -Query 'ما حالة التوليد؟' -Limit 3
```

Ingest is transactional and idempotent. Retrieval rejects changed/missing source
files, changed model bundles, or chunk content inconsistent with the source.
No-context returns exit 3. Errors propagate with nonzero exit. Similarity always
returns nearest candidates when sources exist: it is not an answerability test.
There is no free-form answer generator in this path; `generation_status` explicitly
reports `NOT_REQUESTED`. Qwen remains a separately audited candidate model.

## Regression

```bash
cd tools/rag
python -m unittest -v test_rag
python test_integration.py
```

The integration gate requires the actual local model and database. It creates a
uniquely named test schema, uses visibly labeled synthetic fixtures, and removes
only that schema on exit. It checks Arabic retrieval, deterministic replay,
idempotence, source mutation, database chunk tampering, model mismatch, no context,
and transaction rollback after a controlled embedding failure.
