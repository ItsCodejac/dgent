#!/usr/bin/env node

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

program.parse();
