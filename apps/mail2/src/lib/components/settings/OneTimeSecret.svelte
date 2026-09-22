<script lang="ts">
	/**
	 * A secret shown exactly once. Stalwart returns an app password or API key
	 * in the `set` response and never again, so this is the only chance to copy
	 * it — which is why the card says so, and why dismissing it asks nothing.
	 */
	let {
		label,
		secret,
		hint,
		onDismiss
	}: { label: string; secret: string; hint: string; onDismiss: () => void } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	async function copy() {
		try {
			await navigator.clipboard.writeText(secret);
			copied = true;
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => (copied = false), 2000);
		} catch {
			// Clipboard blocked: the text is selectable below.
		}
	}
</script>

<div
	class="z-railed mt-3 rounded-[10px] border border-[var(--z-ch-needs-solid)] bg-[var(--z-ch-needs-fill)] p-4"
	style:--z-rail="var(--z-ch-needs-solid)"
	role="alert"
>
	<div class="text-[13px] font-semibold text-[var(--z-ink)]">{label}</div>
	<p class="mt-1 text-[12.5px] leading-relaxed text-[var(--z-muted)]">{hint}</p>
	<div class="mt-2.5 flex items-center gap-2">
		<code
			class="min-w-0 flex-1 select-all overflow-x-auto rounded-[6px] border border-[var(--z-line)] bg-[var(--z-surface)] px-2.5 py-1.5 font-mono text-[12.5px] text-[var(--z-ink)]"
		>
			{secret}
		</code>
		<button type="button" class="btn-tactile !h-[32px] shrink-0" onclick={copy}>
			{copied ? 'Copied' : 'Copy'}
		</button>
	</div>
	<button type="button" class="btn-tactile mt-3 !h-[28px] text-[12px]" onclick={onDismiss}>
		I have saved it
	</button>
</div>
