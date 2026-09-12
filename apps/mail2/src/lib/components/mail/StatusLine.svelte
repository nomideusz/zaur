<script lang="ts">
	interface Props {
		mailboxName: string | null;
		unseen: number;
		syncedAt: string | null;
		quota: { used: number; limit: number } | null | undefined;
	}

	let { mailboxName, unseen, syncedAt, quota }: Props = $props();

	const syncedLabel = $derived(
		syncedAt
			? `Synced ${new Date(syncedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
			: 'Not synced'
	);

	const gb = (bytes: number) => (bytes / 1024 ** 3).toFixed(1);
	const storageLabel = $derived(
		quota ? `${gb(quota.used)} / ${gb(quota.limit)} GB` : null
	);
	const storagePct = $derived(
		quota && quota.limit > 0 ? Math.min(100, Math.round((quota.used / quota.limit) * 100)) : 0
	);
</script>

<footer class="flex h-10 shrink-0 items-center gap-[18px] border-t border-line bg-canvas px-6 text-xs text-ink-secondary">
	{#if mailboxName}
		<span>
			{unseen > 0 ? `${unseen} unseen` : 'All seen'} · {mailboxName}
		</span>
		<span>{syncedLabel}</span>
		<span class="font-mono text-[11px]">j/k move · Enter open · / search</span>
	{:else}
		<span class="font-mono text-[11px]">Sign in to load your mail</span>
	{/if}
	{#if storageLabel}
		<div class="ml-auto flex items-center gap-2">
			<span class="tabular-nums">{storageLabel}</span>
			<div class="h-1 w-[90px] overflow-hidden rounded-full bg-[#e0e7e6]">
				<div class="h-full rounded-full bg-accent transition-[width] duration-[160ms]" style:width="{storagePct}%"></div>
			</div>
		</div>
	{/if}
</footer>
