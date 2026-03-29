import type { Rule, RuleResult } from "./index.js";

const MAX_BODY_LINES = 5;

function extractMeaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export const stripObviousDocstrings: Rule = {
  name: "strip-obvious-docstrings",
  phase: "pre-commit",
  type: "fix",
  defaultEnabled: false,

  apply(input: string): RuleResult {
    const lines = input.split("\n");
    const filtered: string[] = [];
    let changed = false;
    let i = 0;

    while (i < lines.length) {
      // Detect JSDoc: /** ... */
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith("/**")) {
        const jsdocResult = tryStripJsdoc(lines, i);
        if (jsdocResult) {
          changed = true;
          i = jsdocResult.endIndex + 1;
          continue;
        }
      }

      filtered.push(lines[i]);
      i++;
    }

    const output = filtered.join("\n");
    return { output, changed, flags: [] };
  },
};

function tryStripJsdoc(
  lines: string[],
  startIndex: number,
): { endIndex: number } | null {
  // Find end of JSDoc block
  let endIndex = startIndex;
  let docContent = "";
  for (let j = startIndex; j < lines.length; j++) {
    docContent += lines[j] + " ";
    if (lines[j].includes("*/")) {
      endIndex = j;
      break;
    }
    if (j - startIndex > 10) return null; // Too long to be obvious
  }

  // Check if docstring contains @tags (useful info)
  if (/@(param|returns|throws|example|see|deprecated|since|type)/.test(docContent)) {
    return null;
  }

  // Find the function declaration after the docstring
  const funcLine = endIndex + 1 < lines.length ? lines[endIndex + 1] : "";
  const funcMatch = funcLine.match(
    /(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|(?:const|let|var)\s+(\w+))/,
  );
  if (!funcMatch) return null;

  const funcName = funcMatch[1] || funcMatch[2];

  // Check function body size
  let bodyLines = 0;
  let braceDepth = 0;
  let foundOpen = false;
  for (let j = endIndex + 1; j < lines.length; j++) {
    for (const ch of lines[j]) {
      if (ch === "{") { braceDepth++; foundOpen = true; }
      if (ch === "}" && foundOpen) braceDepth--;
    }
    if (foundOpen && j > endIndex + 1) bodyLines++;
    if (foundOpen && braceDepth === 0) break;
  }

  if (bodyLines > MAX_BODY_LINES) return null; // Too complex

  // Check if docstring content is derivable from function name
  const cleanDoc = docContent
    .replace(/\/\*\*|\*\/|\*/g, "")
    .trim();
  const docWords = extractMeaningfulWords(cleanDoc);
  const nameWords = extractMeaningfulWords(
    funcName.replace(/([A-Z])/g, " $1"), // camelCase to words
  );

  if (docWords.length === 0) return { endIndex }; // Empty docstring — strip

  const overlap = docWords.filter((w) => nameWords.includes(w));
  if (overlap.length / docWords.length >= 0.6) {
    return { endIndex };
  }

  return null;
}
