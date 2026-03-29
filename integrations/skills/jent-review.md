---
name: jent-review
description: Review and address jent flags from recent commits. Use when asked to review flags, fix tells, or after jent reports issues.
trigger: "review flags", "jent flags", "fix tells", "jent review"
---

# jent review

Review flags from recent commits and suggest fixes.

## Process

1. Get recent flags:
```bash
jent log --all 2>/dev/null
```

Or for the last commit only:
```bash
jent review 2>/dev/null
```

2. For each flag, read the flagged file and line number.

3. Assess whether the flag is valid:
   - **flag-naming**: Is the name genuinely generic (DataProcessor) or is it domain-appropriate (PaymentProcessor in a payments codebase)?
   - **flag-catch-rethrow**: Is the catch truly empty or does it serve a purpose the heuristic missed?
   - **flag-message-tone**: Was the flagged word used naturally or is it AI vocabulary?
   - **flag-log-bracketing**: Are the logs actually narration or are they meaningful telemetry?

4. For valid flags, fix the code. For false positives, consider adding the pattern to `.jent.json` to suppress:
```json
{
  "rules": {
    "flag-naming": false
  }
}
```

5. If a rule consistently false-positives in this repo, disable it per-repo rather than fixing each instance.

## Flag-specific fixes

### flag-naming
- Replace `DataProcessor` with what it actually processes: `CsvParser`, `InvoiceCalculator`
- Replace `UserService` with the operation: `UserAuth`, `UserLookup`, `Users`
- Replace `ConfigurationHandler` with `Config` or the specific config: `DatabaseConfig`

### flag-catch-rethrow
- If the error should propagate: remove the try/catch entirely
- If it needs logging: add context: `throw new Error("Failed to connect to DB", { cause: e })`
- If it needs recovery: add the recovery logic

### flag-log-bracketing
- Remove the narration logs
- Or replace with structured logging that adds value: timing, request IDs, error context
