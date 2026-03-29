#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TIMEOUT = 30_000;

async function verifyDgent(): Promise<void> {
  try {
    await execFileAsync("dgent", ["--version"], { timeout: 5000 });
  } catch {
    console.error("dgent-mcp: dgent not found. Install with: npm install -g dgent");
    process.exit(1);
  }
}

async function runDgent(
  args: string[],
  input?: string,
): Promise<{ stdout: string; stderr: string }> {
  try {
    const opts: Record<string, unknown> = { timeout: TIMEOUT, encoding: "utf-8" };
    if (input) opts.input = input;
    const result = await execFileAsync("dgent", args, opts);
    return { stdout: result.stdout as string, stderr: result.stderr as string };
  } catch (err: unknown) {
    // dgent uses exit codes 1 (flags) and 2 (fixes) as valid results
    if (err && typeof err === "object" && "stdout" in err) {
      const e = err as { stdout: string; stderr: string };
      return { stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
    }
    throw err;
  }
}

function tryParseJson(s: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(s) as unknown;
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

function errorResult(context: string, err: unknown): ToolResult {
  const msg = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `${context}: ${msg}` }],
    isError: true,
  };
}

const server = new McpServer(
  { name: "dgent-mcp", version: "0.1.0" },
  { capabilities: { logging: {} } },
);

// ── Check a file for AI tells ──────────────────────────────────────────
server.registerTool(
  "dgent_check_file",
  {
    title: "Check File for AI Tells",
    description:
      "Check a source file for AI agent tells — naming patterns (Manager, Handler, Processor), catch-rethrow blocks, section header comments, emoji in comments, overlong identifiers. Returns structured JSON with 'fixes' (auto-fixable issues) and 'flags' (issues needing attention). Use before committing code written by an AI agent.",
    inputSchema: {
      path: z.string().describe("Absolute or relative path to the file to check"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async ({ path }): Promise<ToolResult> => {
    try {
      const { stdout } = await runDgent(["run", "--json", "--pre-commit", path]);
      const parsed = tryParseJson(stdout);
      return {
        content: [{ type: "text" as const, text: parsed ? JSON.stringify(parsed, null, 2) : stdout }],
        structuredContent: parsed ?? undefined,
      };
    } catch (err) {
      return errorResult(`Failed to check ${path}. Verify the file exists and dgent is installed`, err);
    }
  },
);

// ── Check a commit message ─────────────────────────────────────────────
server.registerTool(
  "dgent_check_message",
  {
    title: "Check Commit Message for AI Tells",
    description:
      "Check a commit message for AI tells — emoji prefixes, Co-Authored-By/Generated-By trailers, AI vocabulary (enhance, streamline, comprehensive, utilize, leverage), formatting issues. Returns structured JSON with fixes (auto-applied by hooks) and flags (need rephrasing).",
    inputSchema: {
      message: z.string().describe("The full commit message text to check"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async ({ message }): Promise<ToolResult> => {
    try {
      const { stdout } = await runDgent(["run", "--json", "--commit-msg", "-"], message);
      const parsed = tryParseJson(stdout);
      return {
        content: [{ type: "text" as const, text: parsed ? JSON.stringify(parsed, null, 2) : stdout }],
        structuredContent: parsed ?? undefined,
      };
    } catch (err) {
      return errorResult("Failed to check commit message", err);
    }
  },
);

// ── Scan a directory ───────────────────────────────────────────────────
server.registerTool(
  "dgent_scan_directory",
  {
    title: "Scan Directory for AI Tells",
    description:
      "Scan an entire directory recursively for AI tells across all code files (.ts, .js, .py, .go, etc.). Returns structured JSON with per-file results including file count, clean count, total fixes, total flags, and detailed per-file breakdown. Use before committing multi-file changes or to assess a codebase.",
    inputSchema: {
      directory: z.string().default(".").describe("Directory path to scan (default: current directory)"),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async ({ directory }): Promise<ToolResult> => {
    try {
      const { stdout } = await runDgent(["scan", "--json", directory]);
      const parsed = tryParseJson(stdout);
      return {
        content: [{ type: "text" as const, text: parsed ? JSON.stringify(parsed, null, 2) : stdout }],
        structuredContent: parsed ?? undefined,
      };
    } catch (err) {
      return errorResult(`Failed to scan ${directory}`, err);
    }
  },
);

// ── Fix a file in place ────────────────────────────────────────────────
server.registerTool(
  "dgent_fix_file",
  {
    title: "Fix AI Tells in File",
    description:
      "Apply deterministic fixes to a source file in place — strips section header comments, emoji from code comments, and other auto-fixable tells. Writes the cleaned content back to the file. Does NOT resolve flag rules (naming patterns, catch-rethrow) — those need manual fixes or the AI-powered 'dgent fix' command.",
    inputSchema: {
      path: z.string().describe("Path to the file to fix in place"),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async ({ path }): Promise<ToolResult> => {
    try {
      // First apply fixes in place
      await runDgent(["run", "--fix", path]);
      // Then get the post-fix state as structured JSON
      const { stdout } = await runDgent(["run", "--json", "--pre-commit", path]);
      const parsed = tryParseJson(stdout);
      return {
        content: [{ type: "text" as const, text: parsed ? JSON.stringify(parsed, null, 2) : stdout }],
        structuredContent: parsed ?? undefined,
      };
    } catch (err) {
      return errorResult(`Failed to fix ${path}`, err);
    }
  },
);

// ── Get rule catalog ───────────────────────────────────────────────────
server.registerTool(
  "dgent_get_rules",
  {
    title: "Get dgent Rule Catalog",
    description:
      "Returns the complete catalog of all dgent rules with: name, phase (commit-msg or pre-commit), type (fix or flag), enabled status, and full pattern lists (flagged words, naming suffixes, identifier length thresholds, trailer patterns). Use this to understand exactly what patterns to avoid when writing code.",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async (): Promise<ToolResult> => {
    try {
      const { stdout } = await runDgent(["rules", "--json"]);
      const parsed = tryParseJson(stdout);
      return {
        content: [{ type: "text" as const, text: parsed ? JSON.stringify(parsed, null, 2) : stdout }],
        structuredContent: parsed ?? undefined,
      };
    } catch (err) {
      return errorResult("Failed to get rules", err);
    }
  },
);

// ── Get dgent status ───────────────────────────────────────────────────
server.registerTool(
  "dgent_get_status",
  {
    title: "Get dgent Status",
    description:
      "Check dgent installation and configuration — git identity, hook status (installed/owned/tampered), consent status, API key presence, AI enabled, enabled/disabled rules, repo overrides, recent flag history. Use to verify setup or troubleshoot issues.",
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
  },
  async (): Promise<ToolResult> => {
    try {
      const { stdout } = await runDgent(["rage"]);
      return {
        content: [{ type: "text" as const, text: stdout }],
      };
    } catch (err) {
      return errorResult("Failed to get status. Is dgent installed?", err);
    }
  },
);

// ── Start ──────────────────────────────────────────────────────────────
async function main() {
  await verifyDgent();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("dgent-mcp server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
