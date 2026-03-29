# dgent integration

dgent (de-agent) is installed on this machine. It cleans AI tells from commits and code via git hooks.

## What it does automatically

dgent runs on every `git commit` via global hooks. You don't need to call it — it handles:
- Removing Co-Authored-By and Generated-By trailers from commit messages
- Stripping emoji from commit messages and code comments
- Normalizing conventional commit format
- Flagging AI naming patterns (Manager, Handler, Processor suffixes)

## What you should do

Before committing code, run `dgent run --json <file>` on files you've modified to check for tells:

```bash
dgent run --json src/path/to/file.ts
```

The JSON output tells you:
- `clean: true` — no issues
- `fixes[]` — rules that would auto-fix (these run automatically on commit)
- `flags[]` — issues to address before committing (naming, catch-rethrow patterns)

Exit codes: 0 = clean or fixes applied (success), 1 = flags found (needs attention)

## When writing code

Avoid these patterns that dgent flags:
- Class/function names ending in Manager, Handler, Processor, Service, Factory, Builder, Validator, Controller
- Identifiers longer than 40 characters
- Catch blocks that only log and re-throw: `catch (e) { console.error(e); throw e; }`
- Section header comments like `// --- Init ---` in small files
- Comments that restate the next line of code

## Configuration

Check current rules: `dgent config list`
This repo may have overrides in `.dgent.json`.
