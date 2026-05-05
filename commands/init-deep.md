---
description: Initiates a repository traversal to create localized PIPELINE-CONTEXT.md hierarchical context files.
argument-hint: [optional sub-directory path, defaults to root]
---

# Init Deep — Command Reference

> Initiates a repository traversal to generate hierarchical context maps (`PIPELINE-CONTEXT.md`) across significant directories. Provides agents with token-efficient, localized architectural knowledge.

<args>
- **$ARGUMENTS**: Optional path to a specific subdirectory to scope the traversal. Defaults to the repository root.
</args>

<protocol>
### 1. PREFLIGHT
- **Git Check**: Verify workspace for `.git`. Do not generate context maps in untracked repositories to prevent clutter.
- **Path Resolution**: Resolve the starting directory. If `$ARGUMENTS` is provided, verify the path exists.

### 2. TRAVERSAL & GENERATION
- Invoke the `sk-hierarchical-context` skill to crawl the specified directory tree.
- Identify architectural boundaries and generate `PIPELINE-CONTEXT.md` files in each significant folder.
- Ensure the root folder receives a master `PIPELINE-CONTEXT.md` that maps out the subdirectory contexts.

### 3. VERIFICATION
- Verify that ignored directories (`node_modules`, `.git`, etc.) were successfully skipped.
- Perform a sanity check on the generated root context map to ensure it correctly identifies the project structure.

### 4. DELIVERY
- Surface a summary of the generated files to the user.
- Add the new context files to the git staging area (optional, prompt the user).
</protocol>

<invariants>
- NEVER overwrite existing `PIPELINE-CONTEXT.md` files without first reading them and merging new insights.
- ALWAYS skip hidden directories and files defined in `.gitignore`.
- ALWAYS enforce Scribius formatting (XML envelopes, H1-first) on generated context files.
</invariants>
