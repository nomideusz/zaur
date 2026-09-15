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

<footer
	class="flex h-9 shrink-0 items-center justify-between border-t border-[#cbd5e1] bg-white px-4 text-xs font-medium text-slate-500 select-none"
>
	<div class="flex items-center gap-3">
		{#if mailboxName}
			<div class="flex items-center gap-1.5">
				<span
					class="size-1.5 rounded-full {unseen > 0 ? 'bg-blue-600' : 'bg-emerald-500'}"
					aria-hidden="true"
				></span>
				<span class="font-semibold text-slate-700">
					{unseen > 0 ? `${unseen} unseen` : 'All seen'}
				</span>
				<span>·</span>
				<span>{mailboxName}</span>
			</div>

			<span class="hidden md:inline text-slate-300">|</span>

			<div class="hidden md:flex items-center gap-1 font-mono text-[11px] text-slate-400">
				<kbd class="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px]">j/k</kbd> move
				<kbd class="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px]">↵</kbd> open
			</div>
		{:else}
			<span class="font-mono text-[11px] text-slate-400">Sign in to load your mail</span>
		{/if}
	</div>

	{#if storageLabel}
		<div class="flex items-center gap-2">
			<span class="tabular-nums text-[11px] text-slate-500">{storageLabel}</span>
			<div class="h-1.5 w-[72px] overflow-hidden rounded-full border border-slate-200 bg-slate-100">
				<div
					class="h-full rounded-full bg-blue-600 transition-[width] duration-[160ms]"
					style:width="{storagePct}%"
				></div>
			</div>
		</div>
	{/if}
</footer>
