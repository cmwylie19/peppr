// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { expect, test } from "@jest/globals";
import prompts from "prompts";

import { walkthrough } from "./walkthrough";

test("walkthrough() returns expected results", async () => {
  // Inject predefined answers for the prompts
  prompts.inject(["My Test Module", "A test module for peppr", 0]);

  const result = await walkthrough();

  // Check the returned object
  expect(result).toEqual({
    name: "My Test Module",
    description: "A test module for peppr",
    errorBehavior: 0,
  });
});
