# Pinned external pose loader

The local `ruvnet/wifi-densepose-mmfi-pose` bundle at download revision
`39f46e583081a577bddd72f239690281ec11644b` cannot load with the model card's strict
`load_state_dict` example: its checkpoint lacks `gr.A`, a fixed adjacency buffer
derived from the skeleton definition in `model.py`. No learned parameter is missing.

`pose_smoke.py` verifies exact weight and model-source hashes before importing the
local definition. It restores only that fixed buffer from the pinned definition,
then loads with `strict=True`. Missing learned parameters and unexpected keys fail.
The weights on disk remain unchanged.

During verification the local `model.py` changed concurrently: its sole source
difference made `gr.A` nonpersistent. That edit was preserved, not overwritten.
Its SHA-256 is `ecd6a75ce81edb76b986b4e8104cbb64e7872a36e9d8c16de02714ee3d00c3ea`.
The loader accepts both this reviewed definition and the original pinned definition;
both retain the same deterministic adjacency and require every learned parameter.

The downloaded weight SHA-256 is
`52b7a9aadf1bbfd9565258754cdf358f12ed0c71897c2b92bf6dae899bfce78c`, matching the
locally recorded Hugging Face LFS object. The bundled `pose_mmfi_best.meta.json`
instead claims `d43ccd7e52e30a3adf5f6f3457224ea61bce5ed893abcdb183c570c78b16e13e`.
That sidecar is preserved as upstream evidence; its claimed accuracy is not
certified by this smoke test. The cause of the inconsistent sidecar is unestablished.

```powershell
D:\AI\venvs\multimodal-core\Scripts\python.exe tools\vision\pose_smoke.py `
  --bundle D:\RuView\models\wifi-densepose-mmfi-pose --output D:\path\pose-receipt.json
```

The smoke checks CPU loading, finite `[2,34]` output, and exact replay on a seeded
synthetic `[2,3,114,10]` CSI fixture. It proves numerical usability, not pose accuracy,
live sensor integration, visual understanding, or a Niyah multimodal architecture.
Unit tests: from this directory, run `python -m unittest -v test_pose` in the same
PyTorch environment. The environment used for the receipt has PyTorch `2.11.0+cu130`
and NumPy `2.5.2`; inference here explicitly runs on CPU.
