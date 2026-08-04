<script lang="ts">
	import { DownloadTrigger } from '@ark-ui/svelte/download-trigger';
	import type { DownloadableData } from '@ark-ui/svelte/download-trigger';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		fileName: string;
		mimeType?: string;
		/** Sync payload, or async loader invoked on first click. */
		data: DownloadableData | (() => Promise<DownloadableData>);
		disabled?: boolean;
		class?: string;
		/** Accessible name when the trigger is icon-only. */
		label?: string;
		onError?: (error: unknown) => void;
		onBusyChange?: (busy: boolean) => void;
		children?: Snippet<[{ busy: boolean }]>;
	}

	let {
		fileName,
		mimeType = 'application/octet-stream',
		data,
		disabled = false,
		class: className = '',
		label,
		onError,
		onBusyChange,
		children
	}: Props = $props();

	let busy = $state(false);
	/** Set after an async loader resolves; cleared after Ark saves the file. */
	let resolved = $state<DownloadableData | null>(null);

	const isLoader = $derived(typeof data === 'function');
	const triggerData = $derived(
		resolved ?? (isLoader ? new Blob() : (data as DownloadableData))
	);

	async function onclick(event: MouseEvent) {
		if (!isLoader) return;

		if (resolved) {
			// Second click: let DownloadTrigger save `resolved`, then reset.
			queueMicrotask(() => {
				resolved = null;
			});
			return;
		}

		event.preventDefault();
		if (busy || disabled) return;
		busy = true;
		onBusyChange?.(true);
		try {
			resolved = await (data as () => Promise<DownloadableData>)();
			queueMicrotask(() => {
				(event.currentTarget as HTMLButtonElement | null)?.click();
			});
		} catch (error) {
			resolved = null;
			onError?.(error);
		} finally {
			busy = false;
			onBusyChange?.(false);
		}
	}
</script>

<DownloadTrigger
	{fileName}
	{mimeType}
	data={triggerData}
	disabled={disabled || busy}
	class={cn(className)}
	aria-label={label}
	aria-busy={busy || undefined}
	onclick={onclick}
>
	{#if children}
		{@render children({ busy })}
	{:else}
		Download
	{/if}
</DownloadTrigger>
