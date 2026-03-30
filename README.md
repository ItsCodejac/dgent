# jent

> **jent** (de-agent) — de-agent your code

**De-agent your code.**

[![npm](https://img.shields.io/npm/v/@itscojac/dgent)](https://www.npmjs.com/package/@itscojac/dgent) [![license](https://img.shields.io/npm/l/@itscojac/dgent)](LICENSE) [![node](https://img.shields.io/node/v/@itscojac/dgent)](package.json)

Your code just needs to be de-agented. jent runs automatically via git hooks — cleaning commit messages and code before they land in your repo. No workflow changes required.

> **Alpha (v0.1.0)** — Actively developed. Core rules and hooks are stable. AI features, TUI, and some opt-in rules are still being refined. [Report issues](https://github.com/ItsCodejac/dgent/issues).
>
> **Platforms:** macOS, Linux, Windows (requires [Git for Windows](https://gitforwindows.org/)).

## The problem

AI agents speed up your workflow, but their output has tells (mechanical patterns that agents add to code and commit messages):

- `Co-Authored-By` trailers on every commit
- Emoji prefixes on commit messages
- Comments that restate the next line of code
- `DataProcessor`, `UserServiceHandler` naming
- Catch blocks that only log and re-throw
- Section header comments in small files
- Words like "enhance", "streamline", "comprehensive"

### Before jent

```
✨ Implement caching to enhance performance

This commit adds Redis caching for API responses
to streamline the data fetching process.

Co-Authored-By: Claude <noreply@anthropic.com>
```

### After jent

```diff
- ✨ Implement caching to enhance performance
+ Implement caching to enhance performance

  This commit adds Redis caching for API responses
  to streamline the data fetching process.

- Co-Authored-By: Claude <noreply@anthropic.com>
```

```
jent  2 fixes applied, 3 flags
  ✓ strip-emojis
  ✓ strip-trailers
  ! line 1: AI vocabulary: "enhance"
  ! line 3: AI phrase: "this commit"
  ! line 4: AI vocabulary: "streamline"
```

**Fixes** (emoji, trailers, formatting) are automatic. **Flags** (vocabulary, naming) print as warnings — you decide what to change.

## Install

```sh
npm install -g jent
jent init
```

That's it. Every `git commit` now runs through jent automatically.

## What it does

jent installs two git hooks (`commit-msg` and `pre-commit`) that clean agent output before it lands in your repo.

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
jent init                  # Install global hooks (prompts for confirmation)
jent init -y               # Install without confirmation
jent uninstall             # Remove hooks, restore hooksPath
jent scan [dir]            # Scan directory for tells
jent scan --fix [dir]      # Scan and auto-fix
jent scan --json [dir]     # Structured output for CI
jent run <file>            # Check a single file
jent run --fix <file>      # Fix a file in place
jent run --check <file>    # Silent — exit 0 clean/fixed, 1 flags
jent run --json <file>     # Structured output for agents
jent fix <file>            # AI-powered fix (requires API key)
jent rules                 # List all rules with patterns
jent rules --json          # Machine-readable rule catalog
jent config                # Interactive config editor (TUI)
jent config list           # Print all config values
jent config set <k> <v>    # Set a config value
jent review                # Review flags from last commit (TUI)
jent stats                 # Flag trends and breakdown
jent log                   # Flag history
jent doctor                # Check setup and diagnose issues
jent integrate             # Install agent skills (Claude Code, OpenClaw)
jent rage                  # Debug info for bug reports
jent update                # Self-update via npm
```

Try it without installing: `npx jent run --json <file>`

## Configuration

Global config lives at `~/.config/jent/config.json`. Toggle any rule:

```sh
jent config set rules.strip-noise-comments true    # Enable opt-in rule
jent config set rules.flag-naming false             # Disable default rule
```

### Per-repo overrides

Drop a `.jent.json` in your repo root to override rules for that project:

```json
{
  "rules": {
    "strip-noise-comments": true,
    "flag-naming": false
  }
}
```

Nested `.jent.json` files (e.g., in monorepo packages) are not yet supported.

## AI skill layer (optional)

jent includes an optional AI layer that calls Claude for tasks that need judgment.

```sh
jent config set api-key <your-anthropic-api-key>
jent config set ai.enabled true
```

### Manual AI fix

```sh
jent fix src/file.ts              # Fix flagged code issues
jent fix --commit-msg message.txt # Fix flagged commit message
jent fix --dry-run src/file.ts    # Preview without applying
```

### Automatic AI fix on every commit

```sh
jent config set ai.autofix true
```

With autofix enabled, the hooks automatically call Claude to resolve flags during commit — renaming `DataProcessor` to something specific, removing empty catch-rethrow blocks, cleaning AI vocabulary from messages. If the AI can't fix it or the call fails, flags print as warnings instead.

### Commit message rewriting

```sh
jent config set rules.rewrite-message true
```

Rewrites commit messages to match your repo's historical voice (pulls last 10 messages from `git log` for style matching).

The API key is stored in your macOS Keychain (or `~/.local/share/jent/.key` on Linux). You can also set `ANTHROPIC_API_KEY` as an environment variable.

Override the bundled AI skill prompt by placing a custom file at `~/.config/jent/skill.md`.

The AI layer is entirely optional. Without it, jent runs purely deterministic rules with zero latency.

## Inline ignores

Suppress specific flags with comments:

```ts
// jent-ignore flag-naming
class DataProcessor { ... }           // ← not flagged

class UserServiceHandler { ... }      // ← still flagged

const x = getValue(); // jent-ignore // ← ignore all rules on this line
```

Supports `// jent-ignore`, `// jent-ignore-next-line`, `// jent-ignore <rule> <rule>`, and `#` for Python/shell.

## CI integration

Copy the workflow template to your repo:

```sh
cp node_modules/jent/integrations/ci/jent.yml .github/workflows/
```

Scans PR diffs for tells and posts results as a comment. Optionally make it a required check to block merge.

## Safety

- jent **never blocks a commit**. If it crashes, the commit proceeds unmodified.
- Files with mixed staged/unstaged changes are **skipped entirely** — jent won't risk merging your working tree.
- First time jent modifies staged files, it **asks for consent**. After that, it's silent.
- Use `JENT_DRY_RUN=1 git commit -m "..."` to preview changes without applying.
- Use `jent run --dry-run <file>` to test rules on any file.
- Note: Git GUIs (VS Code, GitKraken, Tower) may not display jent's terminal output. Use `jent log` or `jent review` to see what jent cleaned on your last commit.

## Agent integrations

jent works with AI coding agents — not just on their output, but as a tool they can use.

### Claude Code / Codex

```sh
jent integrate
```

This installs skills to `~/.claude/skills/jent/` and prints instructions for adding jent context to your `CLAUDE.md`. After setup, the agent can:

- Run `jent run --json <file>` to check files for tells before committing
- Understand which patterns to avoid (naming, catch-rethrow, etc.)
- Configure rules per-repo via `.jent.json`

### JSON output for CI/agents

```sh
jent run --json src/file.ts
```

Returns structured JSON with fixes, flags, and cleaned output. Exit codes: `0` = clean or fixes applied (success), `1` = flags found (needs attention).

### LLM-readable docs

The package ships with `llms.txt` — a single-file reference any agent can consume for full rule documentation, config options, and troubleshooting.

## How it works

jent installs into `git config --global core.hooksPath`. Two thin shell scripts call `jent hook commit-msg` and `jent hook pre-commit`, both with `|| true` so they never block.

The rules engine uses heuristic line-level pattern matching — no AST parser, no grammar dependencies. It works across any language and completes in under 100ms.

## License

MIT
