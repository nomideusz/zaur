# IsMounted
A utility that returns the mounted state of the component it's called in.

## Demo
Mounted: true

## Usage

```ts
import { IsMounted } from "runed";
 
const isMounted = new IsMounted();
```

Which is a shorthand for one of the following:

### Using onMount

```ts
import { onMount } from "svelte";
 
const isMounted = $state({ current: false });
 
onMount(() => {
  isMounted.current = true;
});
```

### Using $effect

```ts
import { untrack } from "svelte";
 
const isMounted = $state({ current: false });
 
$effect(() => {
  untrack(() => (isMounted.current = true));
});
```