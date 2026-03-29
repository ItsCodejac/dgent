import type { Command } from "commander";

export function registerConfig(program: Command): void {
  const config = program
    .command("config")
    .description("Manage dgent configuration");

  config
    .command("set <key> <value>")
    .description("Set a config value")
    .action((key: string, value: string) => {
      console.log(`config set: not implemented yet (${key}=${value})`);
    });

  config
    .command("list")
    .description("Print current config as key=value")
    .action(() => {
      console.log("config list: not implemented yet");
    });

  config
    .action(() => {
      console.log("Interactive config editor not yet available. Use `dgent config list` and `dgent config set`.");
    });
}
