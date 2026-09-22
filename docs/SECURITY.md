# Security

- Local-first; no telemetry by default.
- No cloud runtime dependency.
- No secret fields in the frontend.
- No arbitrary shell execution.
- Tauri capabilities remain least-privilege.
- Native executable selection must be pinned/approved.
- Paths must be canonicalized and constrained before native process integration.
- Remote web content must never receive native capabilities.
