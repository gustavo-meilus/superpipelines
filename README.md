# Superpipelines: Multi-Agent Orchestration for Claude Code

Superpipelines turns Claude Code from a chaotic generator into a disciplined engineering team. It enforces isolated code reviews, prevents infinite loops, guarantees persistent state across mid-session crashes, and removes the manual overhead of verifying every generated output.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/gustavo-meilus/superpipelines/actions/workflows/ci.yml/badge.svg)](https://github.com/gustavo-meilus/superpipelines/actions/workflows/ci.yml)
[![GitHub Stars](https://img.shields.io/github/stars/gustavo-meilus/superpipelines?style=social)](https://github.com/gustavo-meilus/superpipelines/stargazers)

[![Star History Chart](https://api.star-history.com/svg?repos=gustavo-meilus/superpipelines&type=Date)](https://star-history.com/#gustavo-meilus/superpipelines&Date)

---

## Quick Start

Step 1: Install

```bash
claude plugin install github:gustavo-meilus/superpipelines
```

Step 2: Create your first pipeline

```
/superpipelines:new-pipeline
```

Step 3: Run it

```
/superpipelines:run-pipeline
```

The system handles spec generation, agent coordination, state persistence, and crash recovery without requiring additional configuration.

---

## Architecture

<img src="https://mermaid.ink/img/Zmxvd2NoYXJ0IExSCiAgICBBKFtZb3VyIFRhc2tdKSAtLT4gQltERUNPTlNUUlVDVFxuNEQgSW50YWtlXQogICAgQiAtLT4gQ1tERVZFTE9QXG5BcmNoaXRlY3RdCiAgICBDIC0tPiBEe0hBUkQgR0FURVxuSHVtYW4gQXBwcm92YWx9CiAgICBEIC0tPiBFW0lNUExFTUVOVFxuV29ya2VyIEFnZW50c10KICAgIEUgLS0+IEZbU3BlYyBSZXZpZXdlclxuU3RhZ2UgMV0KICAgIEYgLS0+fFBhc3N8IEdbUXVhbGl0eSBBdWRpdFxuU3RhZ2UgMl0KICAgIEYgLS0+fEZhaWx8IEUKICAgIEcgLS0+fFBhc3N8IEgoW01FUkdFXG5JbnRlZ3JhdGlvbiBCcmFuY2hdKQogICAgRyAtLT58RmFpbHwgRQ==" alt="Superpipelines architecture: Your Task → DECONSTRUCT → DEVELOP → HARD GATE → IMPLEMENT → Spec Reviewer → Quality Audit → MERGE" />

By operating with `disallowedTools: Write, Edit, Bash`, the reviewer agent cannot rationalize its way into modifying code. The only outputs it can produce are a passing verdict or an explicit failure that halts the pipeline.

---

## Capabilities

Tasks decompose before execution into a precise specification and an itemized task list. This decomposition phase surfaces ambiguities and architectural gaps that would otherwise cause costly failures deep in the implementation cycle, especially when an agent encounters a constraint that never appeared in the initial intake. Reviewer agents cannot modify the code they validate.

Isolation sits at the permission layer, not at the convention level. This distinction matters because a model under conventional role guidance can rationalize a targeted edit when the fix appears trivial, but a model under hard permission constraints cannot generate write operations at all. And most teams hit this failure mode only after a reviewer patches the audited file. Pipeline state persists to scope-aware temporary directories throughout execution, and a mid-session crash does not discard completed work because execution resumes automatically from the last stable checkpoint without triggering a full restart. Hard-coded iteration caps prevent runaway repair cycles. Human gates enforce additional stops at high-stakes transitions, requiring explicit approval before the pipeline advances to irreversible phases and blocking model rationalization from overriding defined stopping conditions.

---

## Execution Workflow

Execution follows a nine-phase lifecycle, with mandatory validation between implementation and integration:

<!-- <workflow_matrix> -->
| Phase | Process Flow | Description |
| :--- | :--- | :--- |
| **1.&nbsp;DECONSTRUCT** | Intake&nbsp;→&nbsp;Gap&nbsp;Analysis | Identifies gaps and ambiguities through targeted intake, surfacing constraints before execution. |
| **2.&nbsp;DIAGNOSE** | Environment&nbsp;→&nbsp;Constraints | Surfaces environmental and architectural constraints before code generation. |
| **3.&nbsp;DEVELOP** | Architect&nbsp;→&nbsp;Spec/Plan/Tasks | `pipeline-architect` generates `spec.md`, `plan.md`, and `tasks.md`. |
| **4.&nbsp;HARD&nbsp;GATE** | Execution&nbsp;→&nbsp;Gate&nbsp;→&nbsp;Approval | Execution pauses for human review and approval of the specification. |
| **5.&nbsp;IMPLEMENT** | Tasks&nbsp;→&nbsp;Worker&nbsp;Agents | Worker agents execute tasks in isolated git worktrees. |
| **6.&nbsp;STAGE&nbsp;1** | Output&nbsp;→&nbsp;Spec&nbsp;Validator | `pipeline-spec-reviewer` validates output against the specification. |
| **7.&nbsp;STAGE&nbsp;2** | Stage&nbsp;1&nbsp;Pass&nbsp;→&nbsp;Quality&nbsp;Audit | `pipeline-quality-reviewer` performs a code quality audit (only after Stage 1 passes). |
| **8.&nbsp;COMMIT** | Passing&nbsp;Tasks&nbsp;→&nbsp;Integration | Passing tasks merge to the integration branch. |
| **9.&nbsp;DONE** | Cleanup&nbsp;→&nbsp;Summary | Temporary state is cleaned and a completion summary is surfaced. |
<!-- </workflow_matrix> -->

---

## Execution Patterns

The framework selects the optimal pattern based on task complexity:

<!-- <pattern_matrix> -->
| Pattern | Shape | Use Case |
| :--- | :--- | :--- |
| **1.&nbsp;Sequential** | A&nbsp;→&nbsp;B&nbsp;→&nbsp;C | Ordered phases with hard data dependencies. |
| **2.&nbsp;Parallel&nbsp;Fan-Out** | A&nbsp;→&nbsp;[B,&nbsp;C,&nbsp;D]&nbsp;→&nbsp;Merger | Independent branches that merge upon completion. |
| **3.&nbsp;Iterative&nbsp;Loop** | Implement&nbsp;→&nbsp;Test&nbsp;→&nbsp;Fix | Test-driven repair with a hard escalation cap of 3 iterations. |
| **4.&nbsp;Human-Gated** | Agent&nbsp;→&nbsp;Gate&nbsp;→&nbsp;Agent | High-stakes stages requiring manual approval. |
| **5.&nbsp;Spec-Driven&nbsp;Dev** | Spec&nbsp;→&nbsp;Tasks&nbsp;→&nbsp;2-Stage&nbsp;Review | Full SDD with worktrees per task. |
| **6.&nbsp;4D&nbsp;Wrapper** | 4D&nbsp;Intake&nbsp;→&nbsp;Pattern | Wraps any pattern with structured deconstruction. |
<!-- </pattern_matrix> -->

---

## Slash Commands

| Command | Function |
| :--- | :--- |
| `/superpipelines:new-pipeline` | Initiates 4D intake and generates pipeline artifacts. |
| `/superpipelines:run-pipeline` | Orchestrates an existing pipeline end-to-end. |
| `/superpipelines:new-step` | Adds a new step to an existing named pipeline. |
| `/superpipelines:update-step` | Modifies an existing step within a named pipeline. |
| `/superpipelines:delete-step` | Removes a step from a named pipeline with gap analysis. |
| `/superpipelines:audit-pipeline` | Audits agents and skills against the v2 compliance matrix. |

---

## Design Principles

Permission boundaries are enforced at the agent definition level, not by prompt instruction. But the constraint preventing reviewers from modifying code sits in the permission schema, not in a system prompt that a sufficiently confident model can talk itself around. Every agent declares a `permissionMode`, and bypassing it requires explicit documented justification.

Pipeline state persists to a deterministic path at `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json`. Resumption resets any in-progress phases to their initial state while preserving all completed work, which means a crashed session picks back up without re-running the intake or architecture phases that already passed validation. High-density reference documentation lives in companion `*-references/` directories and loads on demand. This strategy prevents token-heavy reference payloads from bloating the active session window during phases that do not need deep technical detail. Practitioners commonly underestimate how quickly context saturation degrades output quality on long pipelines. Keeping reference data out of the primary context until it is needed is one of the highest-return optimizations available without modifying the underlying model configuration.

---

## Repository Layout

<!-- <file_structure> -->
```
superpipelines/
├── .claude-plugin/           # Plugin manifest and marketplace data
├── agents/                   # Core agent definitions (Architect, Auditor, Executor, Reviewers)
├── skills/                   # Shared skills (State, Paths, Patterns, Worktree Safety)
│   ├── *-references/         # Deep reference libraries (on-demand loading)
├── commands/                 # Slash command wrappers
├── hooks/                    # SessionStart hooks for bootstrap injection
└── settings.json             # Global plugin configuration
```
<!-- </file_structure> -->

---

## Related Projects

The companion project [superpipelines-opencode](https://github.com/gustavo-meilus/superpipelines-opencode) contains the opencode implementation of the Superpipelines plugin, with alternative skill definitions, agent configurations, pipeline artifacts, and command wrappers adapted for the opencode environment.

## Contributing

Contributions are managed via issues and PRs at [gustavo-meilus/superpipelines](https://github.com/gustavo-meilus/superpipelines). Running `/superpipelines:audit-pipeline` before submission validates additions against the compliance matrix and surfaces violations before they reach review, which prevents the most common rejection causes from consuming maintainer time.

## License

MIT. See [LICENSE](./LICENSE).
