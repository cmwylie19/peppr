// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { beforeEach, expect, jest, test, describe } from "@jest/globals";
import { clone } from "ramda";
import { Capability } from "./capability";
import { Schedule } from "./schedule";
import { Errors } from "./errors";
import { PackageJSON, pepprModule } from "./module";
import { CapabilityExport } from "./types";

// Mock Controller
const startServerMock = jest.fn();
jest.mock("./controller", () => {
  return {
    Controller: jest.fn().mockImplementation(() => {
      return { startServer: startServerMock };
    }),
  };
});

// Reset the mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Mock PackageJSON
const packageJSON: PackageJSON = {
  description: "Test Description",
  peppr: {
    uuid: "20e17cf6-a2e4-46b2-b626-75d88d96c88b",
    description: "Development module for peppr",
    onError: "ignore",
    alwaysIgnore: {
      namespaces: [],
    },
  },
};

test("should instantiate Controller and start it with the default port", () => {
  new pepprModule(packageJSON);
  expect(startServerMock).toHaveBeenCalledWith(3000);
});

test("should instantiate Controller and start it with the specified port", () => {
  const module = new pepprModule(packageJSON, [], { deferStart: true });
  const port = Math.floor(Math.random() * 10000) + 1000;
  module.start(port);
  expect(startServerMock).toHaveBeenCalledWith(port);
});

test("should not start if deferStart is true", () => {
  new pepprModule(packageJSON, [], { deferStart: true });
  expect(startServerMock).not.toHaveBeenCalled();
});

test("should reject invalid peppr onError conditions", () => {
  const cfg = clone(packageJSON);
  cfg.peppr.onError = "invalidError";
  expect(() => new pepprModule(cfg)).toThrow();
});

test("should allow valid peppr onError conditions", () => {
  const cfg = clone(packageJSON);
  cfg.peppr.onError = Errors.audit;
  expect(() => new pepprModule(cfg)).not.toThrow();

  cfg.peppr.onError = Errors.ignore;
  expect(() => new pepprModule(cfg)).not.toThrow();

  cfg.peppr.onError = Errors.reject;
  expect(() => new pepprModule(cfg)).not.toThrow();
});

test("should not create a controller if peppr_MODE is set to build", () => {
  process.env.peppr_MODE = "build";
  new pepprModule(packageJSON);
  expect(startServerMock).not.toHaveBeenCalled();
});

test("should send the capabilities to the parent process if peppr_MODE is set to build", () => {
  const sendMock = jest.spyOn(process, "send").mockImplementation(() => true);
  process.env.peppr_MODE = "build";

  const capability = new Capability({
    name: "test",
    description: "test",
  });

  const expected: CapabilityExport = {
    name: capability.name,
    description: capability.description,
    namespaces: capability.namespaces,
    bindings: capability.bindings,
    hasSchedule: capability.hasSchedule,
  };

  new pepprModule(packageJSON, [capability]);
  expect(sendMock).toHaveBeenCalledWith([expected]);
});

describe("Capability", () => {
  let capability: Capability;
  let schedule: Schedule;

  beforeEach(() => {
    capability = new Capability({
      name: "test",
      description: "test",
    });
    schedule = {
      name: "test-name",
      every: 1,
      unit: "seconds",
      run: jest.fn(),
      startTime: new Date(),
      completions: 1,
    };
  });

  test("should handle OnSchedule", () => {
    const { OnSchedule } = capability;
    OnSchedule(schedule);
    expect(capability.hasSchedule).toBe(true);
  });
});
