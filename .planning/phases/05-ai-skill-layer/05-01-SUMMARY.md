---
phase: 05-ai-skill-layer
plan: 01
subsystem: ai
tags: [anthropic-sdk, keychain, credentials]
requires:
  - phase: 01-foundation
    provides: config-system
provides:
  - api-key-storage
  - anthropic-client
  - callSkill-function
affects: [05-ai-skill-layer]
tech-stack:
  added: ["@anthropic-ai/sdk"]
  patterns: [structured-json-output, platform-specific-secrets]
key-files:
  created: [src/config/secrets.ts, src/ai/client.ts, src/ai/index.ts]
  modified: [src/commands/config.ts]
key-decisions:
  - "macOS keychain via security CLI, Linux plain file with 600 perms"
  - "ANTHROPIC_API_KEY env var takes precedence over stored key"
  - "jsonSchemaOutputFormat with any cast for flexible schema passing"
patterns-established:
  - "Platform detection via process.platform for secrets"
  - "callSkill<T> generic for typed AI responses"
completed: 2026-03-28
---

# Phase 5 Plan 1: API key storage + Anthropic SDK Summary

**Secure credential storage via macOS keychain and Anthropic SDK client with structured JSON output**

## Accomplishments

- API key storage: macOS keychain via `security` CLI, Linux file with 600 permissions
- `dgent config set api-key` intercepts and stores securely
- ANTHROPIC_API_KEY env var override
- Anthropic client module with `callSkill<T>()` for structured output
- All 36 existing fixtures still pass

## Task Commits

1. **Task 1: API key storage** — `d9f9ff0` (feat)
2. **Task 2: Anthropic client module** — `0197021` (feat)

## Files Created/Modified

- `src/config/secrets.ts` — platform-specific key storage
- `src/ai/client.ts` — Anthropic SDK wrapper with structured output
- `src/ai/index.ts` — re-exports
- `src/commands/config.ts` — api-key interception

## Decisions Made

- Used `any` cast for jsonSchemaOutputFormat schema parameter — SDK types are overly strict for dynamic schema passing
- Linux key storage is plaintext with 600 perms (not encrypted) — acceptable for shipping speed, warns user

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- SDK's jsonSchemaOutputFormat expects a specific type, not Record<string, unknown>. Fixed with `as any` cast.

## Next Phase Readiness

- API key storage and SDK client ready for skill.md and rewrite-message rule
- Ready for 05-02-PLAN.md

---
*Phase: 05-ai-skill-layer*
*Completed: 2026-03-28*
