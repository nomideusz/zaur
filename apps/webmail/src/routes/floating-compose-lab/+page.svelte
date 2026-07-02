<script lang="ts">
	// Dev-only desktop lab: ComposePanel inside Ark FloatingPanel (non-modal, draggable).
	import { onMount } from 'svelte';
	import FloatingComposeLab from '$lib/components/lab/FloatingComposeLab.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { compose } from '$lib/stores/compose.svelte';
	import { cn } from '$lib/utils/cn';

	let boundaryEl = $state<HTMLElement | null>(null);

	onMount(() => {
		auth.client = { getAccountId: () => 'floating-compose-lab' } as typeof auth.client;
		auth.username = 'lab@example.com';
		auth.isAuthenticated = true;
		auth.isRestoring = false;
		auth.identities = [
			{ id: 'lab', email: 'lab@example.com', name: 'Lab User' },
			{ id: 'lab-alias', email: 'hello@zaur.app', name: 'Lab User (alias)' }
		];
		auth.displayName = 'Lab User';
		void compose.restoreOrStartNew();
	});
</script>

<svelte:head>
	<title>floating-compose-lab · ZAUR Webmail</title>
</svelte:head>

<div class="hidden min-h-dvh flex-col bg-surface md:flex">
	<header class="shrink-0 border-b border-border px-6 py-4">
		<h1 class="text-lg font-semibold text-fg">floating-compose-lab</h1>
		<p class="mt-1 max-w-2xl text-sm text-fg-muted">
			Desktop-only prototype: real <code class="text-fg">ComposePanel</code> in an Ark
			<a class="text-accent hover:underline" href="https://ark-ui.com/docs/components/floating-panel">Floating Panel</a>.
			The inbox below stays interactive (non-modal). Send/schedule need a live JMAP session; drag, resize, minimize, and editing work offline.
		</p>
	</header>

	<div bind:this={boundaryEl} class="relative flex min-h-0 flex-1 overflow-hidden">
		<aside class="z-mail-pane-surface hidden w-(--width-sidebar) shrink-0 flex-col border-r border-border lg:flex">
			<div class="border-b border-border/80 px-4 py-3">
				<h2 class="z-type-label">Mailboxes</h2>
				<p class="mt-1 text-xs text-fg-muted">Mock chrome</p>
			</div>
			<nav class="p-2.5 text-sm text-fg-muted">Inbox · Sent · Drafts</nav>
		</aside>

		<section class="flex min-h-0 min-w-0 flex-1 flex-col">
			<div class="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 px-4 py-3">
				<div>
					<h2 class="text-sm font-semibold text-fg">Inbox</h2>
					<p class="text-xs text-fg-muted">Click through the list while compose stays open.</p>
				</div>
				<FloatingComposeLab {boundaryEl} />
			</div>

			<ul class="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
				{#each ['Project update', 'Receipt for order', 'Team standup notes', 'Welcome to ZAUR'] as subject, i (subject)}
					<li>
						<button
							type="button"
							class={cn(
								'flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-surface-sunken/60',
								i === 0 && 'bg-surface-sunken/40'
							)}
						>
							<span class="text-sm font-medium text-fg">{subject}</span>
							<span class="text-xs text-fg-muted">sender{i + 1}@example.com</span>
						</button>
					</li>
				{/each}
			</ul>
		</section>
	</div>
</div>

<div class="flex min-h-dvh items-center justify-center px-6 text-center md:hidden">
	<p class="max-w-sm text-sm text-fg-muted">
		This lab is desktop-only (<code>md+</code>). Open it on a wide viewport to try the floating compose panel.
	</p>
</div>
