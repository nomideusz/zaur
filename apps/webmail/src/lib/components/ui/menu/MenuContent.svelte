<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import type { Snippet } from 'svelte';
	import MenuSurface from './MenuSurface.svelte';

	interface Props {
		class?: string;
		children: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<!-- Default Shark-flavoured menu surface. Callers that need different geometry
     (e.g. the overflow menus) compose MenuSurface directly. -->
<MenuSurface
	class={cn('z-menu-content w-72 min-w-64 max-w-[calc(100vw-1rem)] py-1', className)}
	data-slot="menu-content"
>
	{@render children()}
</MenuSurface>
