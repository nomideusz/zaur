# watch
A utility for watching reactive values and running callbacks when they change.

## Overview

Runes provide a handy way of running a callback when reactive values change: `$effect`. It automatically detects when inner values change, and re-runs the callback.

`$effect` is great, but sometimes you want to manually specify which values should trigger the callback. Svelte provides an `untrack` function, allowing you to specify that a dependency shouldn't be tracked, but it doesn't provide a way to say that only certain values should be tracked.

`watch` does exactly that. It accepts a getter function, which returns the dependencies of the effect callback.

## Usage

### Basic Usage

Runs a callback whenever one of the sources change:

```ts
import { watch } from "runed";
 
let count = $state(0);
watch(
  () => count,         // Source to watch
  () => {              // Callback to run
    console.log(count);
  }
);
```

The callback receives two arguments: The current value of the sources, and the previous value:

```ts
let count = $state(0);
watch(
  () => count,                      // Source to watch
  (curr, prev) => {                 // Callback with current and previous values
    console.log(`count is ${curr}, was ${prev}`);
  }
);
```

### Multiple Sources

You can also watch an array of sources:

```ts
let age = $state(20);
let name = $state("bob");
watch(
  [() => age, () => name],          // Array of sources to watch
  ([age, name], [prevAge, prevName]) => {
    // Handle changes to multiple values
  }
);
```

### Options

`watch` also accepts an options object:

```ts
watch(
  sources,
  callback,
  {
    // First run will only happen after sources change when set to true.
    // By default, it's false.
    lazy: true
  }
);
```

## Variants

### watch.pre

`watch.pre` is similar to `watch`, but it uses `$effect.pre` under the hood.

### watchOnce

In case you want to run the callback only once, you can use `watchOnce` and `watchOnce.pre`. These functions are identical to `watch` and `watch.pre` respectively, but they do not accept any options object and only trigger once.