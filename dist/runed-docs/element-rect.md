# ElementRect
A utility to track element dimensions and position reactively.

## Overview

`ElementRect` provides reactive access to an element's dimensions and position information, automatically updating when the element's size or position changes.

## Demo
width: 300
height: 330
x: 878.5
y: 416.75
top: 416.75
right: 1178.5
bottom: 746.75
left: 878.5

## Usage

```ts
import { ElementRect } from "runed";
 
let el = $state<HTMLElement>();
const rect = new ElementRect(() => el);
```

```svelte
<textarea bind:this={el}></textarea>
 
<p>Width: {rect.width} Height: {rect.height}</p>
<!-- alternatively -->
<pre>{JSON.stringify(rect.current, null, 2)}</pre>
```

## Type Definition

```ts
type Rect = Omit<DOMRect, "toJSON">;
 
interface ElementRectOptions {
	initialRect?: DOMRect;
}
 
class ElementRect {
	constructor(node: MaybeGetter<HTMLElement | undefined | null>, options?: ElementRectOptions);
	readonly current: Rect;
	readonly width: number;
	readonly height: number;
	readonly top: number;
	readonly left: number;
	readonly right: number;
	readonly bottom: number;
	readonly x: number;
	readonly y: number;
}
```