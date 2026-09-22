# Engine Contract

`Grar00t/Niyah.Engine` is authoritative. Studio adapter method names are application concepts, not proof that a native command exists.

Before wiring any adapter method to native execution:

1. pin the exact engine revision;
2. inspect current CLI/API contracts;
3. map only existing options;
4. reject unknown options;
5. pass structured argv, never a concatenated shell command;
6. capture stdout, stderr, exit code, timestamps, and artifact hashes;
7. verify postconditions before emitting PASS.

If no mapped capability exists, return `UNSUPPORTED`.
