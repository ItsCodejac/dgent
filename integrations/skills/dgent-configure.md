---
name: dgent-configure
description: Configure dgent rules for a project. Use when setting up dgent, adjusting rules, or creating per-repo overrides.
trigger: "configure dgent", "dgent config", "setup dgent", "dgent rules", ".dgent.json"
---

# dgent configure

Set up or adjust dgent configuration for a project.

## Check current state

```bash
# Is dgent installed?
dgent --version 2>/dev/null || echo "dgent not installed — run: npm i -g dgent && dgent init"

# Current global config
dgent config list

# Check for repo overrides
cat .dgent.json 2>/dev/null || echo "No per-repo overrides"
```

## Common configurations

### Enable opt-in rules
```bash
dgent config set rules.strip-noise-comments true    # Remove restating comments
dgent config set rules.strip-obvious-docstrings true # Remove trivial docstrings
dgent config set rules.flag-log-bracketing true      # Flag narration logging
```

### Disable rules globally
```bash
dgent config set rules.flag-naming false        # Stop flagging naming patterns
dgent config set rules.strip-section-headers false  # Keep section headers
```

### Per-repo overrides
Create `.dgent.json` in the repo root:
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
dgent config set api-key <anthropic-api-key>
dgent config set ai.enabled true
dgent config set rules.rewrite-message true
```

### Preview changes
```bash
DGENT_DRY_RUN=1 git commit -m "test message"
```

## When to create .dgent.json

- The repo legitimately uses Service/Manager/Handler naming (disable flag-naming)
- The repo has meaningful section headers in small files (disable strip-section-headers)
- The team wants stricter rules than the global default (enable opt-in rules)
- A rule consistently false-positives in this specific codebase
