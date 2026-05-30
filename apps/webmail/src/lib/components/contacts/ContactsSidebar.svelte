<script lang="ts">
	import UserPlus from '$lib/components/icons/UserPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import AppSidebarShortcuts from '$lib/components/shell/AppSidebarShortcuts.svelte';
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
		'z-mail-pane-surface hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden md:flex',
		!hideBorders && 'border-r border-border'
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
						'flex w-full items-center justify-between rounded-sm px-3 text-sm transition-colors',
						settings.compactContactsPage ? 'min-h-9 py-2' : 'min-h-10 py-2.5',
						selectedLetter === null
							? 'z-surface-active font-medium'
							: 'text-fg-muted hover:bg-surface-sunken/60 hover:text-fg'
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
	</div>

	<AppSidebarShortcuts />
</aside>
