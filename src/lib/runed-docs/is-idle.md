# IsIdle
A utility to track if a user is idle and the last time they were active.

## Overview

`IsIdle` tracks user activity and determines if they're idle based on a configurable timeout. It monitors mouse movement, keyboard input, and touch events to detect user interaction.

## Demo
Idle: false

Last active: 0s ago

> By default, the time of inactivity before marking the user as idle is 1 minute.
>
> In this demo, it's 1 second.

## Usage

```ts
import { AnimationFrames, IsIdle } from "runed";
 
const idle = new IsIdle({ timeout: 1000 });
```

```svelte
<p>Idle: {idle.current}</p>
<p>
  Last active: {new Date(idle.lastActive).toLocaleTimeString()}
</p>
```

## Type Definitions

```ts
interface IsIdleOptions {
  /**
   * The events that should set the idle state to `true`
   *
   * @default ['mousemove', 'mousedown', 'resize', 'keydown', 'touchstart', 'wheel']
   */
  events?: MaybeGetter<(keyof WindowEventMap)[]>;
  /**
   * The timeout in milliseconds before the idle state is set to `true`. Defaults to 60 seconds.
   *
   * @default 60000
   */
  timeout?: MaybeGetter<number>;
  /**
   * Detect document visibility changes
   *
   * @default false
   */
  detectVisibilityChanges?: MaybeGetter<boolean>;
  /**
   * The initial state of the idle property
   *
   * @default false
   */
  initialState?: boolean;
}
 
class IsIdle {
  constructor(options?: IsIdleOptions);
  readonly current: boolean;
  readonly lastActive: number;
}
```
