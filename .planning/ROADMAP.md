# Roadmap: dgent

## Overview

dgent goes from empty directory to a fully-featured CLI tool that strips AI tells from agent output. The journey starts with a working npm package and commit-message rules, expands to file-level transforms, adds an optional AI layer, and finishes with a TUI and polish. Each phase delivers a usable increment — Phase 3 is the first point where dgent is installable and useful on real commits.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** — npm package scaffold, commander CLI skeleton, config system
- [x] **Phase 2: Message Rules** — commit-msg rule implementations with fixture-based testing
- [ ] **Phase 3: Hook Lifecycle** — dgent init/uninstall, conflict detection, hook scripts, --dry-run
- [ ] **Phase 4: Diff Transforms** — pre-commit hook with partial staging, consent flow, all default-on diff rules
- [ ] **Phase 5: AI Skill Layer** — Anthropic SDK, secure key storage, skill.md, rewrite-message, opt-in rules
- [ ] **Phase 6: TUI + Polish** — Ink TUI for review/config, dgent run/log, per-repo overrides, self-update

## Phase Details

### Phase 1: Foundation
**Goal**: Working npm package with `dgent` command, subcommand routing via commander, and JSON config read/write at `~/.config/dgent/config.json`
**Depends on**: Nothing (first phase)
**Research**: Unlikely (standard npm + commander patterns)
**Plans**: 3 plans

Plans:
- [ ] 01-01: npm package init, TypeScript config, project structure
- [ ] 01-02: commander CLI skeleton with all subcommands stubbed
- [ ] 01-03: config system — JSON read/write, defaults, `dgent config set`/`list`

### Phase 2: Message Rules
**Goal**: All four commit-msg rules implemented and tested via fixture runner: strip-trailers, strip-emojis, flag-message-tone, normalize-format
**Depends on**: Phase 1
**Research**: Unlikely (regex pattern matching, fixture testing)
**Plans**: 3 plans

Plans:
- [ ] 02-01: Fixture runner infrastructure (`dgent test`, `--rule`, `--update`)
- [ ] 02-02: strip-trailers + strip-emojis rules with fixtures (TDD)
- [ ] 02-03: flag-message-tone + normalize-format rules with fixtures (TDD)

### Phase 3: Hook Lifecycle
**Goal**: `dgent init` installs commit-msg hook with conflict detection, `dgent uninstall` removes it cleanly, `--dry-run` previews changes. After this phase, dgent is usable on real commits.
**Depends on**: Phase 2
**Research**: Unlikely (git hooks, shell scripts, git config — well-documented)
**Plans**: 2 plans

Plans:
- [ ] 03-01: dgent init with conflict detection + commit-msg hook script
- [ ] 03-02: dgent uninstall + --dry-run flag + DGENT_DRY_RUN env var

### Phase 4: Diff Transforms
**Goal**: pre-commit hook with partial staging detection and first-run consent. All default-on diff rules: strip-section-headers, strip-emoji-comments, flag-naming (with overlong identifier threshold), flag-catch-rethrow. Each with fixtures.
**Depends on**: Phase 3
**Research**: Unlikely (git staging operations, line-level heuristic matching)
**Plans**: 3 plans

Plans:
- [ ] 04-01: pre-commit hook infrastructure — partial staging detection, consent flow, re-staging
- [ ] 04-02: strip-section-headers + strip-emoji-comments rules with fixtures (TDD)
- [ ] 04-03: flag-naming + flag-catch-rethrow rules with fixtures (TDD)

### Phase 5: AI Skill Layer
**Goal**: Optional AI pass via Anthropic SDK with bundled skill.md. Secure API key storage (macOS security CLI, Linux encrypted file). rewrite-message rule. Opt-in rules: strip-noise-comments, strip-obvious-docstrings, flag-log-bracketing — each with false positive fixture suites.
**Depends on**: Phase 4
**Research**: Likely (Anthropic SDK integration, secure storage patterns)
**Research topics**: Current @anthropic-ai/sdk API surface, macOS `security` CLI usage for credential storage, Linux encrypted file patterns without keytar
**Plans**: 3 plans

Plans:
- [ ] 05-01: API key storage (macOS security CLI + Linux encrypted file) + Anthropic SDK integration
- [ ] 05-02: Bundled skill.md + rewrite-message rule + skill override at ~/.config/dgent/skill.md
- [ ] 05-03: Opt-in rules — strip-noise-comments, strip-obvious-docstrings, flag-log-bracketing with false positive fixtures

### Phase 6: TUI + Polish
**Goal**: Interactive TUI via Ink for `dgent review` (flag review) and `dgent config` (editor). Manual mode via `dgent run`. Flag history via `dgent log`. Per-repo overrides via `.dgent.json`. Self-update via `dgent update`.
**Depends on**: Phase 5
**Research**: Likely (Ink compatibility with npm global install, TUI rendering)
**Research topics**: Ink rendering in npm global installs, blessed as fallback if Ink has issues, self-update patterns for npm packages
**Plans**: 3 plans

Plans:
- [ ] 06-01: Ink compatibility spike + dgent run (manual pass) + dgent log (flag history)
- [ ] 06-02: dgent review TUI + dgent config TUI
- [ ] 06-03: Per-repo overrides (.dgent.json) + self-update (dgent update)

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-03-28 |
| 2. Message Rules | 2/2 | Complete | 2026-03-28 |
| 3. Hook Lifecycle | 0/2 | Not started | - |
| 4. Diff Transforms | 0/3 | Not started | - |
| 5. AI Skill Layer | 0/3 | Not started | - |
| 6. TUI + Polish | 0/3 | Not started | - |
