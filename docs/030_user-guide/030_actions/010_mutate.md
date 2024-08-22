# Mutate

Mutating admission webhooks are invoked first and can modify objects sent to the API server to enforce custom defaults. After an object is sent to peppr's Mutating Admission Webhook, peppr will [annotate the object](https://github.com/cmwylie19/peppr/blob/f01f5eeda16c13ecd0d51b26b8a16ed7e4c1b080/src/lib/mutate-processor.ts#L64) to indicate the status.

After a successful mutation of an object in a module with UUID static-test, and capability name hello-peppr, expect to see this annotation: `static-test.peppr.dev/hello-peppr: succeeded`.

## Mutate Helpers

### `SetLabel`

`SetLabel` is used to set a lable on a Kubernetes object as part of a peppr Mutate action.

For example, to add a label when a ConfigMap is created:

```typescript
When(a.ConfigMap)
  .IsCreated()
  .Mutate(request => {
    request
      // Here we are adding a label to the ConfigMap.
      .SetLabel("peppr", "was-here")

    // Note that we are not returning anything here. This is because peppr is tracking the changes in each action automatically.
  });
```

### `RemoveLabel`

`RemoveLabel` is used to remove a label on a Kubernetes object as part of a peppr Mutate action.

For example, to remove a label when a ConfigMap is updated:

```typescript
When(a.ConfigMap)
  .IsCreated()
  .Mutate(request => {
    request
      // Here we are removing a label from the ConfigMap.
      .RemoveLabel("remove-me")

    // Note that we are not returning anything here. This is because peppr is tracking the changes in each action automatically.
  });
```

### `SetAnnotation`

`SetAnnotation` is used to set an annotation on a Kubernetes object as part of a peppr Mutate action.

For example, to add an annotation when a ConfigMap is created:

```typescript
When(a.ConfigMap)
  .IsCreated()
  .Mutate(request => {
    request
      // Here we are adding an annotation to the ConfigMap.
      .SetAnnotation("peppr.dev", "annotations-work-too");

    // Note that we are not returning anything here. This is because peppr is tracking the changes in each action automatically.
  });
```

### `RemoveAnnotation`

`RemoveAnnotation` is used to remove an annotation on a Kubernetes object as part of a peppr Mutate action.

For example, to remove an annotation when a ConfigMap is updated:

```typescript
When(a.ConfigMap)
  .IsUpdated()
  .Mutate(request => {
    request
      // Here we are removing an annotation from the ConfigMap.
      .RemoveAnnotation("remove-me");

    // Note that we are not returning anything here. This is because peppr is tracking the changes in each action automatically.
  });
```

## See Also

Looking for some more generic helpers? Check out the [Module Author SDK](../130_sdk.md) for information on other things that peppr can help with.
