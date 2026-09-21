<script lang="ts">
	import type { Snippet } from 'svelte';
	import ShellHeader from '#lib/components/mail/ShellHeader.svelte';
	import { provideShell } from '#lib/shell.svelte.ts';

	let { children }: { children: Snippet } = $props();

	const shell = provideShell();
</script>

<!-- Ground behind the app column — only visible past the 1780px ceiling. -->
<div class="z-screen flex w-full flex-col items-center justify-center overflow-hidden bg-[var(--z-ground)] text-[var(--z-ink)]">
	<!-- App column: edge to edge until 1780px, then capped so the chrome at each
	     end stays within reach of the content in the middle. -->
	<div
		bind:this={shell.frame}
		class="relative flex h-full w-full max-w-[1780px] flex-col overflow-hidden bg-[var(--z-surface)]"
	>
		<ShellHeader bar={shell.bar} class={shell.barClass} />
		{@render children()}
	</div>
</div>
