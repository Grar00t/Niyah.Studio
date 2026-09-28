"""Opt-in real retrieval/native-CPU gate. No database writes and no quality PASS claim."""
import argparse
import hashlib
import json
from pathlib import Path
import time

import native_answer


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--question', default='What is the generation health of V10 STEP0200 and the SFT canary?')
    args = parser.parse_args()
    output = Path(args.output)
    if output.exists():
        raise SystemExit('EVIDENCE_OUTPUT_ALREADY_EXISTS')
    config = json.loads(Path(args.config).read_text(encoding='utf8'))
    started = time.monotonic()
    runs = [native_answer.answer(args.question, config, limit=3, max_new_tokens=16) for _ in range(2)]
    checks = {
        'native_execution_twice': all(x['status'] == 'NATIVE_RAG_EXECUTED' for x in runs),
        'cpu_only': all(x.get('execution', {}).get('backend') == 'cpu' for x in runs),
        'context_reservation': all(x.get('prompt', {}).get('tokens_including_bos', 999) + 16 <= 256 for x in runs),
        'deterministic_prompt_tokens': runs[0].get('prompt', {}).get('token_ids_including_bos') == runs[1].get('prompt', {}).get('token_ids_including_bos'),
        'deterministic_output': runs[0].get('execution', {}).get('stdout') == runs[1].get('execution', {}).get('stdout'),
        'quality_never_claimed_pass': all(x.get('behavioral_quality', {}).get('status') in ('FAIL', 'NOT_ESTABLISHED') for x in runs),
        'actual_nonempty_excerpts': all(x.get('prompt', {}).get('excerpts') for x in runs),
    }
    source_hashes = {name: hashlib.sha256(Path(__file__).with_name(name).read_bytes()).hexdigest()
                     for name in ['rag.py', 'native_answer.py', 'test_native_integration.py']}
    receipt = {'schema_version': 1, 'status': 'NATIVE_RAG_EXECUTION_GATE_PASS' if all(checks.values()) else 'NATIVE_RAG_EXECUTION_GATE_FAIL',
               'scope': 'Gate verifies actual plumbing/reproducibility only. It never passes answer quality.',
               'checks': checks, 'source_sha256': source_hashes, 'runs': runs,
               'elapsed_seconds': time.monotonic() - started}
    output.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({k: v for k, v in receipt.items() if k != 'runs'}, indent=2))
    return 0 if all(checks.values()) else 1


if __name__ == '__main__':
    raise SystemExit(main())
