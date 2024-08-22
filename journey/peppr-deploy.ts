// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { describe, expect, it } from "@jest/globals";
import { execSync, spawnSync, spawn } from "child_process";
import { K8s, kind } from "kubernetes-fluent-client";
import { resolve } from "path";
import { destroyModule } from "../src/lib/assets/destroy";
import { cwd } from "./entrypoint.test";
import {
  deleteConfigMap,
  noWaitpepprStoreKey,
  waitForConfigMap,
  waitForConfigMapKey,
  waitForDeploymentReady,
  waitForNamespace,
  waitForpepprStoreKey,
  waitForSecret,
} from "./k8s";
import nock from 'nock';

export function pepprDeploy() {
  // Purge the peppr module from the cluster before running the tests
  destroyModule("peppr-static-test");

  it("should deploy the peppr controller into the test cluster", async () => {
    // Apply the store crd and peppr-system ns
    await applyStoreCRD();

    // Apply the store
    await applyLegacyStoreResource();

    /*
     * when controller starts up, it will migrate the store
     * and later on the keys will be tested to validate the migration
     */
    execSync("npx peppr deploy -i peppr:dev --confirm", { cwd, stdio: "inherit" });

    // Wait for the deployments to be ready
    await Promise.all([waitForDeploymentReady("peppr-system", "peppr-static-test"), waitForDeploymentReady("peppr-system", "peppr-static-test-watcher")]);
  });

  cleanupSamples();

  describe("should ignore resources not defined in the capability namespace", testIgnore);

  it("should perform validation of resources applied to the test cluster", testValidate);

  describe("should perform mutation of resources applied to the test cluster", testMutate);

  describe("should monitor the cluster for admission changes", () => {

    const until = (predicate: () => boolean): Promise<void> => {
      const poll = (resolve: () => void) => {
        if (predicate()) { resolve() }
        else { setTimeout(_ => poll(resolve), 250) }
      }
      return new Promise(poll);
    }

    it("npx peppr monitor should display validation results to console", async () => {
      await testValidate();

      const cmd = ['peppr', 'monitor', 'static-test']

      const proc = spawn('npx', cmd, { shell: true })

      const state = { accept: false, reject: false, done: false }
      proc.stdout.on('data', (data) => {
        const stdout: String = data.toString()
        state.accept = stdout.includes("✅") ? true : state.accept
        state.reject = stdout.includes("❌") ? true : state.reject
        expect(stdout.includes("IGNORED")).toBe(false)
        if (state.accept && state.reject) {
          proc.kill()
          proc.stdin.destroy()
          proc.stdout.destroy()
          proc.stderr.destroy()
        }
      })

      proc.on('exit', () => state.done = true);

      await until(() => state.done)

      // completes only if conditions are met, so... getting here means success!
    }, 10000);
  });

  describe("should display the UUIDs of the deployed modules", testUUID);

  describe("should store data in the pepprStore", testStore);

  cleanupSamples();
}

function cleanupSamples() {
  try {
    // Remove the sample yaml for the Hellopeppr capability
    execSync("kubectl delete -f hello-peppr.samples.yaml --ignore-not-found", {
      cwd: resolve(cwd, "capabilities"),
      stdio: "inherit",
    });

    deleteConfigMap("default", "example-1");
    deleteConfigMap("default", "example-evil-cm");
  } catch (e) {
    // Ignore errors
  }
}

function testUUID() {

  it("should display the UUIDs of the deployed modules", async () => {
    const uuidOut = spawnSync("npx peppr uuid", {
      shell: true, // Run command in a shell
      encoding: "utf-8", // Encode result as string
    });

    const { stdout } = uuidOut;

    // Check if the expected lines are in the output
    const expected = [
      "UUID\t\tDescription",
      "--------------------------------------------",
      "static-test\t",
    ].join("\n");
    expect(stdout).toMatch(expected);
  });

  it("should display the UUIDs of the deployed modules with a specific UUID", async () => {
    const uuidOut = spawnSync("npx peppr uuid static-test", {
      shell: true, // Run command in a shell
      encoding: "utf-8", // Encode result as string
    });

    const { stdout } = uuidOut;

    // Check if the expected lines are in the output
    const expected = [
      "UUID\t\tDescription",
      "--------------------------------------------",
      "static-test\t",
    ].join("\n");
    expect(stdout).toMatch(expected);
  });
};

function testIgnore() {
  it("should ignore resources not in the capability namespaces during mutation", async () => {
    const cm = await K8s(kind.ConfigMap).Apply({
      metadata: {
        name: "example-1",
        namespace: "default",
      },
    });
    expect(cm.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBeUndefined();
    expect(cm.metadata?.annotations?.["peppr.dev"]).toBeUndefined();
    expect(cm.metadata?.labels?.["peppr"]).toBeUndefined();
  });

  it("should ignore resources not in the capability namespaces during validation", async () => {
    const cm = await K8s(kind.ConfigMap).Apply({
      metadata: {
        name: "example-evil-cm",
        namespace: "default",
        annotations: {
          evil: "true",
        },
      },
    });
    expect(cm.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBeUndefined();
    expect(cm.metadata?.annotations?.["peppr.dev"]).toBeUndefined();
    expect(cm.metadata?.labels?.["peppr"]).toBeUndefined();
  });
}

async function testValidate() {
  // Apply the sample yaml for the Hellopeppr capability
  const applyOut = spawnSync("kubectl apply -f hello-peppr.samples.yaml", {
    shell: true, // Run command in a shell
    encoding: "utf-8", // Encode result as string
    cwd: resolve(cwd, "capabilities"),
  });

  const { stderr, status } = applyOut;

  // Validation should return an error
  expect(status).toBe(1);

  // Check if the expected lines are in the output
  const expected = [
    `Error from server: error when creating "hello-peppr.samples.yaml": `,
    `admission webhook "peppr-static-test.peppr.dev" denied the request: `,
    `No evil CM annotations allowed.\n`,
  ].join("");
  expect(stderr).toMatch(expected);

}

function testMutate() {
  it("should mutate the namespace", async () => {
    // Wait for the namespace to be created
    const ns = await waitForNamespace("peppr-demo");

    // Check if the namespace has the correct labels and annotations
    expect(ns.metadata?.labels).toEqual({
      "keep-me": "please",
      "kubernetes.io/metadata.name": "peppr-demo",
    });
    expect(ns.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
  });

  it("should mutate example-1", async () => {
    const cm1 = await waitForConfigMap("peppr-demo", "example-1");
    expect(cm1.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
    expect(cm1.metadata?.annotations?.["peppr.dev"]).toBe("annotations-work-too");
    expect(cm1.metadata?.labels?.["peppr"]).toBe("was-here");
  });

  it("should mutate example-2", async () => {
    const cm2 = await waitForConfigMap("peppr-demo", "example-2");
    expect(cm2.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
    expect(cm2.metadata?.annotations?.["peppr.dev"]).toBe("annotations-work-too");
    expect(cm2.metadata?.labels?.["peppr"]).toBe("was-here");
  });

  it("should mutate example-3", async () => {
    const cm3 = await waitForConfigMap("peppr-demo", "example-3");

    expect(cm3.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
    expect(cm3.metadata?.annotations?.["peppr.dev"]).toBe("making-waves");
    expect(cm3.data).toEqual({ key: "ex-3-val", username: "system:admin" });
  });

  it("should mutate example-4", async () => {
    const cm4 = await waitForConfigMap("peppr-demo", "example-4");
    expect(cm4.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
    expect(cm4.metadata?.labels?.["peppr.dev/first"]).toBe("true");
    expect(cm4.metadata?.labels?.["peppr.dev/second"]).toBe("true");
    expect(cm4.metadata?.labels?.["peppr.dev/third"]).toBe("true");
  });

  it("should mutate example-4a", async () => {
    const cm4a = await waitForConfigMap("peppr-demo-2", "example-4a");
    expect(cm4a.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
    expect(cm4a.metadata?.labels?.["peppr.dev/first"]).toBe("true");
    expect(cm4a.metadata?.labels?.["peppr.dev/second"]).toBe("true");
    expect(cm4a.metadata?.labels?.["peppr.dev/third"]).toBe("true");
  });

  it("should mutate example-5", async () => {

    const cm5 = await waitForConfigMap("peppr-demo", "example-5");

    expect(cm5.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
  });

  it("should mutate secret-1", async () => {
    const s1 = await waitForSecret("peppr-demo", "secret-1");

    expect(s1.metadata?.annotations?.["static-test.peppr.dev/hello-peppr"]).toBe("succeeded");
    expect(s1.data?.["example"]).toBe("dW5pY29ybiBtYWdpYyAtIG1vZGlmaWVkIGJ5IFBlcHI=");
    expect(s1.data?.["magic"]).toBe("Y2hhbmdlLXdpdGhvdXQtZW5jb2Rpbmc=");
    expect(s1.data?.["binary-data"]).toBe(
      "iCZQUg8xYucNUqD+8lyl2YcKjYYygvTtiDSEV9b9WKUkxSSLFJTgIWMJ9GcFFYs4T9JCdda51u74jfq8yHzRuEASl60EdTS/NfWgIIFTGqcNRfqMw+vgpyTMmCyJVaJEDFq6AA==",
    );
    expect(s1.data?.["ascii-with-white-space"]).toBe(
      "VGhpcyBpcyBzb21lIHJhbmRvbSB0ZXh0OgoKICAgIC0gd2l0aCBsaW5lIGJyZWFrcwogICAgLSBhbmQgdGFicw==",
    );
  });
}


function testStore() {
  it("should create the pepprStore", async () => {
    const resp = await waitForpepprStoreKey("peppr-static-test-store", "__peppr_do_not_delete__");
    expect(resp).toBe("k-thx-bye");
  });

  it("should write the correct data to the pepprStore", async () => {
    const key1 = await waitForpepprStoreKey("peppr-static-test-store", `hello-peppr-v2-example-1`);
    expect(key1).toBe("was-here");

    // Should have been migrated and removed
    const nullKey1 = await noWaitpepprStoreKey("peppr-static-test-store", `hello-peppr-example-1`);
    expect(nullKey1).toBeUndefined();

    const key2 = await waitForpepprStoreKey("peppr-static-test-store", `hello-peppr-v2-example-1-data`);
    expect(key2).toBe(JSON.stringify({ key: "ex-1-val" }));

    // Should have been migrated and removed
    const nullKey2 = await noWaitpepprStoreKey("peppr-static-test-store", `hello-peppr-example-1-data`);
    expect(nullKey2).toBeUndefined();

    // Should have a key from the joke url and getItem should have worked
    const key3 = await waitForpepprStoreKey("peppr-static-test-store", `hello-peppr-v2-https://icanhazdadjoke.com/`);
    expect(key3).toBeTruthy();

    const cm = await waitForConfigMapKey("peppr-demo", "example-5", "chuck-says");

    expect(cm.data?.["chuck-says"]).toBeTruthy();
  });

  it("should write the correct data to the pepprStore from a Watch Action", async () => {
    const key = await waitForpepprStoreKey("peppr-static-test-store", `hello-peppr-v2-watch-data`);
    expect(key).toBe("This data was stored by a Watch Action.");
  });
}

async function applyStoreCRD() {
  // Apply the store crd
  const appliedStoreCRD = spawnSync("kubectl apply -f journey/resources/peppr-store-crd.yaml", {
    shell: true, // Run command in a shell
    encoding: "utf-8", // Encode result as string
    cwd: resolve(cwd, ".."),
  });
  const { stdout } = appliedStoreCRD;

  expect(stdout).toContain("customresourcedefinition.apiextensions.k8s.io/pepprstores.peppr.dev");
}

async function applyLegacyStoreResource() {
  // Apply the store
  const appliedStore = spawnSync("kubectl apply -f journey/resources/non-migrated-pepprstore.yaml", {
    shell: true, // Run command in a shell
    encoding: "utf-8", // Encode result as string
    cwd: resolve(cwd, ".."),
  });
  const { stdout } = appliedStore;

  expect(stdout).toContain("pepprstore.peppr.dev/peppr-static-test-store");
}
