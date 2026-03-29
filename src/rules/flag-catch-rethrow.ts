import type { Rule, RuleResult, Flag } from "./index.js";

// Detects catch blocks that only log and re-throw
// Pattern: catch block with <= 3 meaningful lines containing a log + throw

export const flagCatchRethrow: Rule = {
  name: "flag-catch-rethrow",
  phase: "pre-commit",
  type: "flag",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    const flags: Flag[] = [];
    const lines = input.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Detect JS/TS catch blocks
      if (/^}\s*catch\s*\(/.test(line) || /^catch\s*\(/.test(line)) {
        const catchLine = i;
        const body = extractCatchBody(lines, i);

        if (body && isLogAndRethrow(body)) {
          flags.push({
            rule: "flag-catch-rethrow",
            line: catchLine + 1,
            message: "Catch block only logs and re-throws — adds no value",
            suggestion: "Either handle the error or let it propagate without catching",
          });
        }
      }

      // Detect Python except blocks
      if (/^except\s+.*:/.test(line) || /^except:/.test(line)) {
        const exceptLine = i;
        const body = extractPythonExceptBody(lines, i);

        if (body && isPythonLogAndReraise(body)) {
          flags.push({
            rule: "flag-catch-rethrow",
            line: exceptLine + 1,
            message: "Except block only logs and re-raises — adds no value",
            suggestion: "Either handle the error or let it propagate without catching",
          });
        }
      }
    }

    return { output: input, changed: false, flags };
  },
};

function extractCatchBody(lines: string[], catchIndex: number): string[] | null {
  // Find the catch's opening brace (the last { on the catch line or next lines)
  const catchLine = lines[catchIndex];
  const lastBraceIdx = catchLine.lastIndexOf("{");
  if (lastBraceIdx === -1) {
    // Opening brace on next line
    if (catchIndex + 1 < lines.length && lines[catchIndex + 1].trim() === "{") {
      return extractBodyFromBrace(lines, catchIndex + 1);
    }
    return null;
  }

  return extractBodyFromBrace(lines, catchIndex);
}

function extractBodyFromBrace(lines: string[], braceLineIndex: number): string[] | null {
  const body: string[] = [];
  let depth = 0;
  let foundOpen = false;

  for (let i = braceLineIndex; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === "{") {
        if (foundOpen) {
          depth++;
        } else {
          foundOpen = true;
          depth = 1;
        }
      }
      if (ch === "}" && foundOpen) depth--;
    }
    if (i > braceLineIndex && foundOpen) body.push(line.trim());
    if (foundOpen && depth === 0) break;
  }

  // Remove closing brace line
  if (body.length > 0 && body[body.length - 1].startsWith("}")) {
    body.pop();
  }

  return body.filter((l) => l.length > 0);
}

function isLogAndRethrow(body: string[]): boolean {
  if (body.length === 0 || body.length > 3) return false;

  const hasLog = body.some((l) =>
    /console\.(log|error|warn|info)\s*\(/.test(l),
  );
  // Only flag bare rethrow (throw e, throw err, throw error) — not wrapped errors
  const hasBareThrow = body.some((l) => /\bthrow\s+\w+\s*;?\s*$/.test(l));

  // If body has more than just log+throw, it's doing something meaningful
  const meaningfulLines = body.filter(
    (l) => !/console\.(log|error|warn|info)\s*\(/.test(l) && !/\bthrow\b/.test(l),
  );
  if (meaningfulLines.length > 0) return false;

  return hasLog && hasBareThrow;
}

function extractPythonExceptBody(lines: string[], exceptIndex: number): string[] | null {
  const body: string[] = [];
  const baseIndent = lines[exceptIndex].search(/\S/);

  for (let i = exceptIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;
    const indent = line.search(/\S/);
    if (indent <= baseIndent) break;
    body.push(line.trim());
  }

  return body.length > 0 ? body : null;
}

function isPythonLogAndReraise(body: string[]): boolean {
  if (body.length === 0 || body.length > 3) return false;

  const hasLog = body.some((l) =>
    /(?:print|logging\.\w+|logger\.\w+)\s*\(/.test(l),
  );
  const hasRaise = body.some((l) => /\braise\b/.test(l));

  return hasLog && hasRaise;
}
