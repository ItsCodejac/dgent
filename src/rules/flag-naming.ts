import type { Rule, RuleResult, Flag } from "./index.js";

const AI_SUFFIXES = [
  "Manager", "Handler", "Processor", "Service", "Factory",
  "Builder", "Validator", "Controller", "Orchestrator", "Coordinator",
];

const DECLARATION_PATTERNS = [
  // class ClassName
  /\b(?:class|interface|type)\s+([A-Za-z_$][\w$]*)/,
  // function functionName or const/let/var name
  /\b(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/,
  // def function_name (Python)
  /\bdef\s+([A-Za-z_][\w]*)/,
  // Go: func FunctionName, type TypeName struct/interface
  /\bfunc\s+([A-Za-z_][\w]*)/,
  /\btype\s+([A-Za-z_][\w]*)\s+(?:struct|interface)\b/,
  // Rust: fn function_name, pub fn function_name, struct/pub struct, impl, enum
  /\b(?:pub\s+)?fn\s+([A-Za-z_][\w]*)/,
  /\b(?:pub\s+)?struct\s+([A-Za-z_][\w]*)/,
  /\bimpl\s+([A-Za-z_][\w]*)/,
  /\b(?:pub\s+)?enum\s+([A-Za-z_][\w]*)/,
];

const MAX_IDENTIFIER_LENGTH = 40;

export const flagNaming: Rule = {
  name: "flag-naming",
  phase: "pre-commit",
  type: "flag",
  defaultEnabled: true,

  apply(input: string): RuleResult {
    const flags: Flag[] = [];
    const lines = input.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const pattern of DECLARATION_PATTERNS) {
        const match = line.match(pattern);
        if (!match) continue;

        const identifier = match[1];

        // Check AI naming patterns
        for (const suffix of AI_SUFFIXES) {
          if (identifier.endsWith(suffix) && identifier !== suffix) {
            flags.push({
              rule: "flag-naming",
              line: i + 1,
              message: `AI naming pattern: "${identifier}" ends with "${suffix}"`,
              suggestion: `Consider a more specific name`,
            });
          }
        }

        // Check overlong identifiers
        if (identifier.length > MAX_IDENTIFIER_LENGTH) {
          flags.push({
            rule: "flag-naming",
            line: i + 1,
            message: `Overlong identifier (${identifier.length} chars): "${identifier}"`,
            suggestion: `Consider abbreviating — context usually makes shorter names clear`,
          });
        }
      }
    }

    return { output: input, changed: false, flags };
  },
};
