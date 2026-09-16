<script lang="ts">
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
</script>

<!--
	The status line carries the two numbers the mark used to gesture at — how
	much is unseen, how much is stored — and the keyboard's half of the row's
	hover buttons. Hidden on a phone, where the folder chip already says the
	count and 36px of hints is not what a small screen should spend.
-->
<footer
	class="flex h-9 shrink-0 items-center justify-between border-t border-[#cbd5e1] bg-white px-4 text-[12px] text-[#64748b] select-none max-md:hidden"
>
	<div class="flex items-center gap-3">
		{#if mailboxName}
			<div class="flex items-center gap-[7px]">
				<span
					class="size-[7px] rounded-full border {unseen > 0
						? 'border-[#3b82f6] bg-[#2563eb]'
						: 'border-[#16a34a] bg-[#16a34a]'}"
					aria-hidden="true"
				></span>
				<span class="font-semibold text-[#334155] tabular-nums">
					{unseen > 0 ? `${unseen} unseen` : 'All seen'}
				</span>
				<span class="text-[#cbd5e1]">·</span>
				<span>{mailboxName}</span>
			</div>

			<span class="hidden text-[#cbd5e1] md:inline">|</span>

			<div class="z-mono hidden items-center gap-[5px] text-[10.5px] md:flex">
				<kbd class="z-kbd">j/k</kbd> move
				<kbd class="z-kbd">↵</kbd> open
				<kbd class="z-kbd">x</kbd> select
				<kbd class="z-kbd">s</kbd> flag
				<kbd class="z-kbd">e</kbd> archive
			</div>
		{:else}
			<span class="z-mono text-[10.5px] text-[#64748b]">Sign in to load your mail</span>
		{/if}
	</div>

	{#if storageLabel}
		<div class="flex items-center gap-[9px]">
			<span class="z-mono text-[10.5px]">{storageLabel}</span>
			<div class="h-[7px] w-20 overflow-hidden rounded-full border border-[#cbd5e1] bg-[#f1f5f9]">
				<div
					class="h-full bg-[#2563eb] transition-[width] duration-[160ms]"
					style:width="{storagePct}%"
				></div>
			</div>
		</div>
	{/if}
</footer>
