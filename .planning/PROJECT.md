# dgent

## What This Is

A CLI tool that post-processes AI agent output — git commits and code diffs — to strip the mechanical tells agents introduce by default. Runs automatically via global git hooks, applying deterministic pattern-matching rules and an optional AI layer to clean commit messages and staged files before they land in the repo.

## Core Value

Every agent commit that lands should look like it was written by a developer who knows the codebase, not by a tool following a template. dgent removes the friction artifacts so you stop spending time manually fixing agent output.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] `commit-msg` hook strips Co-Authored-By/Generated-By trailers
- [ ] `commit-msg` hook strips emojis from commit messages
- [ ] `commit-msg` hook flags AI vocabulary in commit messages (enhance, streamline, comprehensive, etc.)
- [ ] `commit-msg` hook normalizes format to conventional commits if repo uses them
- [ ] `pre-commit` hook strips emojis from code comments
- [ ] `pre-commit` hook strips section header comments in small files
- [ ] `pre-commit` hook flags AI naming patterns and overlong identifiers
- [ ] `pre-commit` hook flags catch-and-rethrow blocks with zero added context
- [ ] `pre-commit` hook strips noise comments that restate the next line (opt-in)
- [ ] `pre-commit` hook strips obvious docstrings on trivial functions (opt-in)
- [ ] `pre-commit` hook flags console.log bracketing operations (opt-in)
- [ ] `pre-commit` hook flags over-defensive null checks (deferred — needs type info)
- [ ] Partial staging detection — skip files with mixed staged/unstaged changes
- [ ] First-run consent flow before any file modification
- [ ] Hook conflict detection — abort if existing hooksPath not owned by dgent
- [ ] `dgent init` / `dgent uninstall` for hook lifecycle
- [ ] `--dry-run` flag and `DGENT_DRY_RUN=1` env var
- [ ] `dgent run <file|->` for manual passes
- [ ] `dgent log` to show flagged items from recent commits
- [ ] `dgent config` / `dgent config set` / `dgent config list`
- [ ] `dgent test` fixture runner with `--rule` and `--update` flags
- [ ] Fixture-based test suite with false positive cases for every rule
- [ ] Optional AI skill layer via bundled `skill.md` and Anthropic API
- [ ] `rewrite-message` rule using AI to match historical commit voice (opt-in)
- [ ] Skill override via `~/.config/dgent/skill.md`
- [ ] API key storage via macOS `security` CLI / Linux encrypted file
- [ ] Interactive TUI for `dgent review` (flag review) and `dgent config` (editor)
- [ ] Self-update via `dgent update`
- [ ] Per-repo rule overrides via `.dgent.json`

### Out of Scope

- Making output indistinguishable from human-written code — not the goal, removing friction artifacts is
- Rewriting logic or collapsing abstraction layers — requires judgment, not automation
- Linting or formatting — use existing tools
- Replacing or interfering with the agent during generation — dgent is post-processing only
- Windows support — hook mechanism and secret storage are platform-specific, not worth the surface area
- AST parsing via tree-sitter — deferred until a concrete rule genuinely requires parse trees
- Behavioral detection signals (burst commit timing, stylometric analysis, perplexity scoring) — dgent operates on individual commits, not repository-wide patterns
- Provenance tracking / watermark detection — opposite philosophy, dgent strips tells rather than tracking them

## Context

- Architecture is documented in `ARCHITECTURE.md` (v0.4) — covers hook flow, rules engine, AI skill layer, testing strategy, and 4-phase roadmap
- Original problem catalog in `ai_code_tells.html` — comprehensive taxonomy of AI code tells across structure, naming, comments, logic, error handling, and meta-patterns
- Research on AI code detection tools informed rule coverage — compared against GPTZero, Copilot detection, SonarQube, Coderbuds, Pangram Labs, and academic literature
- Rules engine must complete in under 100ms — hard performance constraint
- Hook must never block a commit on its own failure — exits 0 on any error
- Flag vs fix distinction is critical — when in doubt, flag rather than silently remove

## Constraints

- **Runtime**: Node.js required on target machine (npm global install)
- **Distribution**: npm package, no standalone binary compilation
- **Performance**: Rules engine under 100ms per commit
- **Safety**: Hooks exit 0 on any dgent failure — never block a commit
- **Secrets**: No `keytar` — macOS `security` CLI, Linux encrypted file

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| npm global install over Bun compile + Homebrew | Simpler build pipeline, no binary signing, users have Node | — Pending |
| Two hooks (pre-commit + commit-msg) not one | commit-msg can't modify staged files, pre-commit can't modify message file | — Pending |
| Heuristic line matching over AST parsing | Covers majority of cases, ships fast, no grammar dependencies | — Pending |
| strip-noise-comments as opt-in not default | False positive rate too high without corpus validation | — Pending |
| Flag vs fix as core design principle | Silent code removal is worse than a warning | — Pending |
| No keytar dependency | Unmaintained, native compilation issues | — Pending |

---
*Last updated: 2026-03-28 after initialization*
