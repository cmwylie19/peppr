// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { Binding, CapabilityExport } from "./types";
import {
  createRBACMap,
  addVerbIfNotExists,
  checkOverlap,
  filterNoMatchReason,
  validateHash,
  ValidationError,
  validateCapabilityNames,
} from "./helpers";
import { sanitizeResourceName } from "../sdk/sdk";
import * as fc from "fast-check";
import { expect, describe, test, jest, beforeEach, afterEach } from "@jest/globals";
import { parseTimeout, secretOverLimit, replaceString } from "./helpers";
import { promises as fs } from "fs";

import {
  createDirectoryIfNotExists,
  hasAnyOverlap,
  hasEveryOverlap,
  ignoredNamespaceConflict,
  bindingAndCapabilityNSConflict,
  generateWatchNamespaceError,
  namespaceComplianceValidator,
  dedent,
} from "./helpers";
import { SpiedFunction } from "jest-mock";

import { K8s, GenericClass, KubernetesObject } from "kubernetes-fluent-client";
import { K8sInit } from "kubernetes-fluent-client/dist/fluent/types";
import { checkDeploymentStatus, namespaceDeploymentsReady } from "./helpers";

jest.mock("kubernetes-fluent-client", () => {
  return {
    K8s: jest.fn(),
    kind: jest.fn(),
  };
});

jest.mock("fs", () => {
  return {
    promises: {
      access: jest.fn(),
      mkdir: jest.fn(),
    },
  };
});

const mockCapabilities: CapabilityExport[] = JSON.parse(`[
    {
        "name": "hello-peppr",
        "description": "A simple example capability to show how things work.",
        "namespaces": [
            "peppr-demo",
            "peppr-demo-2"
        ],
        "bindings": [
            {
                "kind": {
                    "kind": "Namespace",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "kind": "Namespace",
                    "version": "v1",
                    "group": ""
                },
                "event": "DELETE",
                "filters": {
                    "name": "peppr-demo-2",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isWatch": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "example-1",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "UPDATE",
                "filters": {
                    "name": "example-2",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "example-2",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isValidate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "example-2",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isWatch": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isValidate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATEORUPDATE",
                "filters": {
                    "name": "",
                    "namespaces": [],
                    "labels": {
                        "change": "by-label"
                    },
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "DELETE",
                "filters": {
                    "name": "",
                    "namespaces": [],
                    "labels": {
                        "change": "by-label"
                    },
                    "annotations": {}
                },
                "isValidate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "example-4",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "example-4a",
                    "namespaces": [
                        "peppr-demo-2"
                    ],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "kind": "ConfigMap",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "",
                    "namespaces": [],
                    "labels": {
                        "chuck-norris": ""
                    },
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "kind": "Secret",
                    "version": "v1",
                    "group": ""
                },
                "event": "CREATE",
                "filters": {
                    "name": "secret-1",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "group": "peppr.dev",
                    "version": "v1",
                    "kind": "Unicorn"
                },
                "event": "CREATE",
                "filters": {
                    "name": "example-1",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            },
            {
                "kind": {
                    "group": "peppr.dev",
                    "version": "v1",
                    "kind": "Unicorn"
                },
                "event": "CREATE",
                "filters": {
                    "name": "example-2",
                    "namespaces": [],
                    "labels": {},
                    "annotations": {}
                },
                "isMutate": true
            }
        ]
    }
]`);

describe("validateCapabilityNames Property-Based Tests", () => {
  test("should only accept names that are valid after sanitation", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string(),
            bindings: fc.array(fc.anything()),
            hasSchedule: fc.boolean(),
          }),
        ),
        capabilities => {
          if (capabilities.every(cap => cap.name === sanitizeResourceName(cap.name))) {
            expect(() => validateCapabilityNames(capabilities as CapabilityExport[])).not.toThrow();
          } else {
            expect(() => validateCapabilityNames(capabilities as CapabilityExport[])).toThrowError(
              /not a valid Kubernetes resource name/,
            );
          }
        },
      ),
    );
  });
});

describe("validateCapabilityNames", () => {
  test("should return true if all capability names are valid", () => {
    const capabilities = mockCapabilities;
    expect(() => validateCapabilityNames(capabilities)).not.toThrow();
  });

  test("should throw an error if a capability name is invalid", () => {
    const capabilities = mockCapabilities;
    capabilities[0].name = "invalid name";
    expect(() => validateCapabilityNames(capabilities)).toThrowError(ValidationError);
  });

  test("should ignore when capabilities are not loaded", () => {
    expect(validateCapabilityNames(undefined)).toBe(undefined);
  });
});
describe("createRBACMap", () => {
  test("should return the correct RBACMap for given capabilities", () => {
    const result = createRBACMap(mockCapabilities);

    const expected = {
      "peppr.dev/v1/pepprstore": {
        verbs: ["create", "get", "patch", "watch"],
        plural: "pepprstores",
      },
      "apiextensions.k8s.io/v1/customresourcedefinition": {
        verbs: ["patch", "create"],
        plural: "customresourcedefinitions",
      },
      "/v1/Namespace": { verbs: ["watch"], plural: "namespaces" },
      "/v1/ConfigMap": { verbs: ["watch"], plural: "configmaps" },
    };

    expect(result).toEqual(expected);
  });
});

describe("addVerbIfNotExists", () => {
  test("should add a verb if it does not exist in the array", () => {
    const verbs = ["get", "list"];
    addVerbIfNotExists(verbs, "watch");
    expect(verbs).toEqual(["get", "list", "watch"]);
  });

  test("should not add a verb if it already exists in the array", () => {
    const verbs = ["get", "list", "watch"];
    addVerbIfNotExists(verbs, "get");
    expect(verbs).toEqual(["get", "list", "watch"]); // The array remains unchanged
  });
});

describe("createDirectoryIfNotExists function", () => {
  test("should create a directory if it doesn't exist", async () => {
    (fs.access as jest.Mock).mockRejectedValue({ code: "ENOENT" } as never);
    (fs.mkdir as jest.Mock).mockResolvedValue(undefined as never);

    const directoryPath = "/peppr/peppr-test-module/asdf";

    await createDirectoryIfNotExists(directoryPath);

    expect(fs.access).toHaveBeenCalledWith(directoryPath);
    expect(fs.mkdir).toHaveBeenCalledWith(directoryPath, { recursive: true });
  });

  test("should not create a directory if it already exists", async () => {
    jest.resetAllMocks();
    (fs.access as jest.Mock).mockResolvedValue(undefined as never);

    const directoryPath = "/peppr/peppr-test-module/asdf";

    await createDirectoryIfNotExists(directoryPath);

    expect(fs.access).toHaveBeenCalledWith(directoryPath);
    expect(fs.mkdir).not.toHaveBeenCalled();
  });

  test("should throw an error for other fs.access errors", async () => {
    jest.resetAllMocks();
    (fs.access as jest.Mock).mockRejectedValue({ code: "ERROR" } as never);

    const directoryPath = "/peppr/peppr-test-module/asdf";

    try {
      await createDirectoryIfNotExists(directoryPath);
    } catch (error) {
      expect(error.code).toEqual("ERROR");
    }
  });
});

describe("hasAnyOverlap", () => {
  test("returns true for overlapping arrays", () => {
    expect(hasAnyOverlap([1, 2, 3], [3, 4, 5])).toBe(true);
  });

  test("returns false for non-overlapping arrays", () => {
    expect(hasAnyOverlap([1, 2, 3], [4, 5, 6])).toBe(false);
  });

  test("returns false for empty arrays", () => {
    expect(hasAnyOverlap([], [1, 2, 3])).toBe(false);
    expect(hasAnyOverlap([1, 2, 3], [])).toBe(false);
  });

  test("returns false for two empty arrays", () => {
    expect(hasAnyOverlap([], [])).toBe(false);
  });
});

describe("hasEveryOverlap", () => {
  test("returns true if all elements in array1 are in array2", () => {
    expect(hasEveryOverlap([1, 2], [1, 2, 3])).toBe(true);
  });

  test("returns false if any element in array1 is not in array2", () => {
    expect(hasEveryOverlap([1, 2, 4], [1, 2, 3])).toBe(false);
  });

  test("returns true if array1 is empty", () => {
    expect(hasEveryOverlap([], [1, 2, 3])).toBe(true);
  });

  test("returns false if array2 is empty", () => {
    expect(hasEveryOverlap([1, 2], [])).toBe(false);
  });

  test("returns true if both arrays are empty", () => {
    expect(hasEveryOverlap([], [])).toBe(true);
  });
});

describe("ignoredNamespaceConflict", () => {
  test("returns true if there is an overlap", () => {
    expect(ignoredNamespaceConflict(["ns1", "ns2"], ["ns2", "ns3"])).toBe(true);
  });

  test("returns false if there is no overlap", () => {
    expect(ignoredNamespaceConflict(["ns1", "ns2"], ["ns3", "ns4"])).toBe(false);
  });

  test("returns false if either array is empty", () => {
    expect(ignoredNamespaceConflict([], ["ns1", "ns2"])).toBe(false);
    expect(ignoredNamespaceConflict(["ns1", "ns2"], [])).toBe(false);
  });

  test("returns false if both arrays are empty", () => {
    expect(ignoredNamespaceConflict([], [])).toBe(false);
  });
});

describe("bindingAndCapabilityNSConflict", () => {
  test("returns false if capabilityNamespaces is empty", () => {
    expect(bindingAndCapabilityNSConflict(["ns1", "ns2"], [])).toBe(false);
  });

  test("returns true if capability namespaces are not empty and there is no overlap with binding namespaces", () => {
    expect(bindingAndCapabilityNSConflict(["ns1", "ns2"], ["ns3", "ns4"])).toBe(true);
  });

  test("returns true if capability namespaces are not empty and there is an overlap", () => {
    expect(bindingAndCapabilityNSConflict(["ns1", "ns2"], ["ns2", "ns3"])).toBe(true);
  });

  test("returns false if both arrays are empty", () => {
    expect(bindingAndCapabilityNSConflict([], [])).toBe(false);
  });
});

describe("generateWatchNamespaceError", () => {
  test("returns error for ignored namespace conflict", () => {
    const error = generateWatchNamespaceError(["ns1"], ["ns1"], []);
    expect(error).toBe("Binding uses a peppr ignored namespace: ignoredNamespaces: [ns1] bindingNamespaces: [ns1].");
  });

  test("returns error for binding and capability namespace conflict", () => {
    const error = generateWatchNamespaceError([""], ["ns2"], ["ns3"]);
    expect(error).toBe(
      "Binding uses namespace not governed by capability: bindingNamespaces: [ns2] capabilityNamespaces: [ns3].",
    );
  });

  test("returns combined error for both conflicts", () => {
    const error = generateWatchNamespaceError(["ns1"], ["ns1"], ["ns3", "ns4"]);
    expect(error).toBe(
      "Binding uses a peppr ignored namespace: ignoredNamespaces: [ns1] bindingNamespaces: [ns1]. Binding uses namespace not governed by capability: bindingNamespaces: [ns1] capabilityNamespaces: [ns3, ns4].",
    );
  });

  test("returns empty string when there are no conflicts", () => {
    const error = generateWatchNamespaceError([], ["ns2"], []);
    expect(error).toBe("");
  });
});

const nsViolation: CapabilityExport[] = JSON.parse(`[
  {
      "name": "test-capability-namespaces",
      "description": "Should be confined to namespaces listed in capabilities and not be able to use ignored namespaces",
      "namespaces": [
          "miami",
          "dallas",
          "milwaukee"
      ],
      "bindings": [
          {
              "kind": {
                  "kind": "Namespace",
                  "version": "v1",
                  "group": ""
              },
              "event": "CREATE",
              "filters": {
                  "name": "",
                  "namespaces": ["new york"],
                  "labels": {},
                  "annotations": {}
              },
              "isMutate": true
          }
      ]
  }
]`);

const allNSCapabilities: CapabilityExport[] = JSON.parse(`[
  {
      "name": "test-capability-namespaces",
      "description": "Should be confined to namespaces listed in capabilities and not be able to use ignored namespaces",
      "namespaces": [],
      "bindings": [
          {
              "kind": {
                  "kind": "Namespace",
                  "version": "v1",
                  "group": ""
              },
              "event": "CREATE",
              "filters": {
                  "name": "",
                  "namespaces": ["new york"],
                  "labels": {},
                  "annotations": {}
              },
              "isMutate": true
          }
      ]
  }
]`);

const nonNsViolation: CapabilityExport[] = JSON.parse(`[
  {
      "name": "test-capability-namespaces",
      "description": "Should be confined to namespaces listed in capabilities and not be able to use ignored namespaces",
      "namespaces": [
          "miami",
          "dallas",
          "milwaukee"
      ],
      "bindings": [
          {
              "kind": {
                  "kind": "Namespace",
                  "version": "v1",
                  "group": ""
              },
              "event": "CREATE",
              "filters": {
                  "name": "",
                  "namespaces": ["miami"],
                  "labels": {},
                  "annotations": {}
              },
              "isMutate": true
          }
      ]
  }
]`);

describe("namespaceComplianceValidator", () => {
  let errorSpy: SpiedFunction<{ (...data: unknown[]): void; (message?: unknown, ...optionalParams: unknown[]): void }>;
  beforeEach(() => {
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test("should not throw an error for invalid namespaces", () => {
    expect(() => {
      namespaceComplianceValidator(nonNsViolation[0]);
    }).not.toThrow();
  });

  test("should throw an error for binding namespace using a non capability namespace", () => {
    try {
      namespaceComplianceValidator(nsViolation[0]);
    } catch (e) {
      expect(e.message).toBe(
        "Error in test-capability-namespaces capability. A binding violates namespace rules. Please check ignoredNamespaces and capability namespaces: Binding uses namespace not governed by capability: bindingNamespaces: [new york] capabilityNamespaces: [miami, dallas, milwaukee].",
      );
    }
  });

  test("should throw an error for binding namespace using an ignored namespace: Part 1", () => {
    /*
     * this test case lists miami as a capability namespace, but also as an ignored namespace
     * in this case, there should be an error since ignoredNamespaces have precedence
     */
    try {
      namespaceComplianceValidator(nonNsViolation[0], ["miami"]);
    } catch (e) {
      expect(e.message).toBe(
        "Error in test-capability-namespaces capability. A binding violates namespace rules. Please check ignoredNamespaces and capability namespaces: Binding uses a peppr ignored namespace: ignoredNamespaces: [miami] bindingNamespaces: [miami].",
      );
    }
  });

  test("should throw an error for binding namespace using an ignored namespace: Part 2", () => {
    /*
     * This capability uses all namespaces but new york should be ignored
     * the binding uses new york so it should fail
     */
    try {
      namespaceComplianceValidator(allNSCapabilities[0], ["new york"]);
    } catch (e) {
      expect(e.message).toBe(
        "Error in test-capability-namespaces capability. A binding violates namespace rules. Please check ignoredNamespaces and capability namespaces: Binding uses a peppr ignored namespace: ignoredNamespaces: [new york] bindingNamespaces: [new york].",
      );
    }
  });
});

describe("checkDeploymentStatus", () => {
  const mockK8s = jest.mocked(K8s);

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.useRealTimers();
  });
  test("should return true if all deployments are ready", async () => {
    const deployments = {
      items: [
        {
          metadata: {
            name: "watcher",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 1,
          },
          status: {
            readyReplicas: 1,
          },
        },
        {
          metadata: {
            name: "admission",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 2,
          },
          status: {
            readyReplicas: 2,
          },
        },
      ],
    };

    mockK8s.mockImplementation(<T extends GenericClass, K extends KubernetesObject>() => {
      return {
        InNamespace: jest.fn().mockReturnThis(),
        Get: () => deployments,
      } as unknown as K8sInit<T, K>;
    });

    const expected = true;
    const result = await checkDeploymentStatus("peppr-system");
    expect(result).toBe(expected);
  });

  test("should return false if any deployments are not ready", async () => {
    const deployments = {
      items: [
        {
          metadata: {
            name: "watcher",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 1,
          },
          status: {
            readyReplicas: 1,
          },
        },
        {
          metadata: {
            name: "admission",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 2,
          },
          status: {
            readyReplicas: 1,
          },
        },
      ],
    };

    mockK8s.mockImplementation(<T extends GenericClass, K extends KubernetesObject>() => {
      return {
        InNamespace: jest.fn().mockReturnThis(),
        Get: () => deployments,
      } as unknown as K8sInit<T, K>;
    });

    const expected = false;
    const result = await checkDeploymentStatus("peppr-system");
    expect(result).toBe(expected);
  });
});

describe("namespaceDeploymentsReady", () => {
  const mockK8s = jest.mocked(K8s);

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  test("should return true if all deployments are ready", async () => {
    const deployments = {
      items: [
        {
          metadata: {
            name: "watcher",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 1,
          },
          status: {
            readyReplicas: 1,
          },
        },
        {
          metadata: {
            name: "admission",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 2,
          },
          status: {
            readyReplicas: 2,
          },
        },
      ],
    };

    mockK8s.mockImplementation(<T extends GenericClass, K extends KubernetesObject>() => {
      return {
        InNamespace: jest.fn().mockReturnThis(),
        Get: () => deployments,
      } as unknown as K8sInit<T, K>;
    });

    const expected = true;
    const result = await namespaceDeploymentsReady();
    expect(result).toBe(expected);
  });

  test("should call checkDeploymentStatus if any deployments are not ready", async () => {
    const deployments = {
      items: [
        {
          metadata: {
            name: "watcher",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 1,
          },
          status: {
            readyReplicas: 1,
          },
        },
        {
          metadata: {
            name: "admission",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 2,
          },
          status: {
            readyReplicas: 1,
          },
        },
      ],
    };

    const deployments2 = {
      items: [
        {
          metadata: {
            name: "watcher",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 1,
          },
          status: {
            readyReplicas: 1,
          },
        },
        {
          metadata: {
            name: "admission",
            namespace: "peppr-system",
          },
          spec: {
            replicas: 2,
          },
          status: {
            readyReplicas: 2,
          },
        },
      ],
    };

    mockK8s
      .mockImplementation(<T extends GenericClass, K extends KubernetesObject>() => {
        return {
          InNamespace: jest.fn().mockReturnThis(),
          Get: () => deployments,
        } as unknown as K8sInit<T, K>;
      })
      .mockImplementation(<T extends GenericClass, K extends KubernetesObject>() => {
        return {
          InNamespace: jest.fn().mockReturnThis(),
          Get: () => deployments2,
        } as unknown as K8sInit<T, K>;
      });

    const expected = true;
    const result = await namespaceDeploymentsReady();

    expect(result).toBe(expected);

    expect(mockK8s).toHaveBeenCalledTimes(1);
  });
});

describe("parseTimeout", () => {
  const PREV = "a";
  test("should return a number when a valid string number between 1 and 30 is provided", () => {
    expect(parseTimeout("5", PREV)).toBe(5);
    expect(parseTimeout("1", PREV)).toBe(1);
    expect(parseTimeout("30", PREV)).toBe(30);
  });

  test("should throw an InvalidArgumentError for non-numeric strings", () => {
    expect(() => parseTimeout("abc", PREV)).toThrow(Error);
    expect(() => parseTimeout("", PREV)).toThrow(Error);
  });

  test("should throw an InvalidArgumentError for numbers outside the 1-30 range", () => {
    expect(() => parseTimeout("0", PREV)).toThrow(Error);
    expect(() => parseTimeout("31", PREV)).toThrow(Error);
  });

  test("should throw an InvalidArgumentError for numeric strings that represent floating point numbers", () => {
    expect(() => parseTimeout("5.5", PREV)).toThrow(Error);
    expect(() => parseTimeout("20.1", PREV)).toThrow(Error);
  });
});

describe("secretOverLimit", () => {
  test("should return true for a string larger than 1MiB", () => {
    const largeString = "a".repeat(1048577);
    expect(secretOverLimit(largeString)).toBe(true);
  });

  test("should return false for a string smaller than 1MiB", () => {
    const smallString = "a".repeat(1048575);
    expect(secretOverLimit(smallString)).toBe(false);
  });
});

describe("dedent", () => {
  test("removes leading spaces based on the smallest indentation", () => {
    const input = `
      kind: Namespace
      metadata:
        name: peppr-system
      `;
    const inputArray = dedent(input).split(/\r?\n/);

    expect(inputArray[0]).toBe("kind: Namespace");
    expect(inputArray[1]).toBe("metadata:");
    expect(inputArray[2]).toBe("  name: peppr-system");
  });

  test("does not remove internal spacing of lines", () => {
    const input = `kind: ->>>      Namespace`;

    expect(dedent(input)).toBe("kind: ->>>      Namespace");
  });

  test("handles strings without leading whitespace consistently", () => {
    const input = `kind: Namespace
metadata:`;

    const inputArray = dedent(input).split(/\r?\n/);
    expect(inputArray[0]).toBe("kind: Namespace");
    expect(inputArray[1]).toBe("metadata:");
  });

  test("handles empty strings without crashing", () => {
    const input = ``;
    const expected = ``;
    expect(dedent(input)).toBe(expected);
  });
});

describe("replaceString", () => {
  test("replaces single instance of a string", () => {
    const original = "Hello, world!";
    const stringA = "world";
    const stringB = "Jest";
    const expected = "Hello, Jest!";
    expect(replaceString(original, stringA, stringB)).toBe(expected);
  });

  test("replaces multiple instances of a string", () => {
    const original = "Repeat, repeat, repeat";
    const stringA = "repeat";
    const stringB = "done";
    const expected = "Repeat, done, done";
    expect(replaceString(original, stringA, stringB)).toBe(expected);
  });

  test("does nothing if string to replace is not found", () => {
    const original = "Nothing changes here";
    const stringA = "absent";
    const stringB = "present";
    const expected = "Nothing changes here";
    expect(replaceString(original, stringA, stringB)).toBe(expected);
  });

  test("escapes special regex characters in string to be replaced", () => {
    const original = "Find the period.";
    const stringA = ".";
    const stringB = "!";
    const expected = "Find the period!";
    expect(replaceString(original, stringA, stringB)).toBe(expected);
  });

  test("replaces string with empty string if stringB is empty", () => {
    const original = "Remove this part.";
    const stringA = " this part";
    const stringB = "";
    const expected = "Remove.";
    expect(replaceString(original, stringA, stringB)).toBe(expected);
  });
});

describe("checkOverlap", () => {
  test("should return false since all binding annotations/labels do not exist on the object", () => {
    expect(checkOverlap({ key1: "", key2: "" }, { key1: "something" })).toBe(false);
  });
  test("should return false since all binding annotations/labels values do not match on the object values", () => {
    expect(checkOverlap({ key1: "key1", key2: "key2" }, { key1: "value1", key2: "key2" })).toBe(false);
  });
  test("should return true since all binding annotations/labels keys and values match the object keys and values", () => {
    expect(checkOverlap({ key1: "key1", key2: "key2" }, { key1: "key1", key2: "key2" })).toBe(true);
  });

  test("should return true since all binding annotations/labels keys exist on the object", () => {
    expect(checkOverlap({ key1: "", key2: "" }, { key1: "key1", key2: "key2" })).toBe(true);
  });

  test("(Mixed) should return true since key and key value match on object", () => {
    expect(checkOverlap({ key1: "one", key2: "" }, { key1: "one", key2: "something" })).toBe(true);
  });
  test("(Mixed) should return false since key1 value is different on object", () => {
    expect(checkOverlap({ key1: "one", key2: "" }, { key1: "different", key2: "" })).toBe(false);
  });
  test("should return true if binding has no labels or annotations", () => {
    expect(checkOverlap({}, { key1: "value1" })).toBe(true);
  });

  test("should return false if there is no overlap", () => {
    expect(checkOverlap({ key1: "value1" }, { key2: "value2" })).toBe(false);
  });

  test("should return true since object has key1 and value1", () => {
    expect(checkOverlap({ key1: "value1" }, { key1: "value1", key2: "value2" })).toBe(true);
  });

  test("should return false since object value does not match binding value", () => {
    expect(checkOverlap({ key1: "value1" }, { key1: "value2" })).toBe(false);
  });

  test("should return true if the object has no labels and neither does the binding", () => {
    expect(checkOverlap({}, {})).toBe(true);
  });
});

describe("filterMatcher", () => {
  test("returns namespace filter error for namespace objects with namespace filters", () => {
    const binding = {
      kind: { kind: "Namespace" },
      filters: { namespaces: ["ns1"] },
    };
    const obj = {};
    const capabilityNamespaces: string[] = [];
    const result = filterNoMatchReason(
      binding as unknown as Partial<Binding>,
      obj as unknown as Partial<KubernetesObject>,
      capabilityNamespaces,
    );
    expect(result).toEqual("Ignoring Watch Callback: Cannot use a namespace filter in a namespace object.");
  });

  test("returns label overlap error when there is no overlap between binding and object labels", () => {
    const binding = {
      filters: { labels: { key: "value" } },
    };
    const obj = {
      metadata: { labels: { anotherKey: "anotherValue" } },
    };
    const capabilityNamespaces: string[] = [];
    const result = filterNoMatchReason(
      binding as unknown as Partial<Binding>,
      obj as unknown as Partial<KubernetesObject>,
      capabilityNamespaces,
    );
    expect(result).toEqual(
      'Ignoring Watch Callback: No overlap between binding and object labels. Binding labels {"key":"value"}, Object Labels {"anotherKey":"anotherValue"}.',
    );
  });

  test("returns annotation overlap error when there is no overlap between binding and object annotations", () => {
    const binding = {
      filters: { annotations: { key: "value" } },
    };
    const obj = {
      metadata: { annotations: { anotherKey: "anotherValue" } },
    };
    const capabilityNamespaces: string[] = [];
    const result = filterNoMatchReason(
      binding as unknown as Partial<Binding>,
      obj as unknown as Partial<KubernetesObject>,
      capabilityNamespaces,
    );
    expect(result).toEqual(
      'Ignoring Watch Callback: No overlap between binding and object annotations. Binding annotations {"key":"value"}, Object annotations {"anotherKey":"anotherValue"}.',
    );
  });

  test("returns capability namespace error when object is not in capability namespaces", () => {
    const binding = {};
    const obj = {
      metadata: { namespace: "ns2" },
    };
    const capabilityNamespaces = ["ns1"];
    const result = filterNoMatchReason(
      binding as unknown as Partial<Binding>,
      obj as unknown as Partial<KubernetesObject>,
      capabilityNamespaces,
    );
    expect(result).toEqual(
      "Ignoring Watch Callback: Object is not in the capability namespace. Capability namespaces: ns1, Object namespace: ns2.",
    );
  });

  test("returns binding namespace error when filter namespace is not part of capability namespaces", () => {
    const binding = {
      filters: { namespaces: ["ns3"] },
    };
    const obj = {};
    const capabilityNamespaces = ["ns1", "ns2"];
    const result = filterNoMatchReason(
      binding as unknown as Partial<Binding>,
      obj as unknown as Partial<KubernetesObject>,
      capabilityNamespaces,
    );
    expect(result).toEqual(
      "Ignoring Watch Callback: Binding namespace is not part of capability namespaces. Capability namespaces: ns1, ns2, Binding namespaces: ns3.",
    );
  });

  test("returns binding and object namespace error when they do not overlap", () => {
    const binding = {
      filters: { namespaces: ["ns1"] },
    };
    const obj = {
      metadata: { namespace: "ns2" },
    };
    const capabilityNamespaces = ["ns1", "ns2"];
    const result = filterNoMatchReason(
      binding as unknown as Partial<Binding>,
      obj as unknown as Partial<KubernetesObject>,
      capabilityNamespaces,
    );
    expect(result).toEqual(
      "Ignoring Watch Callback: Binding namespace and object namespace are not the same. Binding namespaces: ns1, Object namespace: ns2.",
    );
  });

  test("returns empty string when all checks pass", () => {
    const binding = {
      filters: { namespaces: ["ns1"], labels: { key: "value" }, annotations: { key: "value" } },
    };
    const obj = {
      metadata: { namespace: "ns1", labels: { key: "value" }, annotations: { key: "value" } },
    };
    const capabilityNamespaces = ["ns1"];
    const result = filterNoMatchReason(
      binding as unknown as Partial<Binding>,
      obj as unknown as Partial<KubernetesObject>,
      capabilityNamespaces,
    );
    expect(result).toEqual("");
  });
});

describe("validateHash", () => {
  let originalExit: (code?: number) => never;

  beforeEach(() => {
    originalExit = process.exit;
    process.exit = jest.fn() as unknown as (code?: number) => never;
  });

  afterEach(() => {
    process.exit = originalExit;
  });
  test("should throw ValidationError for invalid hash values", () => {
    // Examples of invalid hashes
    const invalidHashes = [
      "", // Empty string
      "12345", // Too short
      "zxcvbnmasdfghjklqwertyuiop1234567890zxcvbnmasdfghjklqwertyuio", // Contains invalid character 'z'
      "123456789012345678901234567890123456789012345678901234567890123", // 63 characters, one short
    ];

    invalidHashes.forEach(hash => {
      expect(() => validateHash(hash)).toThrow(ValidationError);
    });
  });

  test("should not throw ValidationError for valid SHA-256 hash", () => {
    // Example of a valid SHA-256 hash
    const validHash = "abc123def456abc123def456abc123def456abc123def456abc123def456abc1";
    expect(() => validateHash(validHash)).not.toThrow();
  });
});
