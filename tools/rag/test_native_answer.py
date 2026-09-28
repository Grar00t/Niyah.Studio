"""Boundary regressions; fake token counts here are labeled fixtures, never live evidence."""
import copy
import hashlib
import json
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
import zlib

import native_answer as native
import rag


class NativeContracts(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix='native-rag-test-fixture-')
        self.root = Path(self.temporary.name)
        self.addCleanup(self.temporary.cleanup)
        checkpoint = bytearray(72)
        checkpoint[:8] = b'NIYAHCKP'
        struct.pack_into('<I', checkpoint, 8, 2)
        struct.pack_into('<I', checkpoint, 28, 256)
        self.config = {'schema_version': 1, 'backend': 'cpu', 'context_length': 256,
                       'embedding_model': 'test-fixture:bundle-sha256=abcd'}
        for kind, content in [('binary', b'TEST FIXTURE never executed'),
                              ('tokenizer', b'TEST FIXTURE'), ('checkpoint', checkpoint)]:
            path = self.root / kind
            path.write_bytes(content)
            path.chmod(0o700)
            self.config[kind] = {'path': str(path), 'sha256': rag.digest(content)}
        source = self.root / 'source.txt'
        source.write_text('TEST FIXTURE: approved local source. Arabic: مرحبا. ' * 5, encoding='utf-8')
        self.hit = {'citation': 1, 'source_path': str(source), 'source_sha256': rag.digest(source.read_bytes()),
                    'chunk_no': 0, 'content': source.read_text().strip(), 'provenance': 'authored unit fixture'}
        self.retrieval = {'status': 'RETRIEVAL_PASS', 'embedding_model': self.config['embedding_model'],
                          'hits': [self.hit]}

    def test_pins_and_actual_checkpoint_context_fail_closed(self):
        native.verify_artifacts(self.config)
        for kind in ('binary', 'checkpoint', 'tokenizer'):
            changed = copy.deepcopy(self.config)
            changed[kind]['sha256'] = '0' * 64
            with self.assertRaisesRegex(native.Refused, 'ARTIFACT_IDENTITY_MISMATCH'):
                native.verify_artifacts(changed)
        changed = copy.deepcopy(self.config)
        changed['context_length'] = 128
        with self.assertRaisesRegex(native.Refused, 'CONTEXT_CONFIG_MISMATCH'):
            native.verify_artifacts(changed)

    def test_empty_changed_model_changed_source_and_forged_chunk_refused(self):
        native.verify_retrieval(self.retrieval, self.config['embedding_model'])
        bad = copy.deepcopy(self.retrieval)
        bad['hits'] = []
        with self.assertRaisesRegex(native.Refused, 'NO_RAG_CONTEXT'):
            native.verify_retrieval(bad, self.config['embedding_model'])
        with self.assertRaisesRegex(native.Refused, 'EMBEDDING_MODEL_IDENTITY_MISMATCH'):
            native.verify_retrieval(self.retrieval, 'changed model')
        bad = copy.deepcopy(self.retrieval)
        bad['hits'][0]['content'] = 'forged'
        with self.assertRaisesRegex(ValueError, 'CORRUPT_RETRIEVAL_CHUNK'):
            native.verify_retrieval(bad, self.config['embedding_model'])
        Path(self.hit['source_path']).write_text('changed')
        with self.assertRaisesRegex(ValueError, 'STALE_SOURCE'):
            native.verify_retrieval(self.retrieval, self.config['embedding_model'])

    def test_budget_checks_full_prompt_and_keeps_exact_source_prefix(self):
        # Deliberately non-character-equivalent fake tokens demonstrate count-driven decisions.
        def count(text):
            return list(range(1 + len(text.encode('utf8')) // 3)), 'TEST_FIXTURE_ID'
        result = native.bounded_prompt('سؤال؟', [self.hit], count, 24, 140)
        self.assertLessEqual(result['tokens_including_bos'] + 24, 140)
        self.assertEqual(result['excerpts'][0]['excerpt'], self.hit['content'][:result['excerpts'][0]['excerpt_end']])
        self.assertTrue(result['excerpts'][0]['truncated'])
        self.assertEqual(result['token_ids_including_bos'], count(result['text'])[0])
        with self.assertRaisesRegex(native.Refused, 'CONTEXT_OVERFLOW'):
            native.bounded_prompt('question', [self.hit], lambda text: ([1] * 250, 'fixture'), 24, 256)
        with self.assertRaisesRegex(native.Refused, 'NO_RAG_CONTEXT'):
            native.bounded_prompt('question', [], lambda text: ([1], 'fixture'), 24, 256)

    def test_native_shard_count_removes_only_eos_and_verifies_crc(self):
        def shard_process(argv, timeout=90):
            path = Path(argv[argv.index('--shard-out') + 1])
            header = b'NIYAHSRD' + struct.pack('<IIQQQ', 1, 0, 256, 5, 1) + bytes(32)
            blob = header + struct.pack('<5I', 256, 11, 22, 33, 257)
            path.write_bytes(blob + struct.pack('<II', 1, zlib.crc32(blob)))
            return {'argv': argv, 'backend': 'cpu', 'stdout': 'TEST FIXTURE', 'stderr': '', 'return_code': 0}
        trace = []
        with patch.object(native, 'run_native', side_effect=shard_process):
            ids, identity = native.native_prompt_tokens(self.config, 'مرحبا', self.root, trace)
        self.assertEqual(ids, [256, 11, 22, 33])
        self.assertEqual(identity, '00' * 32)
        self.assertEqual(trace[0]['purpose'], 'native_prompt_tokenization')

    def test_cpu_only_argv_and_exit_zero_never_quality_pass(self):
        def tokenize(config, text, directory, trace):
            return [256, 10, 20], 'TEST_FIXTURE'
        process = {'argv': [], 'backend': 'cpu', 'stdout': ' و' * 20 + '\n', 'stderr': '', 'return_code': 0}
        with patch.object(native.sys, 'platform', 'linux'), patch.object(rag, 'query', return_value=self.retrieval), \
                patch.object(native, 'native_prompt_tokens', side_effect=tokenize), \
                patch.object(native, 'run_native', return_value=process) as run:
            result = native.answer('سؤال؟', self.config)
        self.assertEqual(result['status'], 'NATIVE_RAG_EXECUTED')
        self.assertEqual(result['behavioral_quality']['status'], 'FAIL')
        argv = run.call_args.args[0]
        self.assertEqual(argv[argv.index('--backend') + 1], 'cpu')
        self.assertEqual(argv[argv.index('--prompt') + 1], result['prompt']['text'])
        self.assertEqual(native.behavioral_quality('نعم')['status'], 'NOT_ESTABLISHED')
        self.assertEqual(native.behavioral_quality('')['status'], 'FAIL')

    def test_source_changed_during_generation_rejects_output(self):
        def execute(argv, timeout=90):
            Path(self.hit['source_path']).write_text('changed during generation')
            return {'argv': argv, 'backend': 'cpu', 'stdout': 'untrusted output', 'stderr': '', 'return_code': 0}
        with patch.object(native.sys, 'platform', 'linux'), patch.object(rag, 'query', return_value=self.retrieval), \
                patch.object(native, 'native_prompt_tokens', return_value=([256, 10], 'fixture')), \
                patch.object(native, 'run_native', side_effect=execute):
            result = native.answer('question', self.config)
        self.assertEqual(result['status'], 'REFUSED')
        self.assertEqual(result['generation_status'], 'REJECTED_AFTER_EXECUTION')
        self.assertIn('STALE_SOURCE', result['error']['code'])

    def test_unsupported_platform_and_bad_request_do_not_execute(self):
        with patch.object(native.sys, 'platform', 'win32'), patch.object(rag, 'query') as query:
            result = native.answer('question', self.config)
        self.assertEqual(result['error']['code'], 'UNSUPPORTED_EXECUTION')
        query.assert_not_called()
        with patch.object(native.sys, 'platform', 'linux'), patch.object(rag, 'query') as query:
            result = native.answer('question', self.config, max_new_tokens=65)
        self.assertEqual(result['error']['code'], 'INVALID_REQUEST')
        query.assert_not_called()


    def test_process_evidence_preserves_invalid_utf8_and_never_uses_shell(self):
        import base64
        import subprocess
        command = ['/native/test-fixture', '$(do-not-run)', ';echo nope']
        completed = subprocess.CompletedProcess(command, 0, b'\xffactual bytes', b'')
        with patch.object(native.subprocess, 'run', return_value=completed) as run:
            result = native.run_native(command)
        self.assertFalse(result['valid_utf8'])
        self.assertEqual(base64.b64decode(result['stdout_base64']), b'\xffactual bytes')
        self.assertEqual(run.call_args.args[0], command)
        self.assertFalse(run.call_args.kwargs['shell'])
        self.assertEqual(run.call_args.kwargs['env']['CUDA_VISIBLE_DEVICES'], '')

    def test_timeout_retains_partial_process_evidence(self):
        import subprocess
        error = subprocess.TimeoutExpired(['/native/test-fixture'], 1, output=b'partial', stderr=b'error')
        with patch.object(native.subprocess, 'run', side_effect=error):
            result = native.run_native(['/native/test-fixture'], timeout=1)
        self.assertTrue(result['timed_out'])
        self.assertIsNone(result['return_code'])
        self.assertEqual(result['stdout'], 'partial')
        self.assertEqual(result['stderr'], 'error')

    def test_checkpoint_changed_during_generation_rejects_output(self):
        def execute(argv, timeout=90):
            with open(self.config['checkpoint']['path'], 'ab') as stream:
                stream.write(b'changed')
            return {'argv': argv, 'backend': 'cpu', 'stdout': 'output', 'stderr': '', 'return_code': 0}
        with patch.object(native.sys, 'platform', 'linux'), patch.object(rag, 'query', return_value=self.retrieval), \
                patch.object(native, 'native_prompt_tokens', return_value=([256, 10], 'fixture')), \
                patch.object(native, 'run_native', side_effect=execute):
            result = native.answer('question', self.config)
        self.assertEqual(result['status'], 'REFUSED')
        self.assertEqual(result['generation_status'], 'REJECTED_AFTER_EXECUTION')
        self.assertEqual(result['error']['code'], 'ARTIFACT_IDENTITY_MISMATCH')

if __name__ == '__main__':
    unittest.main()
