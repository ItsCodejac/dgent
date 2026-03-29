# jent integration

jent (de-agent) cleans AI tells from commits and code via git hooks.

## Automatic behavior

jent runs on every `git commit` via global hooks. It handles:
- Removing Co-Authored-By and Generated-By trailers from commit messages
- Stripping emoji from commit messages and code comments
- Normalizing conventional commit format
- Flagging AI naming patterns (Manager, Handler, Processor suffixes)

## Commands for agents

```bash
# Check a single file silently (exit 0 = clean, 1 = flags)
jent run --check <file>

# Check a file with JSON output (fixes[], flags[], clean boolean)
jent run --json <file>

# Scan an entire directory
jent scan --json [dir]

# Check only staged files before committing
jent check-staged --json

# List all rules and their status
jent rules --json
```

## When to run jent

Run jent **after writing code, before committing**:
1. Write or modify files
2. Run `jent check-staged --json` to check staged files, or `jent run --check <file>` on individual files
3. Fix any flagged issues
4. Commit

## What to avoid

These patterns get flagged:
- Class/function names ending in Manager, Handler, Processor, Service, Factory, Builder, Validator, Controller
- Identifiers longer than 40 characters
- Catch blocks that only log and re-throw
- Section header comments like `// --- Init ---` in small files
- Comments that restate the next line of code

## Configuration

- Check current rules: `jent config list`
- Repo overrides: `.jent.json`
- Exclude paths from scanning: `.jentignore` (same syntax as `.gitignore`)
