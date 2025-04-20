# useEventListener
A function that attaches an automatically disposed event listener.

## Overview

The `useEventListener` utility automatically manages event listeners by attaching them to specified elements and cleaning them up when components are destroyed or when targets change.

## Demo

Click the button to add more entries to the list
Clicks: 0
Last click time: -

## Usage

Add event listeners to elements or the window with automatic cleanup. Supports reactive references and options:

```ts
import { useEventListener } from "runed";
 
let clickCount = $state(0);
let lastClickTime = $state("-");
let buttonRef: HTMLButtonElement;
 
// Listen for clicks on a specific element
useEventListener(
	() => buttonRef, // Target element (reactive reference)
	"click",        // Event type
	(event) => {    // Event handler
		clickCount++;
		lastClickTime = new Date().toLocaleTimeString();
	},
	{               // Optional options
		capture: false,
		passive: true,
		once: false,
	}
);
 
// You can also listen to window events
useEventListener(
	window,         // Window, Document, or any EventTarget
	"resize",       // Event type
	() => {
		console.log("Window resized!");
	}
);
```

```svelte
<button bind:this={buttonRef}>
	Click me
</button>

<p>Clicks: {clickCount}</p>
<p>Last click time: {lastClickTime}</p>
```

## Features

- Automatic cleanup when component is destroyed
- Support for reactive element references
- Full TypeScript support with event typing
- All standard addEventListener options supported

## Advanced Usage

### Multiple Events

You can listen to multiple events with a single call:

```ts
// Listen for both mousedown and touchstart
useEventListener(
	() => buttonRef,
	["mousedown", "touchstart"],
	(event) => {
		console.log(`Interaction detected: ${event.type}`);
	}
);
```

### Class Implementation Example

The utility can be used within a class to create reusable behaviors:

```ts
// ClickLogger.ts
import { useEventListener } from "runed";
 
export class ClickLogger {
	#clicks = $state(0);
 
	constructor() {
		useEventListener(
			() => document.body,
			"click",
			() => this.#clicks++
		);
	}
 
	get clicks() {
		return this.#clicks;
	}
}
```

```svelte
<script lang="ts">
	import { ClickLogger } from "./ClickLogger.ts";
 
	const logger = new ClickLogger();
</script>
 
<p>
	You've clicked the document {logger.clicks}
	{logger.clicks === 1 ? "time" : "times"}
</p>
```

## Type Definitions

```ts
type MaybeGetter<T> = T | (() => T);
type EventTarget = Window | Document | HTMLElement | Element | null | undefined;

type EventMap<T> = T extends Window 
	? WindowEventMap 
	: T extends Document 
		? DocumentEventMap 
		: T extends HTMLElement 
			? HTMLElementEventMap 
			: Record<string, Event>;

function useEventListener<
	Target extends EventTarget,
	Type extends keyof EventMap<Target> | (string & {}),
	Event extends Type extends keyof EventMap<Target> ? EventMap<Target>[Type] : CustomEvent
>(
	target: MaybeGetter<Target>,
	type: Type | Type[],
	listener: (event: Event) => void,
	options?: boolean | AddEventListenerOptions
): void;
``` 