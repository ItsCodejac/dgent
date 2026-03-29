# dgent
### Architecture & Development Reference
`v0.4 — Internal`

---

## 1. Overview

dgent is a CLI tool that post-processes AI agent output — primarily git commits and code diffs — to strip the mechanical tells that agents introduce by default. It sits between your agent and your repository, running automatically via global git hooks.

The goal is not to disguise AI-assisted work philosophically. The goal is to remove the friction artifacts that agents add for no good reason: commit trailers, noise comments, over-verbose naming, unnecessary abstractions. Things that waste your time to manually fix after every session.

### Problem statement

Using an agent to speed up your workflow is standard practice. But agent output consistently introduces surface-layer tells that create a workflow tax:

- `Co-Authored-By` trailers stamped on every commit
- Noise comments narrating the obvious (`# increment counter by 1`)
- Section headers in 30-line files
- Generic naming: `DataProcessor`, `UserService`, `ConfigurationHandler`
- Over-defensive null checks on values that cannot be null
- Docstrings on 2-line utilities
- Emojis in commit messages, comments, and documentation
- AI vocabulary in commit messages (`enhance`, `streamline`, `comprehensive`, `implement X to Y`)
- Overlong identifier names (`processAndValidateUserInputData`)
- `console.log` bracketing every operation like a flight recorder
- Catch-and-rethrow blocks that add zero context

Fixing these manually costs time proportional to the time the agent saved. dgent automates the cleanup pass.

### Non-goals

- Making output indistinguishable from human-written code
- Rewriting logic or collapsing abstraction layers (this requires judgment)
- Linting or formatting (use your existing tools for that)
- Replacing your agent or interfering with its generation

---

## 2. Architecture

### High-level flow

dgent uses two hooks. Message transforms and diff transforms require different hooks — commit-msg only receives the message file path and cannot modify staged files.

| Stage | Hook | What happens |
|---|---|---|
| Agent output | — | Code diff or staged changes land in your working tree |
| `git commit` fires | `pre-commit` | dgent reads staged files, applies diff transforms, re-stages clean versions |
| Message written | `commit-msg` | dgent rewrites the message file: strips trailers, normalizes format |
| Rules engine | both hooks | Deterministic transforms run; flags written to log |
| AI skill (optional) | both hooks | Claude pass using bundled `skill.md`, runs only if API key configured |
| Clean commit lands | — | Rewritten message and cleaned files in the repo |

### Executable vs AI layer

The rules engine is deterministic and ships as a standalone TypeScript executable compiled via Bun. It handles everything that can be caught with pattern matching and heuristic line analysis. No network, no API key, no latency. Target: sub-100ms on any commit.

The AI skill layer is optional and additive. It handles cases that require reading intent: naming that is technically valid but off-idiom, commit messages that are grammatically fine but tonally wrong for the repo. It calls Claude with the bundled `skill.md` as the system prompt and the diff as user content.

If no API key is configured, the AI layer is skipped silently. The rules engine always runs.

### Error handling in hooks

dgent must never block a commit due to its own failure. If the rules engine crashes or the AI layer times out, dgent logs the error to `~/.local/share/dgent/logs/` and exits 0. The commit proceeds unmodified. This is non-negotiable — a hook that occasionally blocks commits will be uninstalled.

### Side effects and consent

When diff rules modify staged files, dgent is rewriting the working tree and re-staging. This requires explicit user consent.

On first run after `dgent init`, dgent explains what it will do and prompts for confirmation before applying any file transforms. Subsequent runs are silent unless `--verbose` is set. A `--dry-run` flag is available at any time to preview changes without applying anything.

### Partial staging

If a file has both staged and unstaged changes, dgent skips it entirely for diff transforms, flags it for manual review, and does not attempt to re-stage. Merging staged and unstaged content is too risky to automate. The message transforms in commit-msg are unaffected — they only touch the message file.

---

## 3. Hook Installation

### Conflict detection

`core.hooksPath` is a single value — setting it overwrites any existing hook directory. If the user has Husky, lefthook, or their own hooks configured, `dgent init` would silently break them. This is a launch blocker, not an open question.

`dgent init` behavior:

1. Check if `core.hooksPath` is already set
2. If set and not owned by dgent — abort, print the existing path, and explain how to manually chain
3. If set and owned by dgent — idempotent update
4. If not set — proceed with installation

Manual chaining instructions are printed on abort so the user can integrate dgent into their existing hook setup if they choose.

### Hook scripts

Both hooks are thin shell scripts that call the dgent binary and exit 0 on any dgent failure. The exit code of the commit is never determined by dgent's exit code.

```sh
#!/bin/sh
dgent hook pre-commit "$@" || true
```

```sh
#!/bin/sh
dgent hook commit-msg "$@" || true
```

---

## 4. Rules Engine

The rules engine applies ordered transforms split across two hook phases. Each rule is independent and toggleable. Phase 1 and 2 use heuristic line-level pattern matching — no AST parser required. Tree-sitter is deferred until a concrete rule genuinely requires parse trees.

### commit-msg rules (message transforms)

| Rule | Default | Description |
|---|---|---|
| `strip-trailers` | on | Removes `Co-Authored-By`, `Generated-By`, and similar AI attribution trailers |
| `strip-emojis` | on | Strips emoji characters from commit messages. Agents insert these reflexively — real commit messages almost never use them. |
| `flag-message-tone` | on | Flags commit messages using AI vocabulary: `enhance`, `streamline`, `comprehensive`, `utilize`, `implement X to Y`, `this commit`. Configurable word list. Warns only, does not rewrite. |
| `normalize-format` | on | Enforces conventional commit format if detected in repo history |
| `rewrite-message` | off | AI skill rewrites the message to match your historical commit voice (requires API key + commit history sample) |

### pre-commit rules (diff transforms)

| Rule | Default | Description |
|---|---|---|
| `strip-emoji-comments` | on | Strips emojis from code comments and docstrings. Agents scatter these through inline comments unprompted. |
| `strip-section-headers` | on | Removes divider comments (`# --- Init ---` style) in files under a configurable line threshold |
| `flag-naming` | on | Flags identifiers matching AI naming patterns (Manager, Handler, Processor suffix clusters) and overlong identifiers exceeding a configurable character threshold. Uses regex on declaration lines — no AST required. |
| `flag-catch-rethrow` | on | Flags catch blocks that only log and re-throw with zero added context: `catch (e) { console.error(e); throw e; }`. Pattern-matchable with low false-positive risk. |
| `strip-noise-comments` | off | Removes comments that restate the next line verbatim or near-verbatim. Opt-in — false positive rate requires corpus validation before default-on. |
| `strip-obvious-docstrings` | off | Removes docstrings on functions under a complexity threshold where the signature is self-documenting. Opt-in — same risk profile as strip-noise-comments. |
| `flag-log-bracketing` | off | Flags `console.log`/print statements that bracket operations with no purpose beyond narrating execution flow. Opt-in — needs corpus to distinguish narration from intentional logging. |
| `flag-over-defensive` | off | Flags null checks and try/catch wrapping provably safe code. Deferred — requires type information. |

### Flag vs fix

Rules either fix automatically or flag for review. Automatic fixes are applied silently after first-run consent. Flags are written to `~/.local/share/dgent/logs/` and printed as warnings after the commit. Flagged items never block the commit.

When in doubt, flag. Some of the agent's choices are load-bearing. Silent removal of code is always worse than a warning.

### Performance budget

The rules engine must complete in under 100ms on any normally-sized commit. This is a hard constraint — hooks that add noticeable latency get disabled. The Bun runtime startup plus heuristic line matching should be well within this budget. If profiling shows otherwise, the slow rule is made opt-in.

---

## 5. Testing Strategy

dgent's quality story is entirely fixture-based. There is no meaningful way to test a rules engine without a corpus of real inputs and expected outputs.

### Fixture structure

Each rule has its own fixture directory:

```
test/fixtures/
  strip-trailers/
    basic-claude-trailer.input.txt
    basic-claude-trailer.expected.txt
    multiple-trailers.input.txt
    multiple-trailers.expected.txt
  strip-noise-comments/
    obvious-restatement.input.ts
    obvious-restatement.expected.ts
    false-positive-replica.input.ts     ← cases that should NOT be stripped
    false-positive-replica.expected.ts  ← expected = input (no change)
  ...
```

### False positive fixtures

Every opt-in rule must have a suite of false positive fixtures — inputs that look like candidates but should not be modified. These are as important as the positive cases. `strip-noise-comments` in particular needs a large false positive suite before it earns opt-in status, let alone default-on.

### Running tests

```
dgent test                           # run all fixtures
dgent test --rule strip-trailers     # run fixtures for one rule
dgent test --update                  # overwrite expected files with current output (for intentional changes)
```

### Regression policy

No rule ships without fixtures covering its basic cases and at least three false positive cases. Any user-reported false positive becomes a fixture before the fix is merged.

---

## 6. AI Skill Layer

The AI skill is a bundled `skill.md` file that ships with the executable. When the AI layer is enabled, dgent calls Claude via the Anthropic API with the skill as the system prompt and the filtered diff as user content.

### What the skill handles

- Commit message rewriting to match the user's historical voice
- Naming suggestions for flagged identifiers
- Detecting inconsistent idioms across a diff (mixed `get_x` / `fetchX` patterns)

### Skill design principles

- **Conservative** — the skill instructs Claude to prefer flagging over fixing, and to never rewrite logic
- **Scoped** — the skill only sees the diff, not the full codebase, to keep token usage minimal
- **Structured output** — the skill returns JSON with a fixed schema so dgent can parse and apply results without parsing natural language
- **User-replaceable** — the bundled skill can be overridden with a custom `skill.md` at `~/.config/dgent/skill.md`
- **Model-agnostic** — the model is a config value, not hardcoded, so it can be updated without a release

### API key storage

```
dgent config set api-key <key>
```

Stored without third-party keychain libraries. On macOS, uses the `security` CLI that ships with the OS. On Linux, stored in an encrypted file at `~/.local/share/dgent/.key` with a user-owned key. The `keytar` dependency is not used — it has native compilation issues and is effectively unmaintained.

The AI layer is disabled entirely if no key is present.

---

## 7. Interactive TUI

dgent ships with an interactive terminal UI built with Ink (React for CLIs — the same library used by Claude Code).

> **Note:** Bun compile + Ink compatibility needs to be validated in a spike before Phase 3 begins. If `bun build --compile` has issues with React reconciliation, the fallback is plain ANSI escape sequences or `blessed`. Do not assume this works until it's been tested.

### `dgent review`

Opens after any commit that produced flags. Shows each flagged item with a before/after diff view. Actions per item: accept suggestion, reject, or permanently ignore this pattern. Runs on demand — not triggered automatically by the hook.

### `dgent config`

Full config editor. Toggle rules, set API key, manage skill override, preview what the current ruleset would do against the last commit.

---

## 8. CLI Reference

| Command | Description |
|---|---|
| `dgent init` | Install global git hooks. Detects conflicts and aborts if existing hooks found. Idempotent if already installed. |
| `dgent review` | Open TUI to review flags from the last commit. |
| `dgent run <file\|->` | Manual pass on a file or stdin diff. |
| `dgent run --dry-run <file\|->` | Preview what dgent would change without applying anything. |
| `dgent config` | Open interactive TUI config editor. |
| `dgent config set <k> <v>` | Set a config value non-interactively. |
| `dgent config list` | Print current config as key=value. |
| `dgent log` | Show flagged items from recent commits. |
| `dgent test` | Run fixture suite. |
| `dgent uninstall` | Remove global hooks and restore previous hooksPath if any. |
| `dgent update` | Self-update via Homebrew or direct download. |

### --dry-run

Available on the hook via env var: `DGENT_DRY_RUN=1 git commit -m "..."` runs the full hook pipeline and prints what would change without modifying any files or the message.

---

## 9. Distribution

### Homebrew (primary)

dgent ships as a standalone binary compiled by Bun and distributed via a personal Homebrew tap. No Node.js runtime required on the target machine.

```
brew tap <owner>/dgent
brew install dgent
```

### Direct download (fallback)

GitHub Releases publishes signed binaries for macOS arm64, macOS x86_64, and Linux x86_64. `dgent update` handles subsequent upgrades via the releases API.

---

## 10. Build & Tech Stack

| Component | Technology |
|---|---|
| Source language | TypeScript |
| Build / standalone binary | Bun (`bun build --compile`) |
| CLI structure | `commander` |
| Terminal UI | Ink — pending spike to confirm Bun compile compatibility |
| Git integration | `simple-git` |
| AI integration | `@anthropic-ai/sdk` |
| Config storage | JSON at `~/.config/dgent/config.json` |
| Secrets | macOS: `security` CLI / Linux: encrypted file, no `keytar` |
| AI skill | `skill.md` bundled at build time, overridable at runtime |
| Logs | `~/.local/share/dgent/logs/` |
| Distribution | Homebrew tap + GitHub Releases |
| CI | GitHub Actions — build, sign, publish on tag |

### Language support for diff rules

Phase 1 and 2 use heuristic line-level matching and work across any language without grammar dependencies. Tree-sitter is not on the roadmap until a concrete rule requires parse trees — regex on declaration lines covers `flag-naming` without it.

---

## 11. Config Reference

Config lives at `~/.config/dgent/config.json`. All values can also be set via `dgent config set`.

```json
{
  "rules": {
    "strip-trailers": true,
    "strip-emojis": true,
    "strip-emoji-comments": true,
    "strip-section-headers": true,
    "normalize-format": true,
    "flag-naming": true,
    "flag-message-tone": true,
    "flag-catch-rethrow": true,
    "strip-noise-comments": false,
    "strip-obvious-docstrings": false,
    "flag-log-bracketing": false,
    "flag-over-defensive": false,
    "rewrite-message": false
  },
  "ai": {
    "enabled": false,
    "model": "claude-sonnet-latest",
    "skill": "bundled"
  },
  "output": {
    "verbose": false,
    "log-dir": "~/.local/share/dgent/logs"
  }
}
```

---

## 12. Development Roadmap

### Phase 1 — Core (ship this)

Phase 1 only touches the commit message. No file modification, no re-staging, no partial staging risk. Safe to ship while hook conflict handling and diff transform consent are still being designed.

- TypeScript project scaffold with `commander`
- Bun compile to standalone binary
- `commit-msg` hook: `strip-trailers`, `strip-emojis`, and `flag-message-tone` rules with fixtures
- Hook conflict detection and abort in `dgent init`
- `--dry-run` flag
- Basic config (JSON read/write)
- Homebrew tap and GitHub Actions release pipeline
- `dgent init` / `uninstall`

### Phase 2 — Diff transforms

Diff transforms land here. Partial staging detection and first-run consent must be complete before any diff rule ships.

- `pre-commit` hook with partial staging detection
- First-run consent flow for file modification
- `strip-section-headers` rule with fixtures (default-on)
- `strip-emoji-comments` rule with fixtures (default-on)
- `flag-naming` rule with fixtures — regex on declaration lines, no AST, includes overlong identifier threshold
- `flag-catch-rethrow` rule with fixtures (default-on)
- `dgent run` for manual passes
- `dgent log`
- Fixture runner (`dgent test`)

### Phase 3 — Opt-in rules + AI layer

- Bun + Ink compatibility spike — must happen before any other Phase 3 TUI work
- `strip-noise-comments` rule (opt-in) — requires large false positive fixture suite before shipping
- `strip-obvious-docstrings` rule (opt-in) — same requirement
- `flag-log-bracketing` rule (opt-in) — needs corpus to distinguish narration from intentional logging
- Bundled `skill.md`
- `@anthropic-ai/sdk` integration
- API key storage without `keytar`
- `rewrite-message` rule
- Skill override support
- Ink TUI for `dgent review` and `dgent config` (if spike passes)

### Phase 4 — Polish

- Self-update via `dgent update`
- Linux binary support
- Per-repo rule overrides (`.dgent.json` in repo root)
- `flag-over-defensive` rule (requires type information — evaluate feasibility)

---

## 13. Open Questions

- **strip-noise-comments corpus** — needs real-world agent output samples to tune the heuristic and build the false positive suite. Needs a definition of "near-verbatim" before implementation starts.
- **Commit history sampling for rewrite-message** — pulling past commits from `git log` for voice matching raises potential exposure concerns for private repos. Needs a clear policy on what's sent to the API and whether it's opt-in per-repo.
- **Ink spike** — must happen at the start of Phase 3, not after other Phase 3 work is done. If it fails, the TUI fallback needs to be decided before the review UX is designed.
- **Hook chaining** — for users with existing hook setups (Husky, lefthook), the current behavior is detect-and-abort with manual instructions. A future version could support automatic chaining. Deferred but architecture should not preclude it.
- **Stale explanations rule** — comment mentions a specific value (number, name) that contradicts the adjacent code. Heuristic: extract literals from comment, check next N lines for contradictions. Good candidate for a future flag rule but needs careful design to avoid false positives on comments that reference values elsewhere in the file.
- **Signals dgent intentionally does not address** — some AI detection signals are behavioral (burst commit timing, large diffs touching unrelated files, stylometric uniformity across files) or require deep analysis (perplexity scoring, AST depth distributions, watermark detection). These are out of scope — dgent operates on individual commits at hook time, not on repository-wide behavioral patterns. Provenance-based detection (telemetry, Git AI attribution) is the opposite philosophy — dgent strips tells rather than tracking them.