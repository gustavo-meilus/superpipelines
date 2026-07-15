# PROTOTYPE — Benchmark measurement contract

Question: can one small, platform-neutral event vocabulary measure the two
agreed Superpipelines benchmark fixtures without treating external-process or
human-approval waiting as active orchestration time?

This is a throwaway planning prototype. It replays synthetic timestamps; it
does not benchmark model providers, run a consumer pipeline, or propose
production persistence. The JSONL fixtures are contract examples, not latency
targets.

## Verdict

Validated with the project owner on 2026-07-14: orchestration/model work,
external tool runtime, and human waiting are distinct measurement boundaries.
The event trace and derived report must preserve that separation.

Run it with:

```powershell
npm run prototype:benchmark-contract
```

The proposed measurement rules are:

- `active_elapsed_ms` is the union of `orchestration` and `model_dispatch`
  work spans. Nested or overlapping spans are counted once.
- `waiting_ms` is the union of explicit human or external-dependency wait
  spans. It excludes an external process's own runtime.
- `tool_process_ms` is the union of external tool-process spans and is reported
  separately from active and wait time.
- `phase_count` counts distinct entered operation phases; these are benchmark
  operation phases, not new canonical pipeline lifecycle phases.
- `model_dispatch_count` counts model-dispatch work spans.
- `audit_iterations` counts explicit audit iteration events.
- `failure_detection_phase` comes only from `failure.detected`; absence is
  reported as `null`, never inferred.
- `max_process_activity_gap_ms` includes process start, activity observations,
  and process finish. A gap above 30 seconds fails the proposed observability
  check.
- Token and monetary cost fields are optional telemetry. Missing values remain
  `unavailable`; they are never replaced with zero.

For a real Windows Tier 1d baseline, replay is not enough. The eventual harness
must run each committed fixture at least three times on a recorded plugin
revision and profile snapshot, retain raw JSONL plus the derived report, and
report median and range. Tool and human waits must be deterministically
scripted for the benchmark while remaining semantically distinct.
