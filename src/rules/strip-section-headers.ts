import type { Rule, RuleResult } from "./index.js";

const MAX_LINES = 500;

// Matches comment lines that are purely decorative section headers
// Examples: // --- Init ---, # ===== Setup =====, /* --- Config --- */
const SECTION_HEADER_PATTERNS = [
  // // --- Text --- or // ===== Text =====
  /^\s*\/\/\s*[-=*#]{3,}\s*.*\s*[-=*#]{3,}\s*$/,
  // // ----------- (separator only, no text)
  /^\s*\/\/\s*[-=*#]{5,}\s*$/,
  // # --- Text --- or # ===== Text =====
  /^\s*#\s*[-=*#]{3,}\s*.*\s*[-=*#]{3,}\s*$/,
  // # ----------- (separator only)
  /^\s*#\s*[-=*#]{5,}\s*$/,
  // /* --- Text --- */ or /* ===== */
  /^\s*\/\*\s*[-=*#]{3,}.*[-=*#]{3,}\s*\*\/\s*$/,
];

function isSectionHeader(line: string): boolean {
  return SECTION_HEADER_PATTERNS.some((p) => p.test(line));
}

export const stripSectionHeaders: Rule = {
  name: "strip-section-headers",
  phase: "pre-commit",
  type: "fix",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    const lines = input.split("\n");

    // Skip large files
    if (lines.length > MAX_LINES) {
      return { output: input, changed: false, flags: [] };
    }

    const filtered: string[] = [];
    let lastWasHeader = false;

    for (const line of lines) {
      if (isSectionHeader(line)) {
        lastWasHeader = true;
        continue;
      }
      // Remove blank line immediately following a removed header
      if (lastWasHeader && line.trim() === "") {
        lastWasHeader = false;
        continue;
      }
      lastWasHeader = false;
      filtered.push(line);
    }

    const output = filtered.join("\n");
    return {
      output,
      changed: output !== input,
      flags: [],
    };
  },
};
