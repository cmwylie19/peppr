// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { dumpYaml } from "@kubernetes/client-node";
import { inspect } from "util";
import { v4 as uuidv4, v5 as uuidv5 } from "uuid";

import eslintJSON from "../../templates/.eslintrc.template.json";
import prettierJSON from "../../templates/.prettierrc.json";
import samplesJSON from "../../templates/capabilities/hello-peppr.samples.json";
import { gitIgnore, hellopepprTS, packageJSON, pepprTS, readmeMd } from "../../templates/data.json";
import pepprSnippetsJSON from "../../templates/peppr.code-snippets.json";
import settingsJSON from "../../templates/settings.json";
import tsConfigJSON from "../../templates/tsconfig.module.json";
import { sanitizeName } from "./utils";
import { InitOptions } from "./walkthrough";

export const { dependencies, devDependencies, peerDependencies, scripts, version } = packageJSON;

export function genPkgJSON(opts: InitOptions, pgkVerOverride?: string) {
  // Generate a random UUID for the module based on the module name
  const uuid = uuidv5(opts.name, uuidv4());
  // Generate a name for the module based on the module name
  const name = sanitizeName(opts.name);
  // Make typescript a dev dependency
  const { typescript } = peerDependencies;

  const testEnv = {
    MY_CUSTOM_VAR: "example-value",
    ZARF_VAR: "###ZARF_VAR_THING###",
  };

  const data = {
    name,
    version: "0.0.1",
    description: opts.description,
    keywords: ["peppr", "k8s", "policy-engine", "peppr-module", "security"],
    engines: {
      node: ">=18.0.0",
    },
    peppr: {
      uuid: pgkVerOverride ? "static-test" : uuid,
      onError: opts.errorBehavior,
      webhookTimeout: 10,
      customLabels: {
        namespace: {
          "peppr.dev": "",
        },
      },
      alwaysIgnore: {
        namespaces: [],
      },
      includedFiles: [],
      env: pgkVerOverride ? testEnv : {},
    },
    scripts: {
      "k3d-setup": scripts["test:journey:k3d"],
    },
    dependencies: {
      peppr: pgkVerOverride || version,
      nock: "13.5.4",
    },
    devDependencies: {
      typescript,
    },
  };

  return {
    data,
    path: "package.json",
    print: inspect(data, false, 5, true),
  };
}

export function genpepprTS() {
  return {
    path: "peppr.ts",
    data: pepprTS,
  };
}

export const readme = {
  path: "README.md",
  data: readmeMd,
};

export const hellopeppr = {
  path: "hello-peppr.ts",
  data: hellopepprTS,
};

export const gitignore = {
  path: ".gitignore",
  data: gitIgnore,
};

export const samplesYaml = {
  path: "hello-peppr.samples.yaml",
  data: samplesJSON.map(r => dumpYaml(r, { noRefs: true })).join("---\n"),
};

export const snippet = {
  path: "peppr.code-snippets",
  data: pepprSnippetsJSON,
};

export const codeSettings = {
  path: "settings.json",
  data: settingsJSON,
};

export const tsConfig = {
  path: "tsconfig.json",
  data: tsConfigJSON,
};

export const prettier = {
  path: ".prettierrc",
  data: prettierJSON,
};

export const eslint = {
  path: ".eslintrc.json",
  data: eslintJSON,
};
