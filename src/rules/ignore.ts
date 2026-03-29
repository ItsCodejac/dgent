import type { Flag } from "./index.js";

// Patterns:
//   // dgent-ignore                      → ignore next line (all rules)
//   // dgent-ignore-next-line             → ignore next line (all rules)
//   // dgent-ignore flag-naming           → ignore next line (specific rule)
//   code(); // dgent-ignore               → ignore this line (all rules)
//   code(); // dgent-ignore flag-naming   → ignore this line (specific rule)
//   # dgent-ignore                        → same patterns for Python/shell
const IGNORE_PATTERN = /(?:\/\/|#)\s*dgent-ignore(?:-next-line)?(?:\s+(.+))?$/;

export interface IgnoreMap {
  lines: Map<number, Set<string> | "all">;
}

export function parseIgnoreComments(input: string): IgnoreMap {
  const lines = input.split("\n");
  const map: IgnoreMap = { lines: new Map() };

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(IGNORE_PATTERN);
    if (!match) continue;

    const ruleNames = match[1]?.trim();
    const rules = ruleNames ? new Set(ruleNames.split(/\s+/)) : ("all" as const);

    // Is this a standalone comment line or inline?
    const trimmed = lines[i].trimStart();
    const isStandaloneComment = trimmed.startsWith("//") || trimmed.startsWith("#");
    const isExplicitNextLine = lines[i].includes("dgent-ignore-next-line");

    if (isStandaloneComment || isExplicitNextLine) {
      // Standalone comment or explicit next-line → target the next line
      map.lines.set(i + 2, rules); // +2: i is 0-indexed, flags are 1-indexed, +1 for next line
    } else {
      // Inline comment → target this line
      map.lines.set(i + 1, rules); // +1: 0-indexed to 1-indexed
    }
  }

  return map;
}

export function filterIgnoredFlags(flags: Flag[], ignoreMap: IgnoreMap): Flag[] {
  return flags.filter((flag) => {
    const ignored = ignoreMap.lines.get(flag.line);
    if (!ignored) return true;
    if (ignored === "all") return false;
    return !ignored.has(flag.rule);
  });
}
