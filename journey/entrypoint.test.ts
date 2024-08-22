// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { beforeAll, describe, jest } from "@jest/globals";

import { before } from "./before";
import { pepprBuild } from "./peppr-build";
import { pepprDeploy } from "./peppr-deploy";
import { pepprDev } from "./peppr-dev";
import { pepprFormat } from "./peppr-format";
import { pepprInit } from "./peppr-init";

// Unmock unit test things
jest.deepUnmock("pino");

// The working directory for the tests after `npx peppr init` is run
export const cwd = "peppr-test-module";

jest.setTimeout(1000 * 60 * 5);

// Configure the test environment before running the tests
beforeAll(before);

describe("Journey: `npx peppr init`", pepprInit);

describe("Journey: `npx peppr format`", pepprFormat);

describe("Journey: `npx peppr build`", pepprBuild);

describe("Journey: `npx peppr deploy`", pepprDeploy);

describe("Journey: `npx peppr dev`", pepprDev);
