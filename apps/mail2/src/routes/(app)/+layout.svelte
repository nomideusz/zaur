<script lang="ts">
	import type { Snippet } from 'svelte';
	import ShellHeader from '#lib/components/mail/ShellHeader.svelte';
	import { provideShell } from '#lib/shell.svelte.ts';
	import { prefs } from '#lib/settings.svelte.ts';

	let { children }: { children: Snippet } = $props();

	const shell = provideShell();

	// The server stops sending a count once the badge is off; this clears one that
	// is already on the icon, here and on each device as it next opens the app.
	$effect(() => {
		if (prefs.appBadge) return;
		(navigator as Navigator & { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
	});
</script>

<!-- Past the 1780px ceiling the body's ground shows either side of the app
     column. No background of its own: iOS colours the status bar from the
     boxes under the top edge (see `.z-screen`), and a second colour there
     makes it guess from a snapshot instead of reading the top bar's. -->
<div class="z-screen flex w-full flex-col items-center justify-center overflow-hidden text-[var(--z-ink)]">
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
