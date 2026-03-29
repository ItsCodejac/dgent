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

const program = new Command();

program
  .name("dgent")
  .description("Strip AI tells from agent output")
  .version("0.1.0");

registerInit(program);
registerUninstall(program);
registerReview(program);
registerRun(program);
registerConfig(program);
registerLog(program);
registerTest(program);
registerUpdate(program);
registerHook(program);

program.parse();
