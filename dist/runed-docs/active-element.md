# activeElement
A utility to track and access the currently focused DOM element.

## Overview

`activeElement` provides reactive access to the currently focused DOM element in your application, similar to `document.activeElement` but with reactive updates.

- Updates synchronously with DOM focus changes
- Returns null when no element is focused
- Safe to use with SSR (Server-Side Rendering)
- Lightweight alternative to manual focus tracking
- Searches through Shadow DOM boundaries for the true active element

## Demo
Currently active element: body

## Usage

```ts
import { activeElement } from "runed";
```

```svelte
<p>
  Currently active element:
  {activeElement.current?.localName ?? "No active element found"}
</p>
```

### Custom Document

If you wish to scope the focus tracking within a custom document or shadow root, you can pass a DocumentOrShadowRoot to the ActiveElement options:

```ts
import { ActiveElement } from "runed";
 
const activeElement = new ActiveElement({
  document: shadowRoot
});
```

## Type Definition

```ts
interface ActiveElement {
  readonly current: Element | null;
}
```