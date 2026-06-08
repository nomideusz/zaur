<script lang="ts">
	import UserPlus from '$lib/components/icons/UserPlus.svelte';
	import Button from '$lib/components/ui/Button.svelte';
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
</script>

<aside
	class="z-mail-pane-surface hidden min-h-0 w-(--width-sidebar) shrink-0 flex-col overflow-hidden border-r border-border md:flex"
	style="view-transition-name: contacts-sidebar;"
	aria-label="Contacts navigation"
>
	<div class="shrink-0 border-b border-border/80 px-4 py-3">
		<h2 class="z-type-label">Contacts</h2>
		<p class="mt-1 text-xs text-fg-muted">{totalCount} saved</p>
	</div>

	<nav class="z-pane-scroll min-h-0 flex-1 overflow-y-auto p-2.5">
		<ul class="space-y-0.5">
			<li>
				<button
					type="button"
					class={cn(
						'flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors',
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

	<div class="shrink-0 space-y-0.5 border-t border-border/80 p-2">
		<Button variant="ghost" class="w-full justify-start px-3 py-2" onclick={onAddContact}>
			<UserPlus class="size-4 shrink-0" aria-hidden="true" />
			Add contact
		</Button>
	</div>
</aside>
