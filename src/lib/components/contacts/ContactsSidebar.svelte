<script lang="ts">
	import { Settings, UserPlus } from 'lucide-svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		totalCount,
		selectedLetter,
		onSelectLetter,
		onAddContact
	}: {
		totalCount: number;
		selectedLetter: string | null;
		onSelectLetter: (letter: string | null) => void;
		onAddContact: () => void;
	} = $props();

	const hideBorders = $derived(settings.hidePaneBorders);
</script>

<aside
	class={cn(
		'm-3 mr-0 hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden rounded-lg bg-surface-raised/90 shadow-sm md:flex',
		!hideBorders && 'border border-border'
	)}
	style="view-transition-name: contacts-sidebar;"
	aria-label="Contacts navigation"
>
	<div
		class={cn(
			'shrink-0 px-4',
			settings.compactContactsPage ? 'py-2' : 'py-3',
			!hideBorders && 'border-b border-border/80'
		)}
	>
		<h2 class="z-type-label">Contacts</h2>
		{#if !settings.hideContactsPageSubtitle && !settings.compactContactsPage}
			<p class="mt-1 text-xs text-fg-muted">{totalCount} saved</p>
		{/if}
	</div>

	<nav class={cn('z-pane-scroll min-h-0 flex-1 overflow-y-auto', settings.compactContactsPage ? 'p-1.5' : 'p-2.5')}>
		<ul class="space-y-0.5">
			<li>
				<button
					type="button"
					class={cn(
						'flex w-full items-center justify-between rounded-lg px-3 text-sm transition-all',
						settings.compactContactsPage ? 'min-h-9 py-2' : 'min-h-10 py-2.5',
						selectedLetter === null
							? 'bg-accent/10 font-semibold text-fg shadow-sm'
							: 'text-fg-muted hover:bg-surface-sunken/80 hover:text-fg'
					)}
					onclick={() => onSelectLetter(null)}
				>
					<span>All contacts</span>
					<span class="text-xs text-fg-subtle">{totalCount}</span>
				</button>
			</li>
		</ul>
	</nav>

	<div
		class={cn(
			'shrink-0 space-y-0.5',
			settings.compactContactsPage ? 'p-1' : 'p-2',
			!hideBorders && 'border-t border-border/80'
		)}
	>
		<Button
			variant="ghost"
			class={cn('w-full justify-start', settings.compactContactsPage ? 'px-3 py-1.5 text-sm' : 'px-3 py-2')}
			onclick={onAddContact}
		>
			<UserPlus class="size-4 shrink-0" aria-hidden="true" />
			Add contact
		</Button>
		{#if !settings.hideContactsHeaderSettings}
			<a
				href="/settings/contacts"
				class={cn(
					'flex items-center gap-2 rounded-lg px-3 text-sm transition-all',
					settings.compactContactsPage ? 'min-h-9 py-2' : 'min-h-10 py-2.5',
					$page.url.pathname.startsWith('/settings')
						? 'bg-accent/10 font-semibold text-fg shadow-sm'
						: 'text-fg-muted hover:bg-surface-sunken/80 hover:text-fg'
				)}
			>
				<Settings class="size-4 shrink-0" aria-hidden="true" />
				Settings
			</a>
		{/if}
	</div>
</aside>
