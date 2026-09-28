"""Opt-in real PostgreSQL/embedding regression. Uses and removes its own schema."""
import json
from pathlib import Path
import tempfile
import uuid
from unittest.mock import patch

import psycopg
from psycopg import sql
from pgvector.psycopg import register_vector
import rag


def main():
    model, identity = rag.load_model(rag.DEFAULT_MODEL)
    schema = 'rag_test_' + uuid.uuid4().hex
    dsn = rag.os.environ.get('NIYAH_RAG_DSN', 'dbname=niyah_rag')
    checks = []

    def test_connect():
        conn = psycopg.connect(dsn, options=f'-c search_path={schema},public')
        register_vector(conn)
        return conn

    def must_fail(action, message):
        try:
            action()
        except ValueError as error:
            assert message in str(error), str(error)
        else:
            raise AssertionError(f'Expected {message}')
        checks.append(message)

    with psycopg.connect(dsn, autocommit=True) as admin:
        admin.execute(sql.SQL('CREATE SCHEMA {}').format(sql.Identifier(schema)))
        try:
            with test_connect() as conn:
                conn.execute(Path(__file__).with_name('schema.sql').read_text())
            with tempfile.TemporaryDirectory(prefix='niyah-rag-fixture-') as directory:
                root = Path(directory)
                one = root / 'voice.txt'; one.write_text('TEST FIXTURE: The Arabic voice reference is twelve seconds long. مدة المرجع الصوتي اثنتا عشرة ثانية.', encoding='utf-8')
                two = root / 'engine.txt'; two.write_text('TEST FIXTURE: CPU FP32 is the Niyah reference backend. The model uses a tokenizer.', encoding='utf-8')
                manifest = root / 'manifest.json'

                def write_manifest():
                    manifest.write_text(json.dumps({'schema_version':1,'purpose':'isolated regression fixtures, not production data','sources':[
                        {'path':str(p),'sha256':rag.digest(p.read_bytes()),'retrieval_allowed':True,'provenance':'authored test fixture'} for p in [one,two]]}))

                write_manifest()
                with patch.object(rag, 'connect', test_connect), patch.object(rag, 'load_model', return_value=(model,identity)):
                    first = rag.ingest(manifest,rag.DEFAULT_MODEL)
                    assert first['written_chunks'] == 2
                    again = rag.ingest(manifest,rag.DEFAULT_MODEL)
                    assert again['skipped_sources'] == 2 and again['written_chunks'] == 0
                    checks.append('IDEMPOTENT_INGEST')
                    answer = rag.query('ما مدة المرجع الصوتي؟',rag.DEFAULT_MODEL,1)
                    assert answer['hits'][0]['source_path'] == str(one)
                    assert answer == rag.query('ما مدة المرجع الصوتي؟',rag.DEFAULT_MODEL,1)
                    checks.extend(['ARABIC_RETRIEVAL','DETERMINISTIC_REPEAT'])
                    one.write_text('TEST FIXTURE changed voice source', encoding='utf-8')
                    must_fail(lambda:rag.ingest(manifest,rag.DEFAULT_MODEL),'SOURCE_HASH_MISMATCH')
                    must_fail(lambda:rag.query('voice reference',rag.DEFAULT_MODEL,2),'STALE_SOURCE')
                    two.write_text('TEST FIXTURE changed engine source', encoding='utf-8')
                    write_manifest()
                    real_encode = model.encode
                    calls = 0

                    def failing_encode(*args, **kwargs):
                        nonlocal calls
                        calls += 1
                        if calls == 2:
                            raise ValueError('CONTROLLED_EMBEDDING_FAILURE')
                        return real_encode(*args, **kwargs)

                    with patch.object(model,'encode',side_effect=failing_encode):
                        must_fail(lambda:rag.ingest(manifest,rag.DEFAULT_MODEL),'CONTROLLED_EMBEDDING_FAILURE')
                    with test_connect() as conn:
                        rows=conn.execute('SELECT content FROM rag_chunks ORDER BY id').fetchall()
                        assert len(rows)==2 and all('changed' not in row[0] for row in rows)
                    checks.append('TRANSACTION_ROLLBACK')
                    rag.ingest(manifest,rag.DEFAULT_MODEL)
                    with test_connect() as conn:
                        conn.execute("UPDATE rag_chunks SET content='forged fixture'")
                    must_fail(lambda:rag.query('voice',rag.DEFAULT_MODEL,2),'CORRUPT_RETRIEVAL_CHUNK')
                    rag.ingest(manifest,rag.DEFAULT_MODEL)
                    with test_connect() as conn:
                        conn.execute("UPDATE rag_config SET value='wrong-model' WHERE key='embedding_model'")
                    must_fail(lambda:rag.query('voice',rag.DEFAULT_MODEL,1),'EMBEDDING_MODEL_IDENTITY_MISMATCH')
                    with test_connect() as conn:
                        conn.execute("UPDATE rag_config SET value=%s WHERE key='embedding_model'",(identity,))
                        conn.execute('DELETE FROM rag_chunks')
                    assert rag.query('voice',rag.DEFAULT_MODEL,1)['status']=='NO_RAG_CONTEXT'
                    checks.append('EMPTY_DATABASE_FAILS_CLOSED')
        finally:
            admin.execute(sql.SQL('DROP SCHEMA {} CASCADE').format(sql.Identifier(schema)))
    print(json.dumps({'status':'RAG_INTEGRATION_PASS','checks':checks,'embedding_model':identity},indent=2))


if __name__=='__main__':main()
