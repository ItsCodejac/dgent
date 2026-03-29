---
name: jent-configure
description: Configure jent rules for a project. Use when setting up jent, adjusting rules, or creating per-repo overrides.
trigger: "configure jent", "jent config", "setup jent", "jent rules", ".jent.json"
---

# jent configure

Set up or adjust jent configuration for a project.

## Check current state

```bash
# Is jent installed?
jent --version 2>/dev/null || echo "jent not installed — run: npm i -g jent && jent init"

# Current global config
jent config list

# Check for repo overrides
cat .jent.json 2>/dev/null || echo "No per-repo overrides"
```

## Common configurations

### Enable opt-in rules
```bash
jent config set rules.strip-noise-comments true    # Remove restating comments
jent config set rules.strip-obvious-docstrings true # Remove trivial docstrings
jent config set rules.flag-log-bracketing true      # Flag narration logging
```

### Disable rules globally
```bash
jent config set rules.flag-naming false        # Stop flagging naming patterns
jent config set rules.strip-section-headers false  # Keep section headers
```

### Per-repo overrides
Create `.jent.json` in the repo root:
```json
{
  "rules": {
    "strip-noise-comments": true,
    "flag-naming": false
  }
}
```

Only the `rules` section is overridable per-repo. Repo config merges on top of global.

### Enable AI layer
```bash
jent config set api-key <anthropic-api-key>
jent config set ai.enabled true
jent config set rules.rewrite-message true
```

### Preview changes
```bash
JENT_DRY_RUN=1 git commit -m "test message"
```

## When to create .jent.json

- The repo legitimately uses Service/Manager/Handler naming (disable flag-naming)
- The repo has meaningful section headers in small files (disable strip-section-headers)
- The team wants stricter rules than the global default (enable opt-in rules)
- A rule consistently false-positives in this specific codebase
