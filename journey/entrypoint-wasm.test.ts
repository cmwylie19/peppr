// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import {  describe, jest } from "@jest/globals";

import { pepprBuild } from "./peppr-build-wasm";


// Unmock unit test things
jest.deepUnmock("pino");


// Allow 5 minutes for the tests to run
jest.setTimeout(1000 * 60 * 5);

describe("Journey: `npx peppr build -r gchr.io/defenseunicorns --rbac-mode scoped -o dist/peppr-test-module/child/folder`", pepprBuild);
