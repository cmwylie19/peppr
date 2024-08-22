// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { describe, expect, jest, it } from "@jest/globals";
import { execSync, spawnSync } from "child_process";;
import { promises as fs } from 'fs';

import {
    waitForDeploymentReady,
} from "./k8s";

jest.setTimeout(1000 * 60 * 5);

export function pepprUpgrade() {

    it("should prepare, build, and deploy hello-peppr with peppr@latest", async () => {
        try {
            // Install peppr@latest
            execSync("npm i peppr@latest", { cwd: "peppr-upgrade-test", stdio: "inherit" })

            // Update manifests of peppr@latest
            execSync("node ./node_modules/peppr/dist/cli.js update --skip-template-update", { cwd: "peppr-upgrade-test", stdio: "inherit" });

            // Generate manifests with peppr@latest
            execSync("node ./node_modules/peppr/dist/cli.js build", { cwd: "peppr-upgrade-test", stdio: "inherit" });

            // Deploy manifests of peppr@latest
            execSync("kubectl create -f dist/peppr-module-3b1b7ed6-88f6-54ec-9ae0-0dcc8a432456.yaml", { cwd: "peppr-upgrade-test", stdio: "inherit" });

            // Wait for the deployments to be ready
            await Promise.all([waitForDeploymentReady("peppr-system", "peppr-3b1b7ed6-88f6-54ec-9ae0-0dcc8a432456"), waitForDeploymentReady("peppr-system", "peppr-3b1b7ed6-88f6-54ec-9ae0-0dcc8a432456-watcher")]);
        }
        catch (error) {
            expect(error).toBeNull();
        }

    });

    it("should prepare, build, and deploy hello-peppr with peppr@pr-candidate", async () => {

        try {
            // Re-generate manifests with peppr@pr-candidate
            execSync("npx --yes ts-node ../src/cli.ts build", { cwd: "peppr-upgrade-test", stdio: "inherit" });

            // // Replace peppr@latest with peppr@pr-candidate image peppr:dev
            await replaceString("peppr-upgrade-test/dist/peppr-module-3b1b7ed6-88f6-54ec-9ae0-0dcc8a432456.yaml", "ghcr.io/cmwylie19/peppr/controller:v0.0.0-development", "peppr:dev");

            // Deploy manifests of peppr@latest
            const applyOut = spawnSync("kubectl apply -f dist/peppr-module-3b1b7ed6-88f6-54ec-9ae0-0dcc8a432456.yaml", {
                shell: true,
                encoding: "utf-8",
                cwd: "peppr-upgrade-test",
            });

            const { status } = applyOut;

            // Validation should not return an error
            expect(status).toBe(0);

            // Wait for the deployments to be ready
            await Promise.all([waitForDeploymentReady("peppr-system", "peppr-3b1b7ed6-88f6-54ec-9ae0-0dcc8a432456"), waitForDeploymentReady("peppr-system", "peppr-3b1b7ed6-88f6-54ec-9ae0-0dcc8a432456-watcher")]);
        }
        catch (error) {
            expect(error).toBeNull();
        }
    });
}

describe("Should test peppr upgrade", pepprUpgrade)

/**
 * Replace a string in a file and on error throws
 *
 * @param originalString - Original string to replace
 * @param newString - New string to replace with
 */
async function replaceString(filePath: string, originalString: string, newString: string) {
    try {
        let fileContent = await fs.readFile(filePath, 'utf8');
        const modifiedContent = fileContent.split(originalString).join(newString);
        await fs.writeFile(filePath, modifiedContent, 'utf8');
    } catch (error) {
        throw error
    }
}

