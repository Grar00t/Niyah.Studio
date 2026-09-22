# Architecture

```text
React + TypeScript + Vite
        |
        +-- deterministic browser dataset tools
        |
        +-- EngineAdapter
                |
        browser preview -> OfflineEngineAdapter -> ENGINE_OFFLINE
                |
        desktop -> typed Tauri/Rust bridge -> pinned Niyah.Engine executables
```

The UI never contains a substitute language model. The native engine remains independently buildable and testable.

## Evidence graph

The purple relationship graph is inspired by local knowledge tools such as Obsidian's graph view, but its semantics are engineering-specific. Nodes are generated from current state only: engine identities, datasets/records, runs, checkpoints, evaluations, conversations, and evidence receipts. No synthetic metrics are created for visual effect.
