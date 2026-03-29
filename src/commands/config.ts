import type { Command } from "commander";
import { loadConfig, saveConfig, setConfigValue, formatConfigList } from "../config/index.js";
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
      const updated = setConfigValue(current, key, value);
      saveConfig(updated);
      const display = value === "true" ? true : value === "false" ? false : value;
      console.log(`Set ${key} = ${String(display)}`);
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
