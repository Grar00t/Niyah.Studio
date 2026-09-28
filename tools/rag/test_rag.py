import hashlib
import tempfile
import unittest
from pathlib import Path
import rag


class RetrievalContracts(unittest.TestCase):
    def test_chunks_bound_overlap_and_normalize(self):
        text='مرحبا\r\n' * 500
        parts=list(rag.chunks(text))
        self.assertGreater(len(parts),1)
        self.assertTrue(all(len(p)<=1400 and '\r' not in p for p in parts))
        self.assertEqual(list(rag.chunks('  ')),[])
        with self.assertRaises(ValueError):list(rag.chunks('x',10,10))

    def test_source_gate_rejects_mutation_and_missing_provenance(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'source.md';path.write_text('وثيقة محلية',encoding='utf-8')
            source={'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'retrieval_allowed':True,'provenance':'authored fixture'}
            manifest={'schema_version':1,'purpose':'unit test','sources':[source]}
            self.assertEqual(len(rag.validated_sources(manifest)),1)
            source['retrieval_allowed']=False
            with self.assertRaisesRegex(ValueError,'NOT_APPROVED'):rag.validated_sources(manifest)
            source['retrieval_allowed']=True;path.write_text('changed')
            with self.assertRaisesRegex(ValueError,'HASH_MISMATCH'):rag.validated_sources(manifest)

    def test_duplicate_source_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'source.md';path.write_text('fixture')
            source={'path':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'retrieval_allowed':True,'provenance':'fixture'}
            with self.assertRaisesRegex(ValueError,'DUPLICATE'):
                rag.validated_sources({'schema_version':1,'purpose':'test','sources':[source,source]})

    def test_rrf_has_deterministic_tie_break_and_combines_ranks(self):
        self.assertEqual([h['row'][0] for h in rag.fuse([(2,),(1,)],[(1,),(2,)],2)],[1,2])
        self.assertEqual(rag.fuse([],[],6),[])

    def test_returned_evidence_must_match_source_content_and_model(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'source.md';path.write_text('verified fixture')
            row=[1,str(path),rag.digest(path.read_bytes()),0,'verified fixture',
                 {'chunk_sha256':rag.digest(b'verified fixture'),'embedding_model':'test','provenance':'fixture'}]
            rag.validate_hit(row,'test')
            row[4]='forged answer'
            with self.assertRaisesRegex(ValueError,'CORRUPT'):rag.validate_hit(row,'test')
            row[4]='verified fixture'
            with self.assertRaisesRegex(ValueError,'CORRUPT'):rag.validate_hit(row,'other-model')
            path.write_text('changed')
            with self.assertRaisesRegex(ValueError,'STALE'):rag.validate_hit(row,'test')


if __name__=='__main__':unittest.main()
