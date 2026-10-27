<script lang="ts">
	/** Every key a section answers to, opened with `?`: the one list, Mail's and Calendar's alike. */
	let { keys }: { keys: [key: string, does: string, long: string][] } = $props();

	let sheet = $state<HTMLDialogElement | null>(null);

	export function toggle() {
		if (sheet?.open) sheet.close();
		else sheet?.showModal();
	}
</script>

<!-- A click on the backdrop lands on the dialog itself; one inside lands on the card. -->
<dialog
	bind:this={sheet}
	class="m-auto w-[420px] max-w-[calc(100vw-32px)] rounded-[12px] outline-none border border-[var(--z-line)] bg-[var(--z-surface)] p-0 text-[var(--z-ink)] shadow-[var(--z-shadow-panel)] backdrop:bg-[var(--z-scrim)]"
	aria-label="Keyboard shortcuts"
	onclick={(event) => {
		if (event.target === sheet) sheet?.close();
	}}
	onkeydown={(event) => {
		// The key that opened it closes it: the page's own handler leaves an open dialog's keys alone.
		if (event.key === '?') sheet?.close();
	}}
>
	<div class="px-5 pt-4 pb-5">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="z-caption">Keyboard shortcuts</h2>
			<button type="button" class="z-mono flex items-center gap-[5px] text-[10.5px] text-[var(--z-soft)] hover:text-[var(--z-strong)]" onclick={() => sheet?.close()}>
				<kbd class="z-kbd">esc</kbd> close
			</button>
		</div>
		<dl class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3.5 gap-y-[7px] text-[13px] text-[var(--z-strong)]">
			{#each keys as [key, , long] (key)}
				<dt><kbd class="z-kbd">{key}</kbd></dt>
				<dd>{long}</dd>
			{/each}
		</dl>
	</div>
</dialog>
