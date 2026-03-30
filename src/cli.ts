#!/usr/bin/env node

// Node.js version check — must run before any imports that may use modern syntax
const [major] = process.versions.node.split(".").map(Number);
if (major < 18) {
  console.error(`dgent requires Node.js >= 18. You are running Node.js ${process.versions.node}.`);
  process.exit(1);
}

import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerUninstall } from "./commands/uninstall.js";
import { registerReview } from "./commands/review.js";
import { registerRun } from "./commands/run.js";
import { registerConfig } from "./commands/config.js";
import { registerLog } from "./commands/log.js";
import { registerTest } from "./commands/test.js";
import { registerUpdate } from "./commands/update.js";
import { registerHook } from "./commands/hook.js";
import { registerIntegrate } from "./commands/integrate.js";
import { registerRage } from "./commands/rage.js";
import { registerFix } from "./commands/fix.js";
import { registerDoctor } from "./commands/doctor.js";
import { registerScan } from "./commands/scan.js";
import { registerStats } from "./commands/stats.js";
import { registerRules } from "./commands/rules.js";
import { registerCompletions } from "./commands/completions.js";
import { registerCheckStaged } from "./commands/check-staged.js";
import { getBanner, VERSION } from "./ui/brand.js";

// Handle --no-color early, before any colored output is generated
if (process.argv.includes("--no-color")) {
  process.env.NO_COLOR = "1";
}

const program = new Command();

program
  .name("dgent")
  .description("De-agent your code")
  .version(VERSION)
  .option("--verbose", "Enable verbose output")
  .option("--quiet", "Suppress non-essential output")
  .option("--no-color", "Disable color output")
  .addHelpText("beforeAll", () => {
    return getBanner();
  });

program.hook("preAction", () => {
  const opts = program.opts();
  if (opts.verbose) process.env.DGENT_VERBOSE = "1";
  if (opts.quiet) process.env.DGENT_QUIET = "1";
  if (opts.color === false) process.env.NO_COLOR = "1";
});

registerInit(program);
registerUninstall(program);
registerReview(program);
registerRun(program);
registerConfig(program);
registerLog(program);
registerTest(program);
registerUpdate(program);
registerIntegrate(program);
registerScan(program);
registerFix(program);
registerStats(program);
registerRules(program);
registerDoctor(program);
registerRage(program);
registerHook(program);
registerCompletions(program);
registerCheckStaged(program);

// Default action: no subcommand = interactive dashboard
program.action(async () => {
  if (process.stdout.isTTY) {
    try {
      const { loadConfig } = await import("./config/index.js");
      const { readLogs } = await import("./hooks/log-writer.js");
      const { renderDashboard } = await import("./tui/render.js");
      const { spawnSync } = await import("node:child_process");

      const config = loadConfig();
      const logs = readLogs(20);

      let selectedAction = "";

      await renderDashboard(config, logs, VERSION, (action) => {
        selectedAction = action;
      });

      // Launch the selected subcommand
      if (selectedAction) {
        spawnSync(process.argv[0], [process.argv[1], selectedAction], { stdio: "inherit" });
      }
    } catch {
      program.help();
    }
  } else {
    program.help();
  }
});

program.parseAsync();
