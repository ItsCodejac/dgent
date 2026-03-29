```
  dgent · de-agent your code
```

Your code just needs to be de-agented. dgent runs automatically via git hooks — cleaning commit messages and code before they land in your repo. No workflow changes required.

## The problem

AI agents speed up your workflow, but their output has tells:

- `Co-Authored-By` trailers on every commit
- Emoji prefixes on commit messages
- Comments that restate the next line of code
- `DataProcessor`, `UserServiceHandler` naming
- Catch blocks that only log and re-throw
- Section header comments in 30-line files
- Words like "enhance", "streamline", "comprehensive"

### Before dgent

```
✨ Implement caching to enhance performance

This commit adds Redis caching for API responses
to streamline the data fetching process.

Co-Authored-By: Claude <noreply@anthropic.com>
```

### After dgent

```
Implement caching to enhance performance     ← emoji stripped
                                              ← trailer removed
This commit adds Redis caching for API        ← "enhance" flagged
responses to streamline the data fetching     ← "this commit" flagged
process.                                      ← "streamline" flagged
```

Fixes are automatic. Flags print as warnings so you can decide.

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
dgent init              # Install global git hooks
dgent uninstall         # Remove hooks
dgent scan [dir]        # Scan entire directory for tells
dgent scan --fix        # Scan and auto-fix
dgent run <file>        # Check a single file
dgent run --fix <file>  # Fix a file in place
dgent run --json <file> # Structured output for agents/CI
dgent fix <file>        # AI-powered fix for flags (requires API key)
dgent fix --commit-msg  # AI-powered commit message cleanup
dgent config list       # Show current config
dgent config set <k> <v>  # Change a setting
dgent config            # Interactive config editor (TUI)
dgent review            # Interactive flag review (TUI)
dgent stats             # Flag trends and breakdown
dgent log               # Raw flag history
dgent doctor            # Check setup and common issues
dgent integrate         # Install Claude Code skills
dgent rage              # Print debug info for bug reports
dgent test              # Run fixture suite
dgent update            # Self-update via npm
```

Try it without installing: `npx dgent run --json <file>`

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

dgent includes an optional AI layer that calls Claude for tasks that need judgment.

```sh
dgent config set api-key <your-anthropic-api-key>
dgent config set ai.enabled true
```

### Manual AI fix

```sh
dgent fix src/file.ts              # Fix flagged code issues
dgent fix --commit-msg message.txt # Fix flagged commit message
dgent fix --dry-run src/file.ts    # Preview without applying
```

### Automatic AI fix on every commit

```sh
dgent config set ai.autofix true
```

With autofix enabled, the hooks automatically call Claude to resolve flags during commit — renaming `DataProcessor` to something specific, removing empty catch-rethrow blocks, cleaning AI vocabulary from messages. If the AI can't fix it or the call fails, flags print as warnings instead.

### Commit message rewriting

```sh
dgent config set rules.rewrite-message true
```

Rewrites commit messages to match your repo's historical voice (pulls last 10 messages from `git log` for style matching).

The API key is stored in your macOS Keychain (or `~/.local/share/dgent/.key` on Linux). You can also set `ANTHROPIC_API_KEY` as an environment variable.

The AI layer is entirely optional. Without it, dgent runs purely deterministic rules with zero latency.

## Inline ignores

Suppress specific flags with comments:

```ts
// dgent-ignore flag-naming
class DataProcessor { ... }           // ← not flagged

class UserServiceHandler { ... }      // ← still flagged

const x = getValue(); // dgent-ignore // ← ignore all rules on this line
```

Supports `// dgent-ignore`, `// dgent-ignore-next-line`, `// dgent-ignore <rule> <rule>`, and `#` for Python/shell.

## CI integration

Copy the workflow template to your repo:

```sh
cp node_modules/dgent/integrations/ci/dgent.yml .github/workflows/
```

Scans PR diffs for tells and posts results as a comment. Optionally make it a required check to block merge.

## Safety

- dgent **never blocks a commit**. If it crashes, the commit proceeds unmodified.
- Files with mixed staged/unstaged changes are **skipped entirely** — dgent won't risk merging your working tree.
- First time dgent modifies staged files, it **asks for consent**. After that, it's silent.
- Use `DGENT_DRY_RUN=1 git commit -m "..."` to preview changes without applying.
- Use `dgent run --dry-run <file>` to test rules on any file.

## Agent integrations

dgent works with AI coding agents — not just on their output, but as a tool they can use.

### Claude Code / Codex

```sh
dgent integrate
```

This installs skills to `~/.claude/skills/dgent/` and prints instructions for adding dgent context to your `CLAUDE.md`. After setup, the agent can:

- Run `dgent run --json <file>` to check files for tells before committing
- Understand which patterns to avoid (naming, catch-rethrow, etc.)
- Configure rules per-repo via `.dgent.json`

### JSON output for CI/agents

```sh
dgent run --json src/file.ts
```

Returns structured JSON with fixes, flags, and cleaned output. Exit codes: `0` = clean, `1` = flags found, `2` = fixes applied.

### LLM-readable docs

The package ships with `llms.txt` — a single-file reference any agent can consume for full rule documentation, config options, and troubleshooting.

## How it works

dgent installs into `git config --global core.hooksPath`. Two thin shell scripts call `dgent hook commit-msg` and `dgent hook pre-commit`, both with `|| true` so they never block.

The rules engine uses heuristic line-level pattern matching — no AST parser, no grammar dependencies. It works across any language and completes in under 100ms.

## License

MIT
