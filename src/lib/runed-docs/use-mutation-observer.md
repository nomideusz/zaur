# useMutationObserver
A utility to observe changes in an element.

## Demo
Mutation Attribute: class
Mutation Attribute: style

## Overview

The `useMutationObserver` utility allows you to watch for changes in the DOM by creating a MutationObserver with automatic cleanup when the component is destroyed.

## Usage

With a reference to an element, you can use the `useMutationObserver` hook to observe changes in the element:

```ts
import { useMutationObserver } from "runed";
 
let el = $state<HTMLElement | null>(null);
const messages = $state<string[]>([]);
let className = $state("");
let style = $state("");
 
useMutationObserver(
	() => el,
	(mutations) => {
		const mutation = mutations[0];
		if (!mutation) return;
 
		messages.push(mutation.attributeName!);
	},
	{ attributes: true }
);
 
setTimeout(() => {
	className = "text-brand";
}, 1000);
 
setTimeout(() => {
	style = "font-style: italic;";
}, 1500);
```

```svelte
<div bind:this={el} class={className} {style}>
	{#each messages as text}
		<div>
			Mutation Attribute: {text}
		</div>
	{:else}
		<div>No mutations yet</div>
	{/each}
</div>
```

### Stopping the Observer

You can stop the mutation observer at any point by calling the `stop` method:

```ts
const { stop } = useMutationObserver(/* ... */);
stop();
```