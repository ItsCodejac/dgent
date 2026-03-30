import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

let cachedPatterns: string[] | null = null;
let cachedRepoRoot: string | null | undefined = undefined;

function getRepoRoot(): string | null {
  if (cachedRepoRoot !== undefined) return cachedRepoRoot;
  try {
    cachedRepoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    cachedRepoRoot = null;
  }
  return cachedRepoRoot;
}

function loadPatterns(): string[] {
  if (cachedPatterns !== null) return cachedPatterns;

  const root = getRepoRoot();
  if (!root) {
    cachedPatterns = [];
    return cachedPatterns;
  }

  const ignorePath = join(root, ".dgentignore");
  try {
    const content = readFileSync(ignorePath, "utf-8");
    cachedPatterns = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch {
    cachedPatterns = [];
  }
  return cachedPatterns;
}

/**
 * Convert a glob pattern to a RegExp.
 * Supports: *, **, ? and path separators.
 */
function globToRegex(pattern: string): RegExp {
  let negated = false;
  let pat = pattern;

  if (pat.startsWith("!")) {
    negated = true;
    pat = pat.slice(1);
  }

  // Remove leading slash (anchors to root but we normalize paths)
  if (pat.startsWith("/")) {
    pat = pat.slice(1);
  }

  // Remove trailing slash (means directory only, but we treat it as prefix)
  const dirOnly = pat.endsWith("/");
  if (dirOnly) {
    pat = pat.slice(0, -1);
  }

  let regex = "";
  let i = 0;
  while (i < pat.length) {
    const ch = pat[i];
    if (ch === "*") {
      if (pat[i + 1] === "*") {
        if (pat[i + 2] === "/") {
          // **/ matches zero or more directories
          regex += "(?:.*/)?";
          i += 3;
        } else {
          // ** at end matches everything
          regex += ".*";
          i += 2;
        }
      } else {
        // * matches anything except /
        regex += "[^/]*";
        i++;
      }
    } else if (ch === "?") {
      regex += "[^/]";
      i++;
    } else if (ch === ".") {
      regex += "\\.";
      i++;
    } else if (ch === "[") {
      // Pass through character classes
      const close = pat.indexOf("]", i);
      if (close !== -1) {
        regex += pat.slice(i, close + 1);
        i = close + 1;
      } else {
        regex += "\\[";
        i++;
      }
    } else {
      regex += ch;
      i++;
    }
  }

  if (dirOnly) {
    // Match the directory itself or anything under it
    regex = regex + "(?:/.*)?";
  }

  const re = new RegExp(`^${regex}$`);
  return Object.assign(re, { negated });
}

/**
 * Check if a file should be ignored based on .dgentignore patterns.
 * @param filePath - Path to check (absolute or relative)
 * @returns true if the file should be ignored
 */
export function shouldIgnoreFile(filePath: string): boolean {
  const patterns = loadPatterns();
  if (patterns.length === 0) return false;

  const root = getRepoRoot();
  if (!root) return false;

  // Normalize to a relative path from repo root
  let relPath: string;
  const abs = resolve(filePath);
  if (abs.startsWith(root + "/")) {
    relPath = abs.slice(root.length + 1);
  } else {
    relPath = relative(root, filePath);
    if (relPath.startsWith("..")) {
      // Outside repo
      return false;
    }
  }

  let ignored = false;

  for (const pattern of patterns) {
    const isNegation = pattern.startsWith("!");
    const cleanPattern = isNegation ? pattern.slice(1) : pattern;
    const re = globToRegex(cleanPattern);

    // Check the full relative path
    const matches = re.test(relPath);
    // Also check if the pattern has no slash (basename-only matching)
    const isBasenamePattern = !cleanPattern.includes("/") || (cleanPattern.startsWith("/") && !cleanPattern.slice(1).includes("/"));
    const basenameMatches = isBasenamePattern && re.test(relPath.split("/").pop()!);

    if (matches || basenameMatches) {
      ignored = !isNegation;
    }
  }

  return ignored;
}

/**
 * Reset the cached patterns (useful for testing).
 */
export function resetIgnoreCache(): void {
  cachedPatterns = null;
  cachedRepoRoot = undefined;
}
