# Runtime and Mutation Ownership Seams

Status: Wayfinder research asset

Scope: first-party Superpipelines plugin source at commit `5b690e345b313b9256f732e1c8884683fc3bb5fa`

Excluded: generated `plugins/superpipelines/`, pipeline-specific repositories and artifacts, and implementation changes

## Executive finding

Superpipelines already has useful conceptual seams—data-root path resolution, a state contract, profile-driven dispatch, read-only audit, and staged mutation workflows—but most runtime mechanics are still *specified as Markdown instructions and executed by the orchestrating model*. There is no shared executable plugin runtime for bundle validation, mutation transactions, state transitions, process observation, or promotion. The existing Node programs are installer, packaging, parity, and repository guard scripts rather than shipped orchestration mechanics ([package scripts](../../package.json#L7-L21), [packaging entrypoint](../../scripts/package-codex-plugin.js#L1-L17)).

That split explains both latency and reliability gaps: repeated model passes perform deterministic file discovery, JSON mutation, graph checks, manifest comparison, version stamping, and multi-file moves; each workflow restates some of the contract; and “atomic” often means an instruction to move a set of files, not an executable transaction with prepare/commit/rollback semantics.

The strongest boundary for downstream design is therefore:

- Keep judgment, human gates, architect generation, and independent audit/review in skills and isolated agents.
- Move deterministic validation, state transitions, staging manifests, process/event observation, and transactional promotion behind a small, shipped, profile-aware executable interface.
- Keep generated pipelines self-contained as data under `.superpipelines/`; the executable belongs to the plugin bundle and must not become a cross-pipeline dependency.

## Current ownership matrix

| Responsibility | Declared owner today | Where execution actually happens | Existing executable enforcement | Main seam or gap |
|---|---|---|---|---|
| Pipeline/run preflight | `running-a-pipeline` owns total phase order, migration, resolution, compatibility, portability, safety, and resume checks ([phase contract](../../skills/running-a-pipeline/SKILL.md#L23-L36), [pre-dispatch assertion](../../skills/running-a-pipeline/SKILL.md#L361-L368)) | Top-level model follows prose, reads files, and constructs a visible todo/ledger | Repository checks test selected authoring invariants, not a live preflight API | Invalid inputs can consume model work before failure; phase enforcement is model-mediated |
| Mutation semantic validation | Add/update/delete skills classify insertion, impact, gaps, topology, and neighbor contracts ([add](../../skills/adding-a-pipeline-step/SKILL.md#L18-L40), [update](../../skills/updating-a-pipeline-step/SKILL.md#L22-L42), [delete](../../skills/deleting-a-pipeline-step/SKILL.md#L22-L42)) | Orchestrator and architect reason over topology; auditor later checks the staged delta | Delete-specific guard script checks that required *prose* remains present ([guard](../../scripts/check-delete-step-guards.js#L30-L69)) | Deterministic graph/schema/manifest checks have no common callable validator |
| State schema and writes | `sk-pipeline-state` defines schema, recovery, UTF-8/no-BOM, and `.tmp` + rename ([schema](../../skills/sk-pipeline-state/SKILL.md#L29-L75), [atomic-write protocol](../../skills/sk-pipeline-state/SKILL.md#L77-L128)) | Runner, dispatch/entry body, and inline Tier 2 loop each write state ([runner init](../../skills/running-a-pipeline/SKILL.md#L339-L359), [inline update](../../skills/sk-platform-dispatch/SKILL.md#L352-L370)) | None shipped for runtime use; prose embeds Bash, PowerShell, Node, and Python recipes | One contract, multiple writers, no transition validator or compare-and-swap/locking |
| Staging | `sk-pipeline-paths` owns canonical data and legacy staging locations ([data path](../../skills/sk-pipeline-paths/SKILL.md#L132-L151), [legacy path](../../skills/sk-pipeline-paths/SKILL.md#L159-L179)); architect writes STEP-* output into staging ([delivery](../../skills/pipeline-architect-protocol/SKILL.md#L108-L116)) | Architect/model creates files under `edit-{ts}`; individual mutation skills decide expected contents | No staging-manifest engine; STEP-DELETE alone has a completion manifest | Expected-set, hashes, source/destination mapping, and deletion intent are not canonical across mutations |
| Verification/audit sequencing | Each mutation orchestrator dispatches read-only `pipeline-auditor` in DELTA mode; auditor owns criteria and rendering but cannot persist ([modes](../../skills/pipeline-auditor-protocol/SKILL.md#L20-L47)) | Auditor model reports inline; orchestrator interprets severities and persists reports ([reporting contract](../../commands/audit-steps.md#L29-L35)) | Static repo checks cover selected rules and golden translation parity | Audit independence is sound, but deterministic findings and report/result parsing remain model-mediated |
| Review isolation | `sk-write-review-isolation` owns writer/reviewer separation and Stage 1-before-Stage 2 ([invariant](../../skills/sk-write-review-isolation/SKILL.md#L10-L13), [gate](../../skills/sk-write-review-isolation/SKILL.md#L24-L39)); profiles own tier capability/degradation facts ([Tier 1d](../../skills/sk-platform-dispatch/profiles/tier_1d.json#L12-L40), [Tier 2](../../skills/sk-platform-dispatch/profiles/tier_2.json#L12-L34)) | Host dispatch applies profile-selected native mechanisms | CAD materialization parity has executable golden tests, but live enforcement stays host-dependent | Any shared runtime must orchestrate—not collapse—the independent writer/auditor/reviewer identities |
| Process observation | Runner exports run/step environment variables before subagent dispatch ([export](../../skills/running-a-pipeline/SKILL.md#L397-L404)); optional hook appends one completion row ([hook](../../hooks/subagent-telemetry#L40-L92)) | Claude hook reads `~/.claude/agent-metrics.jsonl` after `SubagentStop` | Hook is executable but ships disabled and never fails a run ([documentation](../../hooks/README-telemetry.md#L7-L22)) | No cross-tier span/event trace, external-process watcher, activity heartbeat, or explicit human-wait interval |
| Completion and cleanup | Generated entry body is primary finalizer; runner is a defensive backstop ([responsibility](../../skills/running-a-pipeline/SKILL.md#L384-L408)); architect stamps cleanup behavior into every generated entry ([entry contract](../../skills/pipeline-architect-protocol/SKILL.md#L67-L73)) | Generated model-authored entry code and runner both infer terminal state and delete run/cache directories | None | Duplicate finalization logic and status vocabulary permit nested completion drift |
| Promotion and rollback | Add/update/delete/migrate/optimize each own a Phase 5-style promotion; optimization adds snapshot, git checkpoint, post-promote audit, and rollback ([optimization batch](../../skills/optimizing-a-pipeline/SKILL.md#L53-L67)); migration adds ordered legacy deletion ([migration promotion](../../skills/migrating-a-pipeline/SKILL.md#L147-L161)) | Orchestrator performs a sequence of filesystem and registry edits | None shared | “Atomic” is neither defined nor guaranteed for multi-file replacement/deletion, especially across Windows failure points |

## Ownership by flow

### Run path

`commands/run-pipeline.md` is intended to be a thin adapter and declares the skill the single source of truth ([command invariant](../../commands/run-pipeline.md#L10-L20)). The authoritative run skill then owns discovery, tier detection, model migration/resolution, compatibility, portability, safety, resume, initialization, dispatch, and cleanup. It delegates per-step execution to the generated `entry.md`, which delegates host mechanics to `sk-platform-dispatch`.

The layering is directionally good:

1. `sk-pipeline-paths` resolves data/legacy/native-cache locations.
2. profile JSON supplies host facts.
3. `sk-model-resolver` resolves model intent.
4. `sk-platform-dispatch` materializes a CAD and dispatches it.
5. the generated entry preserves pipeline-specific topology and review order.
6. `sk-pipeline-state` defines persistence and recovery.

The gap is that these are function-shaped prose APIs. For example, `DETECT()`, `DISPATCH()`, `MATERIALIZE()`, `RESOLVE_DATA_ROOT()`, and atomic state writes are specified like functions, but their live execution depends on a model interpreting Markdown. A shared executable can deepen this seam without moving platform facts out of profiles or pipeline topology out of generated data.

### Mutation path

The command wrappers correctly route and prohibit direct mutation ([new-step](../../commands/new-step.md#L8-L20), [update-step](../../commands/update-step.md#L8-L20), [delete-step](../../commands/delete-step.md#L8-L20)). The mutation skills then repeat a common transaction shape:

1. select and inspect;
2. classify/plan the semantic change;
3. ask the architect to stage artifacts;
4. validate/audit the delta;
5. ask for human approval;
6. promote files, edit registry, and stamp versions.

That common shape is the natural transaction boundary. The *semantic proposal* remains mutation-specific and model-authored. Once a candidate is staged, a deterministic runtime can own the expected-set manifest, topology/schema checks, isolated delta calculation, preconditions, audit-result envelope, approval token binding, promotion journal, rollback, and final verification.

## Duplication and drift hotspots

### 1. “Atomic promotion” is repeated but not implemented

Add says to “move staged files” and then update registries ([add promotion](../../skills/adding-a-pipeline-step/SKILL.md#L42-L53)); update says to atomically move files and update the registry ([update promotion](../../skills/updating-a-pipeline-step/SKILL.md#L44-L54)); delete performs removals, writes topology/tasks, then updates the registry ([delete promotion](../../skills/deleting-a-pipeline-step/SKILL.md#L44-L58)). None defines ordering, filesystem-boundary constraints, collision checks, a journal, rollback after the first successful move, or recovery after interruption.

Optimization contains the richest desired behavior—snapshot, git checkpoint, one combined delta audit, all-or-nothing promotion, full post-audit, graph check, and rollback—but still delegates mechanics to prose ([batch apply](../../skills/optimizing-a-pipeline/SKILL.md#L53-L77)). This is the best behavioral input for a canonical transaction, not an implementation to duplicate.

### 2. Data-only and legacy path language is not consistently localized

The canonical path skill says new v2 pipelines stage at `DATA_ROOT/temp/{P}/edit-{ts}/`, while `{ROOT}/superpipelines/temp/...` is legacy-only and read-only for new writes ([canonical templates](../../skills/sk-pipeline-paths/SKILL.md#L132-L179)). Add and update still prescribe `{ROOT}/superpipelines/temp/...` ([add staging](../../skills/adding-a-pipeline-step/SKILL.md#L27-L30), [update staging](../../skills/updating-a-pipeline-step/SKILL.md#L36-L39)); delete uses the unqualified `edit-{ts}/` ([delete staging](../../skills/deleting-a-pipeline-step/SKILL.md#L30-L38)). A runtime path API would make the layout branch explicit once and prevent each skill from re-deriving it.

### 3. The thin run command has already drifted from its authority

The command describes Phase 0.4 as model resolution, Phase 0.45 as migration, and omits Phase 0.7 ([command summary](../../commands/run-pipeline.md#L6-L18)). The authoritative skill requires 0.4 migration, 0.45 resolution, and mandatory Phase 0.7 ([runner contract](../../skills/running-a-pipeline/SKILL.md#L23-L36)). This is direct evidence that repeating phase manifests in adapters is unsafe even when the adapter says it is not an authority.

### 4. State has multiple status dialects and finalizers

The state schema declares phase statuses `pending | running | done | failed` ([schema](../../skills/sk-pipeline-state/SKILL.md#L40-L51)); the dispatch contract returns uppercase `DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED` ([dispatch result](../../skills/sk-platform-dispatch/SKILL.md#L80-L96)); runner finalization tests phase/step status `completed` ([resume/finalize](../../skills/running-a-pipeline/SKILL.md#L329-L337), [completion backstop](../../skills/running-a-pipeline/SKILL.md#L406-L410)). These may be intended as different layers, but there is no executable mapping or invariant tying them together.

The generated entry is instructed to mark completion and clean up, while the runner repeats a compatibility backstop. A versioned state machine should distinguish step result, persisted step status, run status, orchestration activity, external-process activity, and human-wait state rather than relying on string inference.

### 5. Deterministic validation is paid for in model/auditor cycles

Topology reference validity, graph reachability, I/O chain checks, manifest completeness, identical staged files, JSON/schema validity, version stamping, and path containment can all be computed. Today they are split among mutation prose, architect completion claims, read-only audit, and narrow repo guards. The delete flow is especially illustrative: its incident guard now requires both a completion manifest and an independent byte comparison ([delete gates](../../skills/deleting-a-pipeline-step/SKILL.md#L30-L42)), while the repository check merely verifies those instructions remain in Markdown ([guard implementation](../../scripts/check-delete-step-guards.js#L30-L69)).

The auditor must remain independent and keep severity authority. Executable validation should produce evidence for the auditor and reject structurally invalid candidates before model dispatch; it should not let the candidate-writing process declare itself compliant.

### 6. Observation covers completed subagents, not elapsed-time ownership

The optional hook records one row after a subagent stops, with token and duration fields nullable ([hook row](../../hooks/subagent-telemetry#L70-L92)). It cannot describe time spent in orchestration, model dispatch, tool execution, a long external process, or a human approval wait, and it emits nothing on Tier 2 because no subagent boundary exists ([runner limitation](../../skills/running-a-pipeline/SKILL.md#L397-L404)). There is no activity heartbeat or stall detector. This is an extension seam—not a sufficient event contract.

### 7. Profile ownership is sound, but fallback copies remain drift-prone

The dispatch skill correctly says platform warnings and capability facts belong to profile JSON ([degradation ownership](../../skills/sk-platform-dispatch/SKILL.md#L402-L413)). The runner nevertheless embeds a full multi-tier profile snapshot as a fallback and explicitly calls it a maintenance copy ([inline snapshot](../../skills/running-a-pipeline/SKILL.md#L99-L113)). A shared runtime packaged with the profiles could load the same source deterministically across hosts, while leaving only a minimal emergency fallback where a plugin file truly cannot be read.

### 8. Materialization has test-only executable translators and prose-only live translators

The parity check implements executable CAD parsers and Claude/OpenCode/Codex translators and compares them with golden fixtures ([executable translators](../../scripts/check-materialization-parity.js#L1-L10), [implementations](../../scripts/check-materialization-parity.js#L20-L99), [golden runner](../../scripts/check-materialization-parity.js#L101-L149)). Live materialization, however, is still a pseudocode contract interpreted by the orchestrator ([runtime materializer](../../skills/sk-platform-dispatch/SKILL.md#L98-L139), [native translations](../../skills/sk-platform-dispatch/SKILL.md#L151-L252)). The test and live paths can therefore diverge even though both claim the same contract. A shipped runtime should reuse the same pure translator implementation that parity tests exercise; profiles and fixtures remain the authority for platform facts and expected output.

## Existing seams worth preserving

- **Data-only pipeline boundary:** generated specs, topology, CADs, entry body, state, and staging remain portable data under `.superpipelines/`; native agent files are disposable materialization cache ([path model](../../skills/sk-pipeline-paths/SKILL.md#L130-L157)).
- **Profile-driven dependency inversion:** runtime branches on capabilities, while model IDs, native agent directories, isolation recipes, and warnings remain in tier profiles ([dispatch profile contract](../../skills/sk-platform-dispatch/SKILL.md#L54-L68), [materialization rule](../../skills/sk-platform-dispatch/SKILL.md#L98-L110)).
- **Read-only audit ownership:** the auditor renders evidence and remediation; the orchestrator alone persists reports and routes writes ([auditor boundary](../../skills/pipeline-auditor-protocol/SKILL.md#L16-L18), [report boundary](../../skills/pipeline-auditor-protocol/SKILL.md#L45-L54)).
- **Writer/reviewer isolation and ordering:** Stage 1 spec compliance gates Stage 2 quality, and any Stage 2-driven change returns through Stage 1 ([review loop](../../skills/sk-write-review-isolation/SKILL.md#L24-L56)).
- **Canonical lifecycle phases:** a runtime can validate and record phase transitions but must not rename, flatten, or reorder the product lifecycle contract. Run-control states such as `waiting_external` or `awaiting_approval` should be orthogonal status dimensions, not replacement phases.
- **Generated-bundle autonomy:** pipelines should continue to contain their own topology and protocols. The shared executable supplies plugin mechanics only; one generated pipeline must never import another pipeline’s files or state.
- **Graceful telemetry degradation:** missing tokens/cost must remain explicit and non-fatal, consistent with the current hook’s refusal to fabricate metrics ([telemetry null contract](../../hooks/README-telemetry.md#L24-L37)).
- **Node/ESM packaging seam:** the repo already requires Node 18, but the current Codex packager mirrors `skills/` and optional `assets/` plus selected root documents; it does **not** copy arbitrary root `scripts/` into the plugin ([package roots](../../scripts/package-codex-plugin.js#L7-L17), [source-to-package sync](../../scripts/package-codex-plugin.js#L265-L279)). A shipped runtime therefore needs an explicit source/package location and a packager/parity update. Its source must live outside generated `plugins/superpipelines/`; the generated bundle is produced only by `package:codex` ([package configuration](../../package.json#L1-L21)).

## Implications for downstream Wayfinder tickets

### Define the canonical mutation transaction and module boundary

The transaction should begin *after* a mutation-specific proposal is staged and end only after coherent promotion or complete rollback. It needs a versioned manifest containing operation kind, layout/scope/pipeline identity, base hashes, expected produced/changed/deleted files, destination paths, version-stamp intent, and audit evidence identity. Open questions:

- Is promotion restricted to one filesystem/volume so rename can be used, or must the journal support copy-and-swap?
- What is the recovery contract if the process dies after some destination replacements?
- How is explicit human approval cryptographically or structurally bound to the exact audited manifest?
- Which validations are universal, and which remain operation-specific policy?

### Define versioned state, evidence, and migration contracts

Make transitions executable and versioned. Define mappings among dispatch result, step status, phase status, run status, and wait/activity status. Preserve legacy reads and explicit migration warnings; reject ambiguous artifacts before dispatch. Open questions:

- Is state updated through append-only events plus a materialized snapshot, or guarded snapshot transitions?
- How are concurrent/stale writers detected?
- Which legacy values (`done`, `completed`, uppercase result statuses) are aliases, migrations, or genuinely separate concepts?
- Which terminal evidence survives cleanup if successful run directories are deleted today?

### Define the executable run coordinator and generated entry contract

Decide which responsibilities move out of generated `entry.md`, the outer runner, and the Tier 2 inline loop into one plugin-owned coordinator. Pipeline-specific topology, declared inputs/outputs, and review intent remain generated data; deterministic dispatch sequencing, result-to-state mapping, artifact verification, completion invariants, and cleanup should have one owner. Open questions:

- What is the smallest generated entry interface that still keeps standalone bundles understandable and portable?
- How does the coordinator preserve topology-specific ordering, parallelism, iteration caps, and Stage 1-before-Stage 2 isolation without hardcoding a named pipeline?
- Which compatibility adapter reads existing generated entry bodies, and when may the legacy path be removed?
- Does the coordinator call the platform dispatch interface directly, or interpret a versioned execution plan compiled from `entry.md` and `topology.json`?

### Define run status, wait semantics, and process observation

Use the current hook as an optional adapter into a plugin-owned event trace, not as the trace itself. The trace must work when token telemetry is absent and must distinguish active orchestration/model time, tool/external-process time, and human waiting. Open questions:

- Which process wrapper can observe stdout/stderr activity and emit a heartbeat at no more than 30-second silence without changing command semantics?
- Who owns cancellation, timeout, orphan cleanup, and resume metadata on Windows?
- Which events are mandatory on every tier, and which are host adapter enrichments?

### Define Windows-safe staging and transactional promotion guarantees

Specify same-volume atomic primitives, replacement behavior when destinations exist, antivirus/file-lock retry bounds, directory-vs-file operations, deletion tombstones, BOM-free JSON, and crash recovery. Do not call a multi-file operation atomic unless the externally visible consistency guarantee and recovery journal make that claim true.

### Define bounded mutation classification and audit paths

Executable classification may identify a candidate as topology-preserving only from a verified delta: unchanged step/edge identity, unchanged capability/permission/model/dispatch/lifecycle contracts, and bounded file scope. That may justify one candidate generation plus an isolated delta audit and human promotion. Any topology, permission, dispatch, model, lifecycle, or breaking-schema change must retain the full architect/auditor path. The independent auditor and SEV-0/1 blockers remain non-negotiable.

### Define cross-tier materialization and compatibility verification

The runtime interface should accept a profile object or profile identifier and never embed concrete platform facts. Static schema/parity tests can cover every tier, while live host dispatch remains release verification. Materialized native files remain disposable and must not become source.

### Set benchmark acceptance thresholds from baseline evidence

Instrumentation should count deterministic preflight failures before any model dispatch, model-dispatch count, audit iterations, tool/external-process duration, waiting duration, phase count, and failure-detection phase. Token/cost metrics are optional enrichments and must explicitly report unavailable rather than silently disappear.

## Recommended ownership cut

| Keep in skills/agents | Move behind executable plugin mechanics |
|---|---|
| Clarifying intent and mutation semantics | Parse and validate registry/topology/CAD/state/manifest schemas |
| Architect generation of a candidate | Resolve canonical data, staging, and destination paths |
| Human approval and cancellation decisions | Create/hash/verify the staged transaction manifest |
| Independent DELTA/FULL audit judgments and severity | Enforce state transitions and atomic BOM-free persistence |
| Stage 1 and Stage 2 isolated review judgments | Emit lifecycle/activity/wait/process events and heartbeats |
| Profile-owned platform capability declarations | Apply a profile-selected adapter without copying platform facts |
| Pipeline-specific topology and protocols | Prepare, commit, journal, verify, recover, or roll back promotion |

This cut reduces repeated model work without turning safety judgments into self-certification. It also keeps the redesign wholly inside the Superpipelines plugin/bundle repository: source mechanics, skills, profiles, tests/fixtures, packaging, and generated-package consequences—never pipeline-specific policy and never direct edits to the generated Codex bundle.
