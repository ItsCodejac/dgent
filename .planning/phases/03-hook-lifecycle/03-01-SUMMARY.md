---
phase: 03-hook-lifecycle
plan: 01
subsystem: hooks
provides: [dgent-init, dgent-uninstall, commit-msg-handler, dry-run, hook-conflict-detection]
affects: [04-diff-transforms]
key-files: [src/hooks/install.ts, src/hooks/commit-msg.ts, src/commands/hook.ts]
key-decisions: [hooks dir at ~/.config/dgent/hooks with .dgent marker, commander variadic args for hook command]
---

# Phase 3 Plan 1: dgent init + commit-msg hook handler Summary

**dgent is functional on real commits — init installs hooks, commit-msg handler runs all rules, uninstall removes cleanly.**

## Accomplishments

- dgent init with conflict detection (detect existing hooksPath, abort with chaining instructions)
- Idempotent re-installation
- commit-msg hook handler runs all enabled rules on message file
- Dry-run mode via DGENT_DRY_RUN=1 (preview without modifying)
- dgent uninstall removes hooks and unsets core.hooksPath
- End-to-end verified: real git commit has emoji stripped, trailers removed, tone flagged
- Hook errors never block commits (exit 0 on any failure)

## Files Created/Modified

- `src/hooks/install.ts` — installHooks/uninstallHooks with conflict detection
- `src/hooks/commit-msg.ts` — handleCommitMsg runs rules pipeline
- `src/hooks/index.ts` — re-exports
- `src/commands/init.ts` — wired to installHooks
- `src/commands/uninstall.ts` — wired to uninstallHooks
- `src/commands/hook.ts` — routes commit-msg/pre-commit with variadic args

## Issues Encountered

- Commander rejected extra args on hook command. Fixed by using `.argument("[args...]")` for variadic arguments.

## Next Step

Phase 3 complete. Ready for Phase 4 (Diff Transforms).
