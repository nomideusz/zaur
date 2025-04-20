# onClickOutside
A utility to handle clicks outside of a specified element.

## Overview

`onClickOutside` detects clicks that occur outside a specified element's boundaries and executes a callback function. It's commonly used for dismissible dropdowns, modals, and other interactive components.

## Demo

Status: Enabled

## Usage

### Basic Usage

```ts
import { onClickOutside } from "runed";
 
let container = $state<HTMLElement>()!;
 
onClickOutside(
	() => container,
	() => console.log("clicked outside")
);
```

```svelte
<div bind:this={container}>
	<!-- Container content -->
</div>
<button>I'm outside the container</button>
```

### Advanced Usage

#### Controlled Listener

The function returns control methods to programmatically manage the listener, `start` and `stop` and a reactive read-only property `enabled` to check the current status of the listeners.

```ts
import { onClickOutside } from "runed";
 
let dialog = $state<HTMLDialogElement>()!;
 
const clickOutside = onClickOutside(
	() => dialog,
	() => {
		dialog.close();
		clickOutside.stop();
	},
	{ immediate: false }
);
 
function openDialog() {
	dialog.showModal();
	clickOutside.start();
}
 
function closeDialog() {
	dialog.close();
	clickOutside.stop();
}
```

```svelte
<button onclick={openDialog}>Open Dialog</button>
<dialog bind:this={dialog}>
	<div>
		<button onclick={closeDialog}>Close Dialog</button>
	</div>
</dialog>
```

Here's an example of using `onClickOutside` with a `<dialog>`.

## Options

### immediate
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Whether the click outside handler is enabled by default or not. If set to false, the handler will not be active until enabled by calling the returned start function.

### detectIframe
- **Type:** `boolean`
- **Default:** `false`
- **Description:** Controls whether focus events from iframes trigger the callback. Since iframe click events don't bubble to the parent document, you may want to enable this if you need to detect when users interact with iframe content.

### document
- **Type:** `Document`
- **Default:** `document`
- **Description:** The document object to use, defaults to the global document.

### window
- **Type:** `Window`
- **Default:** `window`
- **Description:** The window object to use, defaults to the global window.

## Type Definitions

```ts
export type OnClickOutsideOptions = ConfigurableWindow &
	ConfigurableDocument & {
		/**
		 * Whether the click outside handler is enabled by default or not.
		 * If set to false, the handler will not be active until enabled by
		 * calling the returned `start` function
		 *
		 * @default true
		 */
		immediate?: boolean;
		/**
		 * Controls whether focus events from iframes trigger the callback.
		 *
		 * Since iframe click events don't bubble to the parent document,
		 * you may want to enable this if you need to detect when users
		 * interact with iframe content.
		 *
		 * @default false
		 */
		detectIframe?: boolean;
	};

/**
 * A utility that calls a given callback when a click event occurs outside of
 * a specified container element.
 *
 * @template T - The type of the container element, defaults to HTMLElement.
 * @param {MaybeElementGetter<T>} container - The container element or a getter function that returns the container element.
 * @param {() => void} callback - The callback function to call when a click event occurs outside of the container.
 * @param {OnClickOutsideOptions} [opts={}] - Optional configuration object.
 * @param {ConfigurableDocument} [opts.document=defaultDocument] - The document object to use, defaults to the global document.
 * @param {boolean} [opts.immediate=true] - Whether the click outside handler is enabled by default or not.
 * @param {boolean} [opts.detectIframe=false] - Controls whether focus events from iframes trigger the callback.
 *
 * @see {@link https://runed.dev/docs/utilities/on-click-outside}
 */
export declare function onClickOutside<T extends Element = HTMLElement>(
	container: MaybeElementGetter<T>,
	callback: (event: PointerEvent | FocusEvent) => void,
	opts?: OnClickOutsideOptions
): {
	/** Stop listening for click events outside the container. */
	stop: () => boolean;
	/** Start listening for click events outside the container. */
	start: () => boolean;
	/** Whether the click outside handler is currently enabled or not. */
	readonly enabled: boolean;
};