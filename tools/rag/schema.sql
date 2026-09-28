-- External application storage; no dependency is added to Niyah.Engine.
CREATE TABLE IF NOT EXISTS rag_config (
    key text PRIMARY KEY,
    value text NOT NULL
);
CREATE TABLE IF NOT EXISTS rag_chunks (
    id bigserial PRIMARY KEY,
    source_path text NOT NULL,
    source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
    chunk_no integer NOT NULL CHECK (chunk_no >= 0),
    content text NOT NULL CHECK (length(content) > 0),
    metadata jsonb NOT NULL,
    embedding vector(384) NOT NULL,
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
    UNIQUE (source_path, chunk_no)
);
CREATE INDEX IF NOT EXISTS rag_chunks_tsv_idx ON rag_chunks USING gin(tsv);
