// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { it } from "@jest/globals";
import { execSync } from "child_process";

export function pepprInit() {
  it("should create a new peppr project", () => {
    const pepprAlias = "file:peppr-0.0.0-development.tgz";
    execSync(`TEST_MODE=true npx --yes ${pepprAlias} init`, { stdio: "inherit" });
  });
}
