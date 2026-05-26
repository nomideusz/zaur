<script lang="ts">
	import { Copy, Mail, Trash2, X } from 'lucide-svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import IconButton from '$lib/components/ui/IconButton.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import type { ContactEntry } from '$lib/utils/contact-index';
	import { cn } from '$lib/utils/cn';

	let {
		contact,
		onClose,
		onCompose,
		onCopy,
		onRemove
	}: {
		contact: ContactEntry;
		onClose: () => void;
		onCompose: () => void;
		onCopy: () => void;
		onRemove: () => void;
	} = $props();

	const hideBorders = $derived(settings.hidePaneBorders);
	const panelPadding = $derived(settings.compactContactsPage ? 'px-3 py-2.5' : 'px-4 py-3');
	const displayName = $derived(contact.name.trim() || contact.email);
</script>

{#snippet details(showClose: boolean)}
	<header
		class={cn(
			'flex shrink-0 items-start justify-between gap-2 border-b',
			panelPadding,
			!hideBorders && 'border-border'
		)}
	>
		<div class="flex min-w-0 items-start gap-3">
			{#if settings.showAvatars}
				<Avatar name={contact.name} email={contact.email} />
			{/if}
			<div class="min-w-0">
				<h2 class="truncate text-base font-semibold text-fg">{displayName}</h2>
				{#if !settings.hideContactsEmailLine}
					<p class="mt-1 truncate text-sm text-fg-muted">{contact.email}</p>
				{/if}
			</div>
		</div>
		{#if showClose}
			<IconButton label="Close contact" onclick={onClose}>
				<X class="size-4" />
			</IconButton>
		{/if}
	</header>

	<div
		class={cn(
			'z-pane-scroll min-h-0 flex-1 space-y-4 overflow-y-auto text-sm',
			settings.compactContactsPage ? 'space-y-3 px-3 py-3' : 'px-4 py-4'
		)}
	>
		{#if !settings.hideContactMessageCounts && contact.count > 0}
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Activity</p>
				<p class="mt-2 text-fg">
					{contact.count} message{contact.count === 1 ? '' : 's'} exchanged
				</p>
			</div>
		{/if}

		{#if settings.hideContactsEmailLine}
			<div>
				<p class="text-xs font-medium uppercase tracking-wide text-fg-subtle">Email</p>
				<p class="mt-2 break-all text-fg">{contact.email}</p>
			</div>
		{/if}

		{#if contact.count === 0 && !settings.hideContactMessageCounts}
			<p class="text-sm text-fg-muted">No indexed messages for this contact yet.</p>
		{/if}
	</div>

	<footer
		class={cn(
			'flex shrink-0 flex-wrap gap-2 border-t pb-[max(0.75rem,env(safe-area-inset-bottom))]',
			panelPadding,
			!hideBorders && 'border-border'
		)}
	>
		<Button onclick={onCompose}>
			<Mail class="size-4" aria-hidden="true" />
			New message
		</Button>
		{#if !settings.hideContactsHoverActions}
			<Button variant="ghost" onclick={onCopy}>
				<Copy class="size-4" aria-hidden="true" />
				Copy email
			</Button>
			<Button variant="danger" onclick={onRemove}>
				<Trash2 class="size-4" aria-hidden="true" />
				Remove
			</Button>
		{/if}
	</footer>
{/snippet}

<aside
	class={cn(
		'm-3 hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-raised/95 shadow-sm md:flex',
		!hideBorders && 'border border-border'
	)}
	style="view-transition-name: contact-detail;"
	aria-label="Contact details"
>
	{@render details(false)}
</aside>

<div class="z-mobile-sheet-backdrop md:hidden">
	<div
		class={cn('m-2 flex h-[calc(100%-1rem)] w-[calc(100%-1rem)] max-w-md flex-col overflow-hidden rounded-2xl bg-surface-raised shadow-md', !hideBorders && 'border border-border')}
	>
		{@render details(true)}
	</div>
</div>
