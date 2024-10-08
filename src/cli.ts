#!/usr/bin/env node

// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { banner } from "./cli/banner";
import build from "./cli/build";
import deploy from "./cli/deploy";
import dev from "./cli/dev";
import format from "./cli/format";
import monitor from "./cli/monitor";
import init from "./cli/init/index";
import uuid from "./cli/uuid";
import { version } from "./cli/init/templates";
import { RootCmd } from "./cli/root";
import update from "./cli/update";
import kfc from "./cli/kfc";

if (process.env.npm_lifecycle_event !== "npx") {
  console.warn("peppr should be run via `npx peppr <command>` instead of `peppr <command>`.");
}

const program = new RootCmd();

program
  .version(version)
  .description(`peppr (v${version}) - Type safe K8s middleware for humans`)
  .action(() => {
    if (program.args.length < 1) {
      console.log(banner);
      program.help();
    } else {
      console.error(`Invalid command '${program.args.join(" ")}'\n`);
      program.outputHelp();
      process.exitCode = 1;
    }
  });

init(program);
build(program);
deploy(program);
dev(program);
update(program);
format(program);
monitor(program);
uuid(program);
kfc(program);
program.parse();
