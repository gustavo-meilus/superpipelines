---
name: sk-claude-code-conventions
description: Use when authoring or modifying agents, skills, hooks, or pipeline orchestration — covers Claude 4.6 model selection, adaptive thinking, prompt-cache discipline, frontmatter schemas, and progressive disclosure rules. Reference-only; preload via agent skills frontmatter.
disable-model-invocation: true
user-invocable: false
---

# Claude Code Conventions (Claude 4.6 / 4.7) — Reference

Canonical reference for current Anthropic best practices when authoring agents, skills, and orchestration pipelines. Updated 2026-05.

Compatibility: Claude Sonnet 4.6, Opus 4.6, Haiku 4.5, Opus 4.7. Agent Skills Open Standard.

---

## 1. Model selection

| Tier | Model ID | Use for |
|------|----------|---------|
| Workhorse | `claude-sonnet-4-6` | Default for pipelines, agents, skills. Scale effort, not model. |
| Deep reasoning | `claude-opus-4-7` | Interactive architect/auditor work on explicit user upgrade. |
| Triage / batch | `claude-haiku-4-5-20251001` | High-volume, low-latency, simple classification. |

Pipelines: **`MODEL_SELECTION: SONNET_ONLY`**. Scale reasoning via `effort:` only.

---

## 2. Adaptive thinking

Claude 4.6+ uses `thinking: {type: "adaptive"}` — model decides when and how much to reason based on `effort` and query complexity.

Defaults:

- Architect / auditor agents: `effort: high`
- Worker agents: `effort: medium`
- Triage agents: `effort: low`

`max_tokens`: 64k for autonomous multi-step agents at medium+ effort.

In skills: include `ultrathink` anywhere in the SKILL.md body to enable extended thinking when that skill is active.

---

## 3. Prompt caching discipline

Low cache-hit rate triggers production alerts. Optimize for cache hits.

- **Static first, dynamic last.** System prompt → skills → tools → conversation history.
- **Never mutate tool set mid-session.** Adding/removing a tool invalidates the entire prefix.
- **Never mutate skills list mid-session.** Same invalidation.
- **No dynamic timestamps in static system prompts.**
- Up to 4 `cache_control` breakpoints. Place the LAST on the last block that stays identical across requests.

TTL strategy:

- 5-min TTL (default) for active interactive sessions.
- 1-hour TTL for agentic loops where gaps between API calls can exceed 5 min.
- Ordering: 1-hour entries MUST appear BEFORE 5-minute entries in a single request.

Anti-patterns:

- `defer_loading` for managing large tool sets — use ToolSearch-style discovery, not tool churn.
- Mode-switching via tool-set mutation — use `EnterPlanMode` / `ExitPlanMode` style tools instead.

---

## 4. Memory

Claude 4.6 can persist facts to local files. In pipelines:

- `autoMemoryEnabled: false` (or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`) reclaims 658+ tokens per call.
- Prefer `references/*.md` over the memory tool for deterministic rules; use memory only for learned heuristics.
- **Never** use `memory: project` in agent frontmatter — project memory is forbidden. `memory: local` is allowed for agents that persist learned heuristics.
- All pipeline state goes to `<scope-root>/superpipelines/temp/{P}/{runId}/pipeline-state.json` (see `sk-pipeline-state`).

---

## 5. Skill frontmatter schema

```yaml
---
name: {lowercase-hyphens, ≤64 chars}
description: {≤1024 chars, third person, triggering conditions only}
when_to_use: {optional, extends description, counts toward 1536-char cap}
argument-hint: {e.g. "[issue-number]"}
disable-model-invocation: {true | false, default false}
user-invocable: {true | false, default true}
allowed-tools: {space-separated or YAML list — tools allowed without prompt}
model: {optional override, rarely used in pipelines}
effort: {low | medium | high | xhigh | max}
context: {fork = run in forked subagent}
agent: {subagent type when context: fork}
hooks: {lifecycle hooks}
paths: {glob patterns; activates only when matching files in context}
shell: {bash | powershell}
---
```

Skill file layout:

```
skill-name/
├── SKILL.md              # ≤500 lines. Overview + navigation
├── reference.md          # Loaded when needed
├── examples.md           # Loaded when needed
├── references/           # One level deep, descriptive names
│   ├── domain-a.md
│   └── domain-b.md
└── scripts/
    └── helper.py         # Executed, not loaded
```

Rules:

- SKILL.md body ≤500 lines.
- References one level deep from SKILL.md. Nested references cause partial reads.
- Reference files >100 lines must include a Table of Contents at the top.
- Metadata pre-loaded (~100 tokens per skill in system context).
- Body loaded only when skill is invoked/matched.
- References loaded only when the skill instructs Claude to read them.

Description rules:

- Third person ONLY ("Processes X…", NOT "I can…" or "You can…").
- Triggering conditions only — never summarize the workflow (Claude uses description as a shortcut and skips the body).
- Front-load the key use case (truncation at 1536 chars).
- Include trigger keywords users would naturally say.

---

## 6. Subagent frontmatter schema

```yaml
---
name: {string identifier}
description: {action-oriented routing trigger, third person, triggering conditions only}
tools: {Tool1, Tool2 — whitelist when tight control needed; omit to inherit}
disallowedTools: {Write, Edit — explicit deny}
model: sonnet
effort: {low | medium | high | xhigh | max}
maxTurns: {integer, bounds execution}
version: "1.0"
skills: [sk-4d-method, sk-spec-driven-development, sk-claude-code-conventions]
mcpServers: [server-name]
background: {boolean}
isolation: worktree
hooks: {PreToolUse, PostToolUse, …}
---
```

Rules:

- Description is the routing contract.
- One clear goal, one input shape, one output shape, one handoff rule.
- Tool whitelist for tight control; omit to inherit thread tools.
- `skills:` preload = FULL content injected at subagent startup (not metadata-only). Use ONLY for shared `sk-*` method skills.
- Body ≤150 lines. Depth lives in companion `<agent>-references/references/*.md`.

---

## 7. Skill–subagent pairing patterns

| Pattern | Usage |
|---------|-------|
| **A. Skill in forked subagent** | `context: fork` + `agent: Explore` — SKILL.md becomes the subagent's prompt. For isolated research with no conversation history. |
| **B. Subagent preloads shared method skills** | Subagent frontmatter `skills: [sk-4d-method, sk-spec-driven-development]`. Method skills inject at startup; agent body focuses on its role. |
| **C. Agent + companion reference skill** | Agent body ≤150 lines. Companion skill `<agent>-references/` with `references/*.md` files agent reads on demand. **No SKILL.md** in companion dir. |

Anti-patterns:

- Preloading companion-reference skills via `skills:` — bloats context.
- Preloading large workflow skills (`brainstorming`, `creating-a-pipeline`) — they're designed for lazy session-level invocation.

---

## 8. Progressive disclosure checklist

- [ ] SKILL.md body ≤500 lines
- [ ] References one level deep from SKILL.md
- [ ] Long references have a ToC
- [ ] Description third person, triggering-only
- [ ] Consistent terminology throughout
- [ ] No time-sensitive info in static prefix
- [ ] Examples concrete, not abstract
- [ ] Workflow steps clear and numbered
- [ ] Feedback loops for quality-critical tasks
- [ ] Tested on Sonnet (and Haiku if deployed there) before shipping

---

## 9. Path variables

| Variable | Resolution | Use for |
|----------|-----------|---------|
| `${CLAUDE_PLUGIN_ROOT}` | Plugin install dir (changes on update) | Scripts, references, binaries bundled with plugin |
| `${CLAUDE_PLUGIN_DATA}` | `~/.claude/plugins/data/{plugin-id}/` (persists across updates) | Installed deps, caches, persistent state |
| `${user_config.KEY}` | User-provided config from `userConfig` manifest field | API keys, endpoints |

Never use `~/.claude/...` for plugin-relative paths — always use `${CLAUDE_PLUGIN_ROOT}`.

## Cross-references

- `sk-pipeline-state`, `sk-pipeline-paths` — state management and path resolution.
- `sk-4d-method`, `sk-spec-driven-development`, `sk-pipeline-patterns`.
- Anthropic docs: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview, https://code.claude.com/docs/en/skills, https://code.claude.com/docs/en/sub-agents.
