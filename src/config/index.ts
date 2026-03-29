import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { DEFAULT_CONFIG } from "./defaults.js";

export interface DgentConfig {
  rules: Record<string, boolean>;
  ai: {
    enabled: boolean;
    autofix: boolean;
    model: string;
    skill: string;
  };
  output: {
    verbose: boolean;
    "log-dir": string;
  };
}

export function getConfigPath(): string {
  return join(homedir(), ".config", "dgent", "config.json");
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      typeof target[key] === "object" &&
      target[key] !== null
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>,
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function getRepoRoot(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return null;
  }
}

function loadRepoOverrides(): Partial<DgentConfig> | null {
  const root = getRepoRoot();
  if (!root) return null;

  const overridePath = join(root, ".dgent.json");
  if (!existsSync(overridePath)) return null;

  try {
    const raw = readFileSync(overridePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadConfig(): DgentConfig {
  const configPath = getConfigPath();
  let config: DgentConfig;

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    config = deepMerge(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      parsed,
    ) as unknown as DgentConfig;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      config = { ...DEFAULT_CONFIG };
    } else if (err instanceof SyntaxError) {
      console.warn(`Warning: invalid JSON in ${configPath}, using defaults`);
      config = { ...DEFAULT_CONFIG };
    } else {
      throw err;
    }
  }

  // Apply per-repo overrides (only rules section)
  const overrides = loadRepoOverrides();
  if (overrides?.rules) {
    config = {
      ...config,
      rules: { ...config.rules, ...overrides.rules },
    };
  }

  return config;
}

export function saveConfig(config: DgentConfig): void {
  const configPath = getConfigPath();
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function getConfigValue(config: DgentConfig, key: string): unknown {
  const parts = key.split(".");
  let current: unknown = config;
  for (const part of parts) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function setConfigValue(config: DgentConfig, key: string, value: string): DgentConfig {
  const parts = key.split(".");
  const result = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  let current = result;

  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== "object" || current[parts[i]] === null) {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }

  const lastKey = parts[parts.length - 1];
  if (value === "true") {
    current[lastKey] = true;
  } else if (value === "false") {
    current[lastKey] = false;
  } else if (!isNaN(Number(value)) && value.trim() !== "") {
    current[lastKey] = Number(value);
  } else {
    current[lastKey] = value;
  }

  return result as unknown as DgentConfig;
}

function flattenConfig(obj: Record<string, unknown>, prefix = ""): Array<[string, unknown]> {
  const entries: Array<[string, unknown]> = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      entries.push(...flattenConfig(value as Record<string, unknown>, fullKey));
    } else {
      entries.push([fullKey, value]);
    }
  }
  return entries;
}

export function formatConfigList(config: DgentConfig): string {
  return flattenConfig(config as unknown as Record<string, unknown>)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("\n");
}

export { DEFAULT_CONFIG } from "./defaults.js";
