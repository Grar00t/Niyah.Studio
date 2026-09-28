"""Pinned local WiFi CSI pose smoke; does not establish sensor accuracy."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

WEIGHTS_SHA256 = '52b7a9aadf1bbfd9565258754cdf358f12ed0c71897c2b92bf6dae899bfce78c'
SOURCE_SHA256 = '93f0081d10d78ef5f741a603bb5a6755faebbd70f77bb31d0db38aeeb25c34da'
# A concurrent local edit changed only gr.A to persistent=False. Preserve it.
NONPERSISTENT_SOURCE_SHA256 = 'ecd6a75ce81edb76b986b4e8104cbb64e7872a36e9d8c16de02714ee3d00c3ea'


def sha256(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def restore_fixed_buffer(model, state):
    """Only the fixed adjacency buffer may be absent; parameters stay strict."""
    expected = model.state_dict()
    missing = set(expected) - set(state)
    extra = set(state) - set(expected)
    if extra or missing - {'gr.A'}:
        raise ValueError(f'POSE_STATE_KEYS_MISMATCH:missing={sorted(missing)},extra={sorted(extra)}')
    if 'gr.A' in missing:
        # This buffer is derived from the reviewed, pinned skeleton definition.
        # It is not a learned parameter. Never initialize absent learned weights.
        state = dict(state)
        state['gr.A'] = expected['gr.A'].clone()
    model.load_state_dict(state, strict=True)
    return sorted(missing)


def load_pose(bundle):
    import torch
    bundle = Path(bundle)
    source, weights = bundle / 'model.py', bundle / 'pose_mmfi_best.pt'
    source_hash = sha256(source)
    if source_hash not in {SOURCE_SHA256, NONPERSISTENT_SOURCE_SHA256} or sha256(weights) != WEIGHTS_SHA256:
        raise ValueError('POSE_BUNDLE_IDENTITY_MISMATCH')
    spec = importlib.util.spec_from_file_location('niyah_pinned_pose', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    model = module.TF(na=3).eval()
    state = torch.load(weights, map_location='cpu', weights_only=True)
    repaired = restore_fixed_buffer(model, state)
    return model, {'weights_sha256':WEIGHTS_SHA256,'model_source_sha256':source_hash,
                   'restored_fixed_buffers':repaired,'learned_weights_modified':False}


def main():
    import torch
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    torch.set_num_threads(2);torch.manual_seed(42)
    model, receipt=load_pose(args.bundle)
    inputs=torch.randn(2,3,114,10)
    with torch.inference_mode():
        first=model(inputs);second=model(inputs)
    if first.shape!=(2,34) or not torch.isfinite(first).all() or not torch.equal(first,second):
        raise ValueError('POSE_NUMERICAL_SMOKE_FAILED')
    receipt.update(status='POSE_LOCAL_LOAD_AND_REPLAY_PASS',output_shape=list(first.shape),
                   fixture='seeded synthetic CSI; no live sensor or accuracy claim',accuracy='NOT_REPRODUCED')
    Path(args.output).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(receipt,indent=2))


if __name__=='__main__':main()
