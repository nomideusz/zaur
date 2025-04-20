# Debounced
A wrapper over `useDebounce` that returns a debounced state.

## Demo
Search the best utilities for Svelte 5
Search for something above!

## Overview

This is a simple wrapper over `useDebounce` that returns a debounced state, allowing you to access values that update only after a delay.

## Usage

```ts
import { Debounced } from "runed";
 
let search = $state("");
const debounced = new Debounced(() => search, 500);
```

```svelte
<div>
	<input bind:value={search} />
	<p>You searched for: <b>{debounced.current}</b></p>
</div>
```

### Additional Methods

You may cancel the pending update, run it immediately, or set a new value. Setting a new value immediately also cancels any pending updates:

```ts
let count = $state(0);
const debounced = new Debounced(() => count, 500);

// Cancel pending updates
count = 1;
debounced.cancel();
// after a while...
console.log(debounced.current); // Still 0!
 
// Set a value immediately
count = 2;
console.log(debounced.current); // Still 0!
debounced.setImmediately(count);
console.log(debounced.current); // 2
 
// Update immediately from the source
count = 3;
console.log(debounced.current); // 2
await debounced.updateImmediately();
console.log(debounced.current); // 3
```