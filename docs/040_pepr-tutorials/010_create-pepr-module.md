# Tutorial - Create a peppr Module

## Introduction

This tutorial will walk you through the process of creating a peppr module.

Each peppr Module is it's own Typescript project, produced by [`npx peppr init`](../030_user-guide/010_peppr-cli.md#peppr-init). Typically a module is maintained by a unique group or system. For example, a module for internal [Zarf](https://zarf.dev/) mutations would be different from a module for [Big Bang](https://p1.dso.mil/products/big-bang). An important idea with modules is that they are _wholly independent of one another_. This means that 2 different modules can be on completely different versions of peppr and any other dependencies; their only interaction is through the standard K8s interfaces like any other webhook or controller.

## Prerequisites

## Steps

1. **Create the module**:

   Use [`npx peppr init`](../030_user-guide/010_peppr-cli.md#peppr-init) to generate a new module.

1. **Quickly validate system setup**:

   Every new module includes a sample peppr Capability called `Hellopeppr`. By default,
   this capability is deployed and monitoring the `peppr-demo` namespace. There is a sample
   yaml also included you can use to see peppr in your cluster. Here's the quick steps to do
   that after `npx peppr init`:

   ```bash
   # cd to the newly-created peppr module folder
   cd my-module-name

   # If you don't already have a local K8s cluster, you can set one up with k3d
   npm run k3d-setup

   # Launch peppr dev mode
   # If using another local K8s distro instead of k3d, use `npx peppr dev --host host.docker.internal`
   npx peppr dev

   # From another terminal, apply the sample yaml
   kubectl apply -f capabilities/hello-peppr.samples.yaml

   # Verify the configmaps were transformed using kubectl, k9s or another tool
   ```

1. **Create your custom peppr Capabilities**

   Now that you have confirmed peppr is working, you can now create new [capabilities](../030_user-guide/040_capabilities.md). You'll also want to disable the `Hellopeppr` capability in your module (`peppr.ts`) before pushing to production. You can disable by commenting out or deleting the `Hellopeppr` variable below:

   ```typescript
   new pepprModule(cfg, [
     // Remove or comment the line below to disable the Hellopeppr capability
     Hellopeppr,

     // Your additional capabilities go here
   ]);
   ```

   _Note: if you also delete the `capabilities/hello-peppr.ts` file, it will be added again on the next [`npx peppr update`](../030_user-guide/010_peppr-cli.md#peppr-update) so you have the latest examples usages from the peppr SDK. Therefore, it is sufficient to remove the entry from your `peppr.ts` module
   config._

1. **Build and deploy the peppr Module**

   Most of the time, you'll likely be iterating on a module with `npx peppr dev` for real-time feedback and validation Once you are ready to move beyond the local dev environment, peppr provides deployment and build tools you can use.

   `npx peppr deploy` - you can use this command to build your module and deploy it into any K8s cluster your current `kubecontext` has access to. This setup is ideal for CI systems during testing, but is not recommended for production use. See [`npx peppr deploy`](../030_user-guide/010_peppr-cli.md#peppr-deploy) for more info.

## Additional Information

By default, when you run `npx peppr init`, the module is not configured with any additional options. Currently, there are 3 options you can configure:

- `deferStart` - if set to `true`, the module will not start automatically. You will need to call `start()` manually. This is useful if you want to do some additional setup before the module controller starts. You can also use this to change the default port that the controller listens on.

- `beforeHook` - an optional callback that will be called before every request is processed. This is useful if you want to do some additional logging or validation before the request is processed.

- `afterHook` - an optional callback that will be called after every request is processed. This is useful if you want to do some additional logging or validation after the request is processed.

You can configure each of these by modifying the `peppr.ts` file in your module. Here's an example of how you would configure each of these options:

```typescript
const module = new pepprModule(
  cfg,
  [
    // Your capabilities go here
  ],
  {
    deferStart: true,

    beforeHook: req => {
      // Any actions you want to perform before the request is processed, including modifying the request.
    },

    afterHook: res => {
      // Any actions you want to perform after the request is processed, including modifying the response.
    },
  }
);

// Do any additional setup before starting the controller
module.start();
```

## Summary

Checkout some examples of peppr modules in the [excellent examples repo](https://github.com/cmwylie19/peppr-excellent-examples). If you have questions after that, please reach out to us on [Slack](https://kubernetes.slack.com/archives/C06DGH40UCB) or [GitHub Issues](https://github.com/cmwylie19/peppr/issues)
