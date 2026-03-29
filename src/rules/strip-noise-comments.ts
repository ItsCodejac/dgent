import type { Rule, RuleResult } from "./index.js";

const FILLER_WORDS = new Set([
  "the", "a", "an", "is", "are", "to", "of", "for", "by", "in",
  "this", "that", "it", "its", "we", "our", "with", "from", "on",
  "and", "or", "be", "do", "does", "did", "has", "have", "had",
  "will", "would", "can", "could", "should", "may", "might",
]);

function extractMeaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER_WORDS.has(w));
}

function isCommentLine(line: string): { isComment: boolean; content: string } {
  const trimmed = line.trimStart();
  if (trimmed.startsWith("//")) return { isComment: true, content: trimmed.slice(2).trim() };
  if (trimmed.startsWith("#") && !trimmed.startsWith("#!")) return { isComment: true, content: trimmed.slice(1).trim() };
  return { isComment: false, content: "" };
}

function isNearVerbatim(commentWords: string[], codeWords: string[]): boolean {
  if (commentWords.length === 0) return false;
  const matches = commentWords.filter((w) => codeWords.includes(w));
  return matches.length / commentWords.length >= 0.7;
}

export const stripNoiseComments: Rule = {
  name: "strip-noise-comments",
  phase: "pre-commit",
  type: "fix",
  defaultEnabled: false,

  apply(input: string): RuleResult {
    const lines = input.split("\n");
    const filtered: string[] = [];
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
      const { isComment, content } = isCommentLine(lines[i]);

      if (!isComment || content.length === 0) {
        filtered.push(lines[i]);
        continue;
      }

      // Find next non-blank line
      let nextCodeLine = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() !== "") {
          nextCodeLine = lines[j];
          break;
        }
      }

      if (!nextCodeLine) {
        filtered.push(lines[i]);
        continue;
      }

      const commentWords = extractMeaningfulWords(content);
      const codeWords = extractMeaningfulWords(nextCodeLine);

      if (isNearVerbatim(commentWords, codeWords)) {
        changed = true;
        // Skip this comment line
        continue;
      }

      filtered.push(lines[i]);
    }

    const output = filtered.join("\n");
    return { output, changed, flags: [] };
  },
};
