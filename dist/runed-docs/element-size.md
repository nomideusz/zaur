# ElementSize
A utility to track element dimensions reactively.

## Overview

`ElementSize` provides reactive access to an element's width and height, automatically updating when the element's dimensions change. Similar to `ElementRect` but focused only on size measurements.

## Demo
Width: 300
Height: 200

## Usage

```ts
import { ElementSize } from "runed";
 
let el = $state() as HTMLElement;
const size = new ElementSize(() => el);
```

```svelte
<textarea bind:this={el}></textarea>
 
<p>Width: {size.width} Height: {size.height}</p>
```

## Type Definition

```ts
interface ElementSize {
	readonly width: number;
	readonly height: number;
}
```