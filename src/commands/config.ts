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
        } else {
          storeApiKey(value);
          console.log("API key stored securely.");
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

  config.action(() => {
    console.log("Interactive config editor not yet available. Use `dgent config list` and `dgent config set`.");
  });
}
