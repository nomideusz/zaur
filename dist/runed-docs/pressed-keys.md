# PressedKeys
A utility to track which keys are currently pressed.

## Overview

The `PressedKeys` utility provides a reactive way to track keyboard input, allowing you to check which keys are currently pressed at any time.

## Demo
Try and guess the password 👀

## Usage

### Checking Specific Keys

With an instance of `PressedKeys`, you can use the `has` method to check if specific keys are pressed:

```ts
import { PressedKeys } from "runed";

const keys = new PressedKeys();
 
const isArrowDownPressed = $derived(keys.has("ArrowDown"));
const isCtrlAPressed = $derived(keys.has("Control", "a"));
```

### Getting All Pressed Keys

You can also get all of the currently pressed keys:

```ts
const keys = new PressedKeys();
console.log(keys.all());
```

## Methods

- `has(...keys)`: Check if specific keys are currently pressed
- `all()`: Get an array of all currently pressed keys