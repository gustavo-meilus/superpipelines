# Model Catalog — Static Fallback

> Curated list of Claude models. Used as a fallback when live discovery fails. Custom provider models (OpenCode Go, OpenCode Zen, Bedrock, custom gateways, etc.) are discovered dynamically from user configuration at runtime. Last updated: 2026-05-11.

## Claude Models

| Model ID | Display Name |
|----------|-------------|
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-opus-4-7` | Claude Opus 4.7 |
| `claude-opus-4-6` | Claude Opus 4.6 |
| `claude-haiku-4-5-20251001` | Claude Haiku 4.5 |

## Model Aliases

Common aliases and their canonical model IDs:

| Alias | Canonical Match |
|-------|----------------|
| `sonnet` | `claude-sonnet-4-6` |
| `opus` | `claude-opus-4-7` |
| `haiku` | `claude-haiku-4-5-20251001` |
| `claude-sonnet-4-6[1m]` | Extended 1M context variant |
| `claude-opus-4-7[1m]` | Extended 1M context variant |

## Custom Models

Models from custom providers (Bedrock, Vertex, Foundry, custom gateways, and any other configured provider) are discovered at runtime from the user's Claude Code configuration during Phase 1 of the change-models workflow. No custom provider models are hardcoded in this static catalog.

## Fuzzy Match Reference

Common user inputs and their canonical model IDs:

| User Input | Canonical Match |
|-----------|----------------|
| "sonnet" / "claude sonnet" | `claude-sonnet-4-6` |
| "haiku" / "claude haiku" | `claude-haiku-4-5-20251001` |
| "opus" / "claude opus" | `claude-opus-4-7` |
