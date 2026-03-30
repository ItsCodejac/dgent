---
name: dgent-check
description: Run dgent to check files for AI tells before committing. Use when finishing work, before creating commits, or when asked to clean up agent output.
trigger: before committing, "check for tells", "clean up", "run dgent", "strip tells"
---

# dgent check

Run dgent on modified files to identify AI tells before committing.

## Process

1. Get list of modified files:
```bash
git diff --name-only --diff-filter=ACM
git diff --cached --name-only --diff-filter=ACM
```

2. Run dgent on each file with JSON output:
```bash
dgent run --json <file>
```

3. Parse the JSON result:
- `clean: true` — file is clean, move on
- `flags` array — issues to address:
  - `flag-naming`: rename the identifier to something more specific
  - `flag-catch-rethrow`: either handle the error properly or remove the catch
  - `flag-log-bracketing`: remove narration logging
- `fixes` array — these will be auto-applied by the hook, no action needed

4. For each flag, fix the issue in the code before committing.

5. For commit messages, check the message:
```bash
echo "your commit message" | dgent run --json --commit-msg -
```

## Example

```bash
$ dgent run --json src/services/UserManager.ts
{
  "file": "src/services/UserManager.ts",
  "phase": "pre-commit",
  "clean": false,
  "fixes": [],
  "flags": [
    {
      "rule": "flag-naming",
      "line": 1,
      "message": "AI naming pattern: \"UserManager\" ends with \"Manager\"",
      "suggestion": "Consider a more specific name"
    }
  ]
}
```

Action: Rename `UserManager` to something that describes what it actually does (e.g., `UserStore`, `Users`, or the specific operation).

## When NOT to use

- Don't run on files you haven't modified
- Don't fix flags in code you weren't asked to change
- If a flag is on existing code (not your changes), ignore it
