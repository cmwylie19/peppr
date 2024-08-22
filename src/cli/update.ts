// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { execSync } from "child_process";
import fs from "fs";
import { resolve } from "path";
import prompt from "prompts";

import {
  codeSettings,
  hellopeppr,
  prettier,
  samplesYaml,
  snippet,
  tsConfig,
} from "./init/templates";
import { write } from "./init/utils";
import { RootCmd } from "./root";

export default function (program: RootCmd) {
  program
    .command("update")
    .description("Update this peppr module. Not recommended for prod as it may change files.")
    .option("--skip-template-update", "Skip updating the template files")
    .action(async opts => {
      if (!opts.skipTemplateUpdate) {
        const { confirm } = await prompt({
          type: "confirm",
          name: "confirm",
          message:
            "This will overwrite previously auto-generated files including the capabilities/Hellopeppr.ts file.\n" +
            "Are you sure you want to continue?",
        });

        // If the user doesn't confirm, exit
        if (!confirm) {
          return;
        }
      }

      console.log("Updating the peppr module...");

      try {
        // Update peppr for the module
        execSync("npm install peppr@latest", {
          stdio: "inherit",
        });

        // Don't update the template files if the user specified the --skip-template-update flag
        if (!opts.skipTemplateUpdate) {
          execSync("npx peppr update-templates", {
            stdio: "inherit",
          });
        }

        console.log(`✅ Module updated successfully`);
      } catch (e) {
        console.error(`Error updating peppr module:`, e);
        process.exit(1);
      }
    });

  program
    .command("update-templates", { hidden: true })
    .description("Perform template updates")
    .action(async opts => {
      console.log("Updating peppr config and template tiles...");

      try {
        // Don't update the template files if the user specified the --skip-template-update flag
        if (!opts.skipTemplateUpdate) {
          await write(resolve(prettier.path), prettier.data);
          await write(resolve(tsConfig.path), tsConfig.data);
          await write(resolve(".vscode", snippet.path), snippet.data);
          await write(resolve(".vscode", codeSettings.path), codeSettings.data);

          // Update the samples.yaml file if it exists
          const samplePath = resolve("capabilities", samplesYaml.path);
          if (fs.existsSync(samplePath)) {
            fs.unlinkSync(samplePath);
            await write(samplePath, samplesYaml.data);
          }

          // Update the Hellopeppr.ts file if it exists
          const tsPath = resolve("capabilities", hellopeppr.path);
          if (fs.existsSync(tsPath)) {
            await write(tsPath, hellopeppr.data);
          }
        }
      } catch (e) {
        console.error(`Error updating template files:`, e);
        process.exit(1);
      }
    });
}
