<script lang="ts">
	import KeysSheet from '../ui/KeysSheet.svelte';

	interface Props {
		mailboxName: string | null;
		unseen: number;
		quota: { used: number; limit: number } | null | undefined;
	}

	let { mailboxName, unseen, quota }: Props = $props();

	const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(1);
	const storageLabel = $derived(
		quota ? `${gb(quota.used)} / ${gb(quota.limit)} GB` : null
	);
	const storagePct = $derived(
		quota && quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0
	);

	/**
	 * Every key Mail answers to, in the order you would reach for them. The line
	 * shows as many as fit from the front; `?` opens the whole list.
	 */
	const KEYS: [key: string, does: string, long: string][] = [
		['j/k', 'move', 'Next / previous conversation'],
		['↵', 'open', 'Open it (also o)'],
		['x', 'select', 'Select it'],
		['e', 'archive', 'Archive'],
		['#', 'delete', 'Delete: move to Trash, or delete for good from Trash'],
		['r', 'reply', 'Reply to the open conversation'],
		['a', 'reply all', 'Reply to everyone'],
		['f', 'forward', 'Forward'],
		['s', 'flag', 'Flag, or remove the flag'],
		['i', 'important', 'Mark important, or not'],
		['u', 'unread', 'Mark unread, or read'],
		['c', 'new', 'New message'],
		['/', 'search', 'Search'],
		['[', 'sidebar', 'Show or hide the mailboxes'],
		['esc', 'back', 'Clear the selection or the search; minimise a draft'],
		['ctrl ↵', 'send', 'Send the draft in front (⌘↵ on a Mac)']
	];

	let sheet = $state<KeysSheet | null>(null);

	/** The `?` key. */
	export function showKeys() {
		sheet?.toggle();
	}
</script>

<!--
	The status line carries the two numbers the mark used to gesture at — how
	much is unseen, how much is stored — and the keyboard's half of the row's
	hover buttons. Hidden on a phone, where the folder chip already says the
	count and 36px of hints is not what a small screen should spend; the hints
	alone step out wherever the pointer is a finger, which has no keys to press.
-->
<footer
	class="flex h-9 shrink-0 items-center justify-between gap-4 border-t border-[var(--z-line)] bg-[var(--z-surface)] px-4 text-[12px] text-[var(--z-soft)] select-none max-md:hidden"
>
	<div class="flex min-w-0 flex-1 items-center gap-3">
		{#if mailboxName}
			<div class="flex shrink-0 items-center gap-[7px]">
				<span
					class="size-[7px] rounded-full border {unseen > 0
						? 'border-[var(--z-accent-stroke)] bg-[var(--z-accent)]'
						: 'border-[var(--z-ch-confirmed-solid)] bg-[var(--z-ch-confirmed-solid)]'}"
					aria-hidden="true"
				></span>
				<span class="font-semibold text-[var(--z-strong)] tabular-nums">
					{unseen > 0 ? `${unseen} unseen` : 'All seen'}
				</span>
				<span class="text-[var(--z-line)]">·</span>
				<span>{mailboxName}</span>
			</div>

			<span class="text-[var(--z-line)] pointer-coarse:hidden">|</span>

			<!-- One line high and wrapping: a hint that does not fit drops to a second
			     line nobody sees, whole, instead of being cut mid-word. -->
			<div class="z-mono flex h-[19px] min-w-0 flex-1 flex-wrap items-center gap-x-[9px] overflow-hidden text-[10.5px] pointer-coarse:hidden">
				{#each KEYS.slice(0, 8) as [key, does] (key)}
					<span class="flex h-[19px] items-center gap-[5px] whitespace-nowrap"><kbd class="z-kbd">{key}</kbd> {does}</span>
				{/each}
			</div>
			<button
				type="button"
				class="z-mono flex shrink-0 items-center gap-[5px] text-[10.5px] hover:text-[var(--z-strong)] pointer-coarse:hidden"
				title="Keyboard shortcuts (?)"
				onclick={showKeys}
			>
				<kbd class="z-kbd">?</kbd> all keys
			</button>
		{/if}
	</div>

	{#if storageLabel}
		<div class="flex shrink-0 items-center gap-[9px]">
			<span class="z-mono text-[10.5px]">{storageLabel}</span>
			<div class="h-[7px] w-20 overflow-hidden rounded-full border border-[var(--z-line)] bg-[var(--z-sunken)]">
				<div
					class="h-full bg-[var(--z-accent)] transition-[width] duration-[160ms]"
					style:width="{storagePct}%"
				></div>
			</div>
		</div>
	{/if}
</footer>

<KeysSheet bind:this={sheet} keys={KEYS} />
