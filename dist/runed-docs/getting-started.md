# Getting Started
Learn how to install and use Runed in your projects.

## Installation

Install Runed using your favorite package manager:

```bash
npm install runed
```

## Usage

Import one of the utilities you need to either a `.svelte` or `.svelte.js|ts` file and start using it:

### In Svelte Components

```svelte
<script lang="ts">
	import { activeElement } from "runed";
 
	let inputElement = $state<HTMLInputElement | undefined>();
</script>
 
<input bind:this={inputElement} />
 
{#if activeElement.current === inputElement}
	The input element is active!
{/if}
```

### In JavaScript/TypeScript Modules

```ts
// some-module.svelte.ts
import { activeElement } from "runed";
 
function logActiveElement() {
	$effect(() => {
		console.log("Active element is ", activeElement.current);
	});
}
 
logActiveElement();