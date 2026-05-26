<script lang="ts">
	import { Settings, UserPlus } from 'lucide-svelte';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/Button.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '$lib/utils/cn';

	let {
		totalCount,
		letters,
		selectedLetter,
		onSelectLetter,
		onAddContact
	}: {
		totalCount: number;
		letters: string[];
		selectedLetter: string | null;
		onSelectLetter: (letter: string | null) => void;
		onAddContact: () => void;
	} = $props();

	const hideBorders = $derived(settings.hidePaneBorders);
</script>

<aside
	class={cn(
		'z-panel hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden md:flex',
		!hideBorders && 'border-r'
	)}
	style="view-transition-name: contacts-sidebar;"
	aria-label="Contacts navigation"
>
	<div
		class={cn(
			'shrink-0 px-4',
			settings.compactContactsPage ? 'py-2' : 'py-3',
			!hideBorders && 'border-b border-border'
		)}
	>
		<h2 class="z-type-label">Contacts</h2>
		{#if !settings.hideContactsPageSubtitle && !settings.compactContactsPage}
			<p class="mt-1 text-xs text-fg-muted">{totalCount} saved</p>
		{/if}
	</div>

	<nav class={cn('z-pane-scroll min-h-0 flex-1 overflow-y-auto', settings.compactContactsPage ? 'p-1' : 'p-2')}>
		<ul class="space-y-0.5">
			<li>
				<button
					type="button"
					class={cn(
						'flex w-full items-center justify-between rounded-lg px-3 text-sm transition-colors',
						settings.compactContactsPage ? 'min-h-9 py-2' : 'min-h-10 py-2.5',
						selectedLetter === null
							? 'bg-surface-sunken font-medium text-fg'
							: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
					)}
					onclick={() => onSelectLetter(null)}
				>
					<span>All contacts</span>
					<span class="text-xs text-fg-subtle">{totalCount}</span>
				</button>
			</li>
		</ul>

		{#if letters.length && !settings.hideContactGroupLetters}
			<p class="mb-1.5 mt-4 px-3 text-xs font-medium text-fg-subtle">Browse A–Z</p>
			<ul class="space-y-0.5 px-1">
				{#each letters as letter (letter)}
					<li>
						<button
							type="button"
							class={cn(
								'flex w-full items-center rounded-lg px-3 text-sm font-semibold transition-colors',
								settings.compactContactsPage ? 'min-h-9 py-2' : 'min-h-10 py-2.5',
								selectedLetter === letter
									? 'bg-accent text-accent-fg shadow-sm'
									: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
							)}
							aria-current={selectedLetter === letter ? 'true' : undefined}
							onclick={() => onSelectLetter(selectedLetter === letter ? null : letter)}
						>
							{letter}
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>

	<div
		class={cn(
			'shrink-0 space-y-0.5',
			settings.compactContactsPage ? 'p-1' : 'p-2',
			!hideBorders && 'border-t border-border'
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
					'flex items-center gap-2 rounded-lg px-3 text-sm transition-colors',
					settings.compactContactsPage ? 'min-h-9 py-2' : 'min-h-10 py-2.5',
					$page.url.pathname.startsWith('/settings')
						? 'bg-surface-sunken font-medium text-fg'
						: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
				)}
			>
				<Settings class="size-4 shrink-0" aria-hidden="true" />
				Settings
			</a>
		{/if}
	</div>
</aside>
