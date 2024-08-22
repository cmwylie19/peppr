// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { it } from "@jest/globals";
import { execSync } from "child_process";

import { cwd } from "./entrypoint.test";

export function pepprFormat() {
  it("should format the peppr project", () => {
    execSync("npx peppr format", { cwd, stdio: "inherit" });
  });
}
