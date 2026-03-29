```
  ┌─────────────────────────┐
  │  dgent  · strip the tells │
  └─────────────────────────┘
```

Post-process AI agent output to remove the mechanical tells that agents add to every commit. Runs automatically via git hooks — no workflow changes required.

## The problem

AI agents speed up your workflow, but their output has tells:

- `Co-Authored-By` trailers on every commit
- Emoji prefixes on commit messages
- Comments that restate the next line of code
- `DataProcessor`, `UserServiceHandler` naming
- Catch blocks that only log and re-throw
- Section header comments in 30-line files
- Words like "enhance", "streamline", "comprehensive"

Fixing these manually costs time proportional to the time the agent saved.

## Install

```sh
npm install -g dgent
dgent init
```

That's it. Every `git commit` now runs through dgent automatically.

## What it does

dgent installs two git hooks (`commit-msg` and `pre-commit`) that clean agent output before it lands in your repo.

### Commit message rules (always run)

| Rule | Default | What it does |
|---|---|---|
| `strip-trailers` | on | Removes `Co-Authored-By`, `Generated-By`, and AI attribution trailers |
| `strip-emojis` | on | Strips emoji characters from commit messages |
| `flag-message-tone` | on | Warns about AI vocabulary: "enhance", "streamline", "this commit" |
| `normalize-format` | on | Fixes conventional commit formatting (case, period, spacing) |
| `rewrite-message` | off | AI-powered rewrite to match your repo's commit voice (requires API key) |

### Code rules (run on staged files)

| Rule | Default | What it does |
|---|---|---|
| `strip-section-headers` | on | Removes `// --- Init ---` style divider comments in small files |
| `strip-emoji-comments` | on | Strips emojis from code comments |
| `flag-naming` | on | Flags `Manager`, `Handler`, `Processor` suffixes and overlong identifiers |
| `flag-catch-rethrow` | on | Flags catch blocks that only log and re-throw |
| `strip-noise-comments` | off | Removes comments that restate the next line |
| `strip-obvious-docstrings` | off | Removes docstrings on trivial self-documenting functions |
| `flag-log-bracketing` | off | Flags `console.log` pairs that narrate execution flow |

**Fix** rules modify code silently (after first-run consent). **Flag** rules warn without modifying.

## Commands

```sh
dgent init          # Install global git hooks
dgent uninstall     # Remove hooks
dgent config list   # Show current config
dgent config set <key> <value>   # Change a setting
dgent run <file>    # Manual pass on a file
dgent test          # Run fixture suite
dgent log           # Show recent flags
dgent update        # Self-update via npm
```

## Configuration

Global config lives at `~/.config/dgent/config.json`. Toggle any rule:

```sh
dgent config set rules.strip-noise-comments true    # Enable opt-in rule
dgent config set rules.flag-naming false             # Disable default rule
```

### Per-repo overrides

Drop a `.dgent.json` in your repo root to override rules for that project:

```json
{
  "rules": {
    "strip-noise-comments": true,
    "flag-naming": false
  }
}
```

## AI skill layer (optional)

dgent includes an optional AI layer that calls Claude for tasks that need judgment — like rewriting commit messages to match your repo's voice.

```sh
dgent config set api-key <your-anthropic-api-key>
dgent config set ai.enabled true
dgent config set rules.rewrite-message true
```

The API key is stored in your macOS Keychain (or `~/.local/share/dgent/.key` on Linux). You can also set `ANTHROPIC_API_KEY` as an environment variable.

The AI layer is entirely optional. Without it, dgent runs purely deterministic rules with zero latency.

## Safety

- dgent **never blocks a commit**. If it crashes, the commit proceeds unmodified.
- Files with mixed staged/unstaged changes are **skipped entirely** — dgent won't risk merging your working tree.
- First time dgent modifies staged files, it **asks for consent**. After that, it's silent.
- Use `DGENT_DRY_RUN=1 git commit -m "..."` to preview changes without applying.
- Use `dgent run --dry-run <file>` to test rules on any file.

## How it works

dgent installs into `git config --global core.hooksPath`. Two thin shell scripts call `dgent hook commit-msg` and `dgent hook pre-commit`, both with `|| true` so they never block.

The rules engine uses heuristic line-level pattern matching — no AST parser, no grammar dependencies. It works across any language and completes in under 100ms.

## License

MIT
