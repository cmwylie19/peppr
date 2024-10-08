# peppr CLI

## `npx peppr init`

Initialize a new peppr Module.

**Options:**

- `--skip-post-init` - Skip npm install, git init and VSCode launch

---

## `npx peppr update`

Update the current peppr Module to the latest SDK version. This command is not recommended for production use, instead, we recommend Renovate or Dependabot for automated updates.

**Options:**

- `--skip-template-update` - Skip updating the template files

---

## `npx peppr dev`

Connect a local cluster to a local version of the peppr Controller to do real-time debugging of your module. Note the `npx peppr dev` assumes a K3d cluster is running by default. If you are working with Kind or another docker-based K8s distro, you will need to pass the `--host host.docker.internal` option to `npx peppr dev`. If working with a remote cluster you will have to give peppr a host path to your machine that is reachable from the K8s cluster.

NOTE: This command, by necessity, installs resources into the cluster you run it against.  Generally, these resources are removed once the `peppr dev` session ends but there are two notable exceptions:
- the `peppr-system` namespace, and
- the `pepprStore` CRD.

These can't be auto-removed because they're global in scope & doing so would risk wrecking any other peppr deployments that are already running in-cluster.  If (for some strange reason) you're _not_ `peppr dev`-ing against an ephemeral dev cluster and need to keep the cluster clean, you'll have to remove these hold-overs yourself (or not)!

**Options:**

- `-h, --host [host]` - Host to listen on (default: "host.k3d.internal")
- `--confirm` - Skip confirmation prompt

---

## `npx peppr deploy`

Deploy the current module into a Kubernetes cluster, useful for CI systems. Not recommended for production use.

**Options:**

- `-i, --image [image]` - Override the image tag
- `--confirm` - Skip confirmation prompt
- `--pullSecret <name>` - Deploy imagePullSecret for Controller private registry
- `--docker-server <server>` - Docker server address
- `--docker-username <username>` - Docker registry username
- `--docker-email <email>` - Email for Docker registry
- `--docker-password <password>` - Password for Docker registry
- `--force` - Force deploy the module, override manager field

---

## `npx peppr monitor`

Monitor Validations for a given peppr Module or all peppr Modules.

Usage:

```bash
npx peppr monitor [options] [module-uuid]
```

**Options:**

- `-h, --help` - Display help for command

---

## `npx peppr uuid`

Module UUID(s) currently deployed in the cluster with their descriptions.

**Options:**

- `[uuid]` - Specific module UUID

---

## `npx peppr build`

Create a [zarf.yaml](https://zarf.dev) and K8s manifest for the current module. This includes everything needed to deploy peppr and the current module into production environments.

**Options:**

- `-e, --entry-point [file]` - Specify the entry point file to build with. (default: "peppr.ts")
- `-n, --no-embed` - Disables embedding of deployment files into output module. Useful when creating library modules intended solely for reuse/distribution via NPM
- `-r, --registry-info [<registry>/<username>]` - Registry Info: Image registry and username. Note: You must be signed into the registry
- `-o, --output-dir [output directory]` - Define where to place build output
- `--timeout [timeout]` - How long the API server should wait for a webhook to respond before treating the call as a failure
- `--rbac-mode [admin|scoped]` - Rbac Mode: admin, scoped (default: admin) (choices: "admin", "scoped", default: "admin")
- `-i, --custom-image [custom-image]` - Custom Image: Use custom image for Admission and Watcher Deployments.
- `--registry [GitHub, Iron Bank]` - Container registry: Choose container registry for deployment manifests.
- `-v, --version <version>. Example: '0.27.3'` - The version of the peppr image to use in the deployment manifests.
-  `--withPullSecret <imagePullSecret>` - Image Pull Secret: Use image pull secret for controller Deployment.
- `-z, --zarf [manifest|chart]` - The Zarf package type to generate: manifest or chart (default: manifest).

## `npx peppr kfc`

Execute a `kubernetes-fluent-client` command. This command is a wrapper around `kubernetes-fluent-client`.

Usage:

```bash
npx peppr kfc [options] [command]
```

If you are unsure of what commands are available, you can run `npx peppr kfc` to see the available commands.

For example, to generate usable types from a Kubernetes CRD, you can run `npx peppr kfc crd [source] [directory]`. This will generate the types for the `[source]` CRD and output the generated types to the `[directory]`.

You can learn more about the `kubernetes-fluent-client` [here](https://github.com/defenseunicorns/kubernetes-fluent-client).
