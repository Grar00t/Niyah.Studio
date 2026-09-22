# Niyah Studio

Local-first React/Tauri workstation for `Grar00t/Niyah.Engine`.

## Current verified scope

The web application contains deterministic dataset inspection, exact duplicate detection, deterministic split assignment, exact leakage checks, evidence receipts, a ChatGPT-like shell, runtime inspector, and an Obsidian-inspired purple evidence graph. Native model actions intentionally fail closed in browser preview.

## Explicit non-goals

- no browser language-model implementation;
- no simulated training/inference/CUDA;
- no Firebase;
- no Gemini runtime dependency;
- no Google analytics/marketing integration;
- no telemetry/tracking;
- no cloud database or hosted model requirement.

## Web verification

```bash
npm install --no-audit --no-fund
npm run verify
npm run dev
```

The dev server is fixed to port 3000 for Google AI Studio compatibility.

## Desktop direction

`src-tauri/` is a minimal Tauri v2 shell. It does not bundle a native engine binary until `contracts/engine.lock.json` is pinned to a verified artifact. The next native gate is to wire the actual current Niyah.Engine CLI through typed Rust commands and least-privilege process control.

## AI Studio

Import this repository into Google AI Studio Build using **React**. Keep the system instructions already configured, then paste `AI_STUDIO_OPENING_PROMPT.md` as the first project prompt.
