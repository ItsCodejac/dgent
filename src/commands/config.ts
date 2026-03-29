import type { Command } from "commander";
import { unlinkSync } from "node:fs";
import { loadConfig, saveConfig, setConfigValue, getConfigValue, formatConfigList, getConfigPath } from "../config/index.js";
import { storeApiKey, deleteApiKey } from "../config/secrets.js";

export function registerConfig(program: Command): void {
  const config = program
    .command("config")
    .description("Manage dgent configuration");

  config
    .command("set <key> <value>")
    .description("Set a config value")
    .action((key: string, value: string) => {
      // Special handling for api-key — store securely, not in config.json
      if (key === "api-key") {
        if (value === "" || value === "delete" || value === "remove") {
          deleteApiKey();
          console.log("API key removed.");
        } else if (value === "-") {
          // Read from stdin to avoid shell history exposure
          let keyData = "";
          process.stdin.setEncoding("utf-8");
          process.stdin.on("data", (chunk) => { keyData += chunk; });
          process.stdin.on("end", () => {
            const trimmed = keyData.trim();
            if (trimmed) {
              storeApiKey(trimmed);
              console.log("API key stored securely.");
            } else {
              console.error("No key provided via stdin.");
            }
          });
          return;
        } else {
          storeApiKey(value);
          console.log("API key stored securely.");
          console.log("Tip: use `echo $KEY | dgent config set api-key -` to avoid shell history.");
        }
        return;
      }

      const current = loadConfig();

      // Validate key exists in schema
      const existing = getConfigValue(current, key);
      if (existing === undefined && !key.startsWith("rules.")) {
        console.warn(`Warning: unknown config key "${key}"`);
      }

      // Validate values for known namespaces
      if (key.startsWith("rules.")) {
        if (value !== "true" && value !== "false") {
          console.error(`Invalid value for ${key}: expected "true" or "false", got "${value}"`);
          process.exit(1);
        }
      } else if (key === "ai.enabled" || key === "ai.autofix") {
        if (value !== "true" && value !== "false") {
          console.error(`Invalid value for ${key}: expected "true" or "false", got "${value}"`);
          process.exit(1);
        }
      } else if (key === "ai.model") {
        if (!value || value.trim().length === 0) {
          console.error(`Invalid value for ${key}: expected a non-empty string`);
          process.exit(1);
        }
      }

      const updated = setConfigValue(current, key, value);
      saveConfig(updated);
      const display = value === "true" ? true : value === "false" ? false : value;
      console.log(`Set ${key} = ${String(display)}`);
    });

  config
    .command("get <key>")
    .description("Print a single config value by dot-notation key")
    .action((key: string) => {
      const current = loadConfig();
      const value = getConfigValue(current, key);
      if (value === undefined) {
        console.error(`Unknown config key: ${key}`);
        process.exit(1);
      }
      if (typeof value === "object" && value !== null) {
        console.log(JSON.stringify(value, null, 2));
      } else {
        console.log(String(value));
      }
    });

  config
    .command("reset")
    .description("Reset config to defaults")
    .action(() => {
      const configPath = getConfigPath();
      try {
        unlinkSync(configPath);
      } catch {
        // File may not exist — that's fine
      }
      console.log("Config reset to defaults.");
    });

  config
    .command("list")
    .description("Print current config as key=value")
    .action(() => {
      const current = loadConfig();
      console.log(formatConfigList(current));
    });

  config.action(async () => {
    if (process.stdout.isTTY) {
      try {
        const { renderConfig } = await import("../tui/render.js");
        const current = loadConfig();
        await renderConfig(current, (updated) => {
          saveConfig(updated);
        });
        return;
      } catch {
        // Fall back to non-interactive
      }
    }
    console.log("Use `dgent config list` and `dgent config set` to manage configuration.");
  });
}
