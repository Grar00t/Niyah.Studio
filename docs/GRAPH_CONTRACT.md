# Evidence Graph Contract

The purple graph is an engineering provenance surface, not a decorative mind map.

## Allowed node families

- Studio project
- Niyah.Engine identity
- dataset
- record
- tokenizer
- shard
- training run
- checkpoint
- evaluation
- conversation
- inference receipt
- evidence receipt

A node may exist only when the application has corresponding state or explicit test-fixture state.

## Allowed relationship semantics

Relationships must be explicit and directional, for example:

- `contains`
- `derived_from`
- `prepared_with`
- `trained_with`
- `produced`
- `evaluated_on`
- `generated_by`
- `references`
- `verified_by`
- `records`

The visual purple glow has no evidentiary meaning. PASS/FAIL/UNKNOWN state is rendered separately.

## Interaction

The graph should support search, node-kind filters, selection, pan, zoom, and a detail inspector. Layout may be deterministic or force-directed, but the graph must never generate synthetic entities just to make the visualization look dense.
