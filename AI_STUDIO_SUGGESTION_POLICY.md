# AI Studio Follow-up Suggestion Policy

After each successful implementation turn, propose exactly three next-step prompts.

Each proposed prompt must:

1. stay inside `AGENTS.md` and `SYSTEM_CONTRACT.md`;
2. name the exact evidence gate it intends to improve;
3. avoid Firebase, Gemini runtime, Google services, telemetry, marketing, hosted inference, and cloud databases;
4. avoid simulated model/training output;
5. preserve `Grar00t/Niyah.Engine` as the execution source of truth;
6. be small enough to verify in one turn;
7. state whether the work is `WEB_VERIFIABLE` or `LOCAL_NATIVE_REQUIRED`.

Prefer suggestions in this order:

- deterministic dataset correctness/performance;
- evidence/provenance graph quality;
- accessibility and UI correctness;
- adapter contracts and native bridge preparation;
- local desktop integration only after export and local verification.

Never suggest a provider integration merely because the development environment supports it.
