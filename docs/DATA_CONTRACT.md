# Data Contract

Original inputs are immutable. Derived datasets retain provenance and hashes.

Initial deterministic checks:
- UTF-8 decoding;
- BOM handling;
- CRLF -> LF normalization;
- trailing whitespace cleanup;
- empty/very short/very long records;
- exact SHA-256 duplicates;
- deterministic split assignment;
- exact cross-split leakage.

Arabic normalization that can alter semantics is disabled by default.
