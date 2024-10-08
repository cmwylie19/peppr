// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import jsonPatch from "fast-json-patch";
import { kind } from "kubernetes-fluent-client";

import { Capability } from "./capability";
import { Errors } from "./errors";
import { shouldSkipRequest } from "./filter";
import { MutateResponse, AdmissionRequest } from "./k8s";
import Log from "./logger";
import { ModuleConfig } from "./module";
import { pepprMutateRequest } from "./mutate-request";
import { base64Encode, convertFromBase64Map, convertToBase64Map } from "./utils";

export async function mutateProcessor(
  config: ModuleConfig,
  capabilities: Capability[],
  req: AdmissionRequest,
  reqMetadata: Record<string, string>,
): Promise<MutateResponse> {
  const wrapped = new pepprMutateRequest(req);
  const response: MutateResponse = {
    uid: req.uid,
    warnings: [],
    allowed: false,
  };

  // Track whether any capability matched the request
  let matchedAction = false;

  // Track data fields that should be skipped during decoding
  let skipDecode: string[] = [];

  // If the resource is a secret, decode the data
  const isSecret = req.kind.version == "v1" && req.kind.kind == "Secret";
  if (isSecret) {
    skipDecode = convertFromBase64Map(wrapped.Raw as unknown as kind.Secret);
  }

  Log.info(reqMetadata, `Processing request`);

  for (const { name, bindings, namespaces } of capabilities) {
    const actionMetadata = { ...reqMetadata, name };

    for (const action of bindings) {
      // Skip this action if it's not a mutate action
      if (!action.mutateCallback) {
        continue;
      }

      // Continue to the next action without doing anything if this one should be skipped
      if (shouldSkipRequest(action, req, namespaces)) {
        continue;
      }

      const label = action.mutateCallback.name;
      Log.info(actionMetadata, `Processing mutation action (${label})`);

      matchedAction = true;

      // Add annotations to the request to indicate that the capability started processing
      // this will allow tracking of failed mutations that were permitted to continue
      const updateStatus = (status: string) => {
        // Only update the status if the request is a CREATE or UPDATE (we don't use CONNECT)
        if (req.operation == "DELETE") {
          return;
        }

        const identifier = `${config.uuid}.peppr.dev/${name}`;
        wrapped.Raw.metadata = wrapped.Raw.metadata || {};
        wrapped.Raw.metadata.annotations = wrapped.Raw.metadata.annotations || {};
        wrapped.Raw.metadata.annotations[identifier] = status;
      };

      updateStatus("started");

      try {
        // Run the action
        await action.mutateCallback(wrapped);

        Log.info(actionMetadata, `Mutation action succeeded (${label})`);

        // Add annotations to the request to indicate that the capability succeeded
        updateStatus("succeeded");
      } catch (e) {
        updateStatus("warning");
        response.warnings = response.warnings || [];

        let errorMessage = "";

        try {
          if (e.message && e.message !== "[object Object]") {
            errorMessage = e.message;
          } else {
            throw new Error("An error occurred in the mutate action.");
          }
        } catch (e) {
          errorMessage = "An error occurred with the mutate action.";
        }

        Log.error(actionMetadata, `Action failed: ${errorMessage}`);
        response.warnings.push(`Action failed: ${errorMessage}`);

        switch (config.onError) {
          case Errors.reject:
            Log.error(actionMetadata, `Action failed: ${errorMessage}`);
            response.result = "peppr module configured to reject on error";
            return response;

          case Errors.audit:
            response.auditAnnotations = response.auditAnnotations || {};
            response.auditAnnotations[Date.now()] = `Action failed: ${errorMessage}`;
            break;
        }
      }
    }
  }

  // If we've made it this far, the request is allowed
  response.allowed = true;

  // If no capability matched the request, exit early
  if (!matchedAction) {
    Log.info(reqMetadata, `No matching actions found`);
    return response;
  }

  // delete operations can't be mutate, just return before the transformation
  if (req.operation == "DELETE") {
    return response;
  }

  const transformed = wrapped.Raw;

  // Post-process the Secret requests to convert it back to the original format
  if (isSecret) {
    convertToBase64Map(transformed as unknown as kind.Secret, skipDecode);
  }

  // Compare the original request to the modified request to get the patches
  const patches = jsonPatch.compare(req.object, transformed);

  // Only add the patch if there are patches to apply
  if (patches.length > 0) {
    response.patchType = "JSONPatch";
    // Webhook must be base64-encoded
    // https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/#response
    response.patch = base64Encode(JSON.stringify(patches));
  }

  // Remove the warnings array if it's empty
  if (response.warnings && response.warnings.length < 1) {
    delete response.warnings;
  }

  Log.debug({ ...reqMetadata, patches }, `Patches generated`);

  return response;
}
