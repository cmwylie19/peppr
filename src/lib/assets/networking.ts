// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2023-Present The peppr Authors

import { kind } from "kubernetes-fluent-client";

import { TLSOut } from "../tls";

export function apiTokenSecret(name: string, apiToken: string): kind.Secret {
  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: `${name}-api-token`,
      namespace: "peppr-system",
    },
    type: "Opaque",
    data: {
      value: Buffer.from(apiToken).toString("base64"),
    },
  };
}

export function tlsSecret(name: string, tls: TLSOut): kind.Secret {
  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: `${name}-tls`,
      namespace: "peppr-system",
    },
    type: "kubernetes.io/tls",
    data: {
      "tls.crt": tls.crt,
      "tls.key": tls.key,
    },
  };
}

export function service(name: string): kind.Service {
  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      namespace: "peppr-system",
      labels: {
        "peppr.dev/controller": "admission",
      },
    },
    spec: {
      selector: {
        app: name,
        "peppr.dev/controller": "admission",
      },
      ports: [
        {
          port: 443,
          targetPort: 3000,
        },
      ],
    },
  };
}

export function watcherService(name: string): kind.Service {
  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name: `${name}-watcher`,
      namespace: "peppr-system",
      labels: {
        "peppr.dev/controller": "watcher",
      },
    },
    spec: {
      selector: {
        app: `${name}-watcher`,
        "peppr.dev/controller": "watcher",
      },
      ports: [
        {
          port: 443,
          targetPort: 3000,
        },
      ],
    },
  };
}
