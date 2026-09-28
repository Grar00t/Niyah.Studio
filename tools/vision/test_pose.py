import unittest
import tempfile
from pathlib import Path
import torch
from pose_smoke import load_pose, restore_fixed_buffer


class PoseBufferContract(unittest.TestCase):
    def make_model(self):
        model=torch.nn.Module()
        model.gr=torch.nn.Linear(2,2)
        model.gr.register_buffer('A',torch.eye(2))
        return model

    def test_only_missing_fixed_adjacency_is_restored(self):
        model=self.make_model();state=dict(model.state_dict());del state['gr.A']
        before=state['gr.weight'].clone()
        self.assertEqual(restore_fixed_buffer(model,state),['gr.A'])
        self.assertTrue(torch.equal(model.gr.weight,before))
        self.assertTrue(torch.equal(model.gr.A,torch.eye(2)))

    def test_missing_parameter_and_extra_key_are_rejected(self):
        model=self.make_model();state=dict(model.state_dict());del state['gr.weight']
        with self.assertRaisesRegex(ValueError,'KEYS_MISMATCH'):restore_fixed_buffer(model,state)
        state=dict(model.state_dict());state['unexpected']=torch.zeros(1)
        with self.assertRaisesRegex(ValueError,'KEYS_MISMATCH'):restore_fixed_buffer(model,state)

    def test_changed_bundle_is_rejected_before_import(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle=Path(directory)
            (bundle/'model.py').write_text('raise AssertionError("must not import")')
            (bundle/'pose_mmfi_best.pt').write_bytes(b'fixture')
            with self.assertRaisesRegex(ValueError,'IDENTITY_MISMATCH'):load_pose(bundle)


if __name__=='__main__':unittest.main()
