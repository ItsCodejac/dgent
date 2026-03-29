import type { Command } from "commander";

export function registerHook(program: Command): void {
  const hook = program
    .command("hook <type>")
    .description("Internal: called by git hook scripts")
    .allowUnknownOption()
    .action((type: string) => {
      console.log(`hook ${type}: not implemented yet`);
    });

  // Hide from --help output
  hook.helpInformation = () => "";
  (hook as unknown as Record<string, boolean>)._hidden = true;
}
