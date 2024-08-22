// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { promises as fs } from "fs";
import prompt, { Answers, PromptObject } from "prompts";

import { Errors } from "../../lib/errors";
import { eslint, gitignore, prettier, readme, tsConfig } from "./templates";
import { sanitizeName } from "./utils";

export type InitOptions = Answers<"name" | "description" | "errorBehavior">;

export function walkthrough(): Promise<InitOptions> {
  const askName: PromptObject = {
    type: "text",
    name: "name",
    message:
      "Enter a name for the new peppr module. This will create a new directory based on the name.\n",
    validate: async val => {
      try {
        const name = sanitizeName(val);
        await fs.access(name, fs.constants.F_OK);

        return "A directory with this name already exists";
      } catch (e) {
        return val.length > 2 || "The name must be at least 3 characters long";
      }
    },
  };

  const askDescription: PromptObject = {
    type: "text",
    name: "description",
    message: "(Recommended) Enter a description for the new peppr module.\n",
  };

  const askErrorBehavior: PromptObject = {
    type: "select",
    name: "errorBehavior",
    message: "How do you want peppr to handle errors encountered during K8s operations?",
    choices: [
      {
        title: "Reject the operation",
        value: Errors.reject,
        description:
          "In the event that peppr is down or other module errors occur, the operation will not be allowed to continue. (Recommended for production.)",
      },
      {
        title: "Ignore",
        value: Errors.ignore,
        description:
          "In the event that peppr is down or other module errors occur, an entry will be generated in the peppr Controller Log and the operation will be allowed to continue. (Recommended for development, not for production.)",
        selected: true,
      },
      {
        title: "Log an audit event",
        value: Errors.audit,
        description:
          "peppr will continue processing and generate an entry in the peppr Controller log as well as an audit event in the cluster.",
      },
    ],
  };

  return prompt([askName, askDescription, askErrorBehavior]) as Promise<InitOptions>;
}

export async function confirm(
  dirName: string,
  packageJSON: { path: string; print: string },
  pepprTSPath: string,
) {
  console.log(`
  To be generated:

    \x1b[1m${dirName}\x1b[0m
    ├── \x1b[1m${eslint.path}\x1b[0m
    ├── \x1b[1m${gitignore.path}\x1b[0m
    ├── \x1b[1m${prettier.path}\x1b[0m
    ├── \x1b[1mcapabilties\x1b[0m
    │   ├── \x1b[1mhello-peppr.samples.yaml\x1b[0m     
    │   └── \x1b[1mhello-peppr.ts\x1b[0m     
    ├── \x1b[1m${packageJSON.path}\x1b[0m
${packageJSON.print.replace(/^/gm, "    │   ")}
    ├── \x1b[1m${pepprTSPath}\x1b[0m
    ├── \x1b[1m${readme.path}\x1b[0m
    └── \x1b[1m${tsConfig.path}\x1b[0m
      `);

  const confirm = await prompt({
    type: "confirm",
    name: "confirm",
    message: "Create the new peppr module?",
  });

  return confirm.confirm;
}
