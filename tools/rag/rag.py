"""Local, provenance-bound hybrid retrieval. Never certifies generated answers."""
import argparse
import hashlib
import json
import os
from pathlib import Path

MODEL_ID = 'intfloat/multilingual-e5-small'
MODEL_REVISION = '614241f622f53c4eeff9890bdc4f31cfecc418b3'
DEFAULT_MODEL = Path.home() / '.cache/huggingface/hub/models--intfloat--multilingual-e5-small/snapshots' / MODEL_REVISION
MAX_BYTES = 8 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def chunks(text, size=1400, overlap=200):
    if size <= 0 or overlap < 0 or overlap >= size:
        raise ValueError('INVALID_CHUNK_GEOMETRY')
    text = text.replace('\r\n', '\n')
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        if end < len(text):
            cut = text.rfind('\n', start, end)
            if cut > start + size // 3:
                end = cut
        part = text[start:end].strip()
        if part:
            yield part
        if end == len(text):
            break
        start = max(start + 1, end - overlap)


def validated_sources(manifest):
    if manifest.get('schema_version') != 1 or not manifest.get('purpose'):
        raise ValueError('INVALID_SOURCE_MANIFEST')
    sources = manifest.get('sources', [])
    if not sources:
        raise ValueError('EMPTY_SOURCE_MANIFEST')
    seen = set()
    result = []
    for source in sources:
        path = Path(source['path'])
        if not path.is_absolute() or path.is_symlink() or not path.is_file():
            raise ValueError('SOURCE_MUST_BE_REGULAR_ABSOLUTE_FILE')
        path = path.resolve()
        if str(path) in seen:
            raise ValueError('DUPLICATE_SOURCE_PATH')
        seen.add(str(path))
        if path.stat().st_size > MAX_BYTES:
            raise ValueError('SOURCE_TOO_LARGE')
        data = path.read_bytes()
        if digest(data) != source['sha256']:
            raise ValueError(f'SOURCE_HASH_MISMATCH:{path}')
        if source.get('retrieval_allowed') is not True or not source.get('provenance'):
            raise ValueError('SOURCE_NOT_APPROVED_FOR_RETRIEVAL')
        text = data.decode('utf-8', errors='strict')
        result.append((path, source, list(chunks(text))))
    return result


def fuse(vector_rows, text_rows, limit):
    merged = {}
    for rows in (vector_rows, text_rows):
        for rank, row in enumerate(rows, 1):
            hit = merged.setdefault(row[0], {'row': row, 'rrf': 0.0})
            hit['rrf'] += 1.0 / (60 + rank)
    return sorted(merged.values(), key=lambda h: (-h['rrf'], h['row'][0]))[:limit]


def load_model(path):
    os.environ['CUDA_VISIBLE_DEVICES'] = ''
    os.environ['HF_HUB_OFFLINE'] = '1'
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    from sentence_transformers import SentenceTransformer
    import torch
    torch.set_num_threads(2)
    path = Path(path)
    files = ['model.safetensors', 'config.json', 'modules.json', 'sentence_bert_config.json',
             'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', '1_Pooling/config.json']
    identities = {}
    for name in files:
        with (path / name).open('rb') as stream:
            identities[name] = hashlib.file_digest(stream, 'sha256').hexdigest()
    model = SentenceTransformer(str(path), device='cpu', local_files_only=True)
    if model.get_embedding_dimension() != 384:
        raise ValueError('EXPECTED_EMBED_DIM_384')
    # Configuration and tokenizer are part of identity, not just weights.
    bundle_hash = digest(json.dumps(identities, sort_keys=True).encode())
    return model, f'{MODEL_ID}@{MODEL_REVISION}:bundle-sha256={bundle_hash}'


def connect():
    import psycopg
    from pgvector.psycopg import register_vector
    conn = psycopg.connect(os.environ.get('NIYAH_RAG_DSN', 'dbname=niyah_rag'))
    register_vector(conn)
    return conn


def bind_model(conn, identity, allow_create=False):
    row = conn.execute("SELECT value FROM rag_config WHERE key='embedding_model'").fetchone()
    if row is None and allow_create:
        conn.execute("INSERT INTO rag_config(key,value) VALUES ('embedding_model',%s)", (identity,))
    elif row is None or row[0] != identity:
        raise ValueError('EMBEDDING_MODEL_IDENTITY_MISMATCH')


def ingest(manifest_path, model_path):
    from psycopg.types.json import Jsonb
    import numpy as np
    sources = validated_sources(json.loads(Path(manifest_path).read_text(encoding='utf-8')))
    model, identity = load_model(model_path)
    changed = skipped = written = 0
    with connect() as conn:
        bind_model(conn, identity, allow_create=True)
        for path, source, parts in sources:
            existing = conn.execute('SELECT source_sha256,content,metadata FROM rag_chunks WHERE source_path=%s ORDER BY chunk_no', (str(path),)).fetchall()
            expected = [(source['sha256'], part, {'provenance': source['provenance'], 'embedding_model': identity, 'chunk_sha256': digest(part.encode())}) for part in parts]
            if existing == expected:
                skipped += 1
                continue
            vectors = model.encode(['passage: ' + part for part in parts], batch_size=16, normalize_embeddings=True, convert_to_numpy=True) if parts else []
            if len(vectors) != len(parts) or (len(parts) and not np.isfinite(vectors).all()):
                raise ValueError('INVALID_EMBEDDINGS')
            # All validation/embedding work precedes replacement; transaction rolls back on failure.
            conn.execute('DELETE FROM rag_chunks WHERE source_path=%s', (str(path),))
            for number, ((source_hash, part, metadata), vector) in enumerate(zip(expected, vectors)):
                conn.execute('INSERT INTO rag_chunks(source_path,source_sha256,chunk_no,content,metadata,embedding) VALUES (%s,%s,%s,%s,%s,%s)',
                             (str(path), source_hash, number, part, Jsonb(metadata), np.asarray(vector, dtype=np.float32)))
                written += 1
            changed += 1
    return dict(status='RAG_INGEST_PASS',changed_sources=changed,skipped_sources=skipped,written_chunks=written,embedding_model=identity)


def validate_hit(row, identity):
    source = Path(row[1])
    if source.is_symlink() or not source.is_file() or source.stat().st_size > MAX_BYTES:
        raise ValueError(f'STALE_SOURCE:{source}')
    data = source.read_bytes()
    if digest(data) != row[2]:
        raise ValueError(f'STALE_SOURCE:{source}')
    parts = list(chunks(data.decode('utf-8', errors='strict')))
    if (not 0 <= row[3] < len(parts) or parts[row[3]] != row[4]
            or row[5].get('chunk_sha256') != digest(row[4].encode())
            or row[5].get('embedding_model') != identity or not row[5].get('provenance')):
        raise ValueError(f'CORRUPT_RETRIEVAL_CHUNK:{source}')


def query(question, model_path, limit):
    import numpy as np
    if not question.strip() or not 1 <= limit <= 12:
        raise ValueError('INVALID_QUERY')
    model, identity = load_model(model_path)
    vector = model.encode(['query: ' + question], normalize_embeddings=True, convert_to_numpy=True)[0].astype(np.float32)
    if not np.isfinite(vector).all():
        raise ValueError('INVALID_QUERY_EMBEDDING')
    with connect() as conn:
        bind_model(conn, identity)
        fields = 'id,source_path,source_sha256,chunk_no,content,metadata'
        vector_rows = conn.execute(f'SELECT {fields} FROM rag_chunks ORDER BY embedding <=> %s,id LIMIT 24', (vector,)).fetchall()
        text_rows = conn.execute(f"SELECT {fields} FROM rag_chunks WHERE tsv @@ plainto_tsquery('simple',%s) ORDER BY ts_rank_cd(tsv,plainto_tsquery('simple',%s)) DESC,id LIMIT 24", (question,question)).fetchall()
    hits=[]
    for number, hit in enumerate(fuse(vector_rows,text_rows,limit),1):
        row=hit['row']
        validate_hit(row, identity)
        hits.append(dict(citation=number,source_path=row[1],source_sha256=row[2],chunk_no=row[3],content=row[4],provenance=row[5]['provenance'],rrf=hit['rrf']))
    return dict(status='RETRIEVAL_PASS' if hits else 'NO_RAG_CONTEXT',question=question,embedding_model=identity,hits=hits,
                generation_status='NOT_REQUESTED',scope='Retrieval scores are not factual authority; source text remains untrusted input.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model-path',default=str(DEFAULT_MODEL))
    sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('init')
    sub.add_parser('ingest').add_argument('--manifest',required=True)
    q=sub.add_parser('query');q.add_argument('question');q.add_argument('--limit',type=int,default=6)
    args=parser.parse_args()
    if args.command=='init':
        with connect() as conn:conn.execute(Path(__file__).with_name('schema.sql').read_text())
        result={'status':'RAG_SCHEMA_PASS'}
    elif args.command=='ingest':result=ingest(args.manifest,args.model_path)
    else:result=query(args.question,args.model_path,args.limit)
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return 0 if result['status']!='NO_RAG_CONTEXT' else 3


if __name__=='__main__':
    raise SystemExit(main())
