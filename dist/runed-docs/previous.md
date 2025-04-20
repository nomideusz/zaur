# Previous
A utility that tracks and provides access to the previous value of a reactive getter.

## Overview

The `Previous` utility creates a reactive wrapper that maintains the previous value of a getter function. This is particularly useful when you need to compare state changes or implement transition effects.

## Demo
Previous: undefined

## Usage

```ts
import { Previous } from "runed";
 
let count = $state(0);
const previous = new Previous(() => count);
```

```svelte
<div>
	<button onclick={() => count++}>Count: {count}</button>
	<pre>Previous: {`${previous.current}`}</pre>
</div>
```

## Type Definition

```ts
class Previous<T> {
	constructor(getter: () => T);
 
	readonly current: T; // Previous value
}
```