<script lang="ts" module>
	import type { Lyrics } from '#lib/types';

	/** Asked once per song a visit; a failure is asked again. */
	const asked = new Map<string, Promise<Lyrics | null>>();
</script>

<script lang="ts">
	import { api } from '#lib/api';
	import { player } from '#lib/player.svelte';

	/**
	 * The playing song's lyrics, where the queue is in Now playing and the
	 * panel. Timed ones follow the song, and a line pressed seeks to it. The box
	 * scrolls by itself, so following a line never moves the controls away.
	 */
	const id = $derived(player.current?.id);
	/** undefined while asking; null when nobody has them. */
	let found = $state<Lyrics | null>();
	let failed = $state(false);
	let box = $state<HTMLElement>();

	function load(id: string): Promise<Lyrics | null> {
		let answer = asked.get(id);
		if (!answer) {
			answer = api(`/api/lyrics/${encodeURIComponent(id)}`).then((response) => (response.ok ? response.json() : Promise.reject()));
			answer.catch(() => asked.delete(id));
			asked.set(id, answer);
		}
		return answer;
	}
	$effect(() => {
		found = undefined;
		failed = false;
		if (!id) return;
		let live = true;
		load(id).then(
			(value) => live && (found = value),
			() => live && (failed = true)
		);
		return () => (live = false);
	});

	/** The line being sung: the last one started. */
	const at = $derived.by(() => {
		if (!found?.synced) return -1;
		const ms = player.time * 1000;
		return found.lines.findLastIndex((line) => line.start! <= ms);
	});
	$effect(() => {
		const line = box?.querySelectorAll<HTMLElement>('.line')[at];
		if (!line || !box) return;
		const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
		box.scrollTo({ top: line.offsetTop - box.clientHeight / 2 + line.offsetHeight / 2, behavior: smooth ? 'smooth' : 'instant' });
	});
</script>

<section class="lyrics" aria-label="Lyrics">
	{#if failed}
		<p class="empty">Couldn't load the lyrics.</p>
	{:else if found === undefined}
		<p class="empty">Looking for lyrics…</p>
	{:else if found === null}
		<p class="empty">No lyrics for this one.</p>
	{:else}
		<div class="box" bind:this={box}>
				{#each found.lines as line, i (i)}
					{#if found.synced}
						<button class="line" class:now={i === at} class:past={i < at} type="button" onclick={() => player.seek(line.start! / 1000)}>
							{line.text || '♪'}
						</button>
					{:else}
						<p class="line">{line.text || '\u00a0'}</p>
					{/if}
				{/each}
				{#if found.source === 'lrclib'}<p class="credit z-caption">Lyrics from LRCLIB</p>{/if}
		</div>
	{/if}
</section>

<style>
	.box {
		position: relative;
		max-height: min(60dvh, 520px);
		padding: 4px 4px 40%;
		overflow-y: auto;
		overscroll-behavior: contain;
	}
	.line {
		display: block;
		width: 100%;
		margin: 0;
		padding: 5px 8px;
		border: 0;
		border-radius: 8px;
		background: none;
		color: var(--z-ink);
		font: inherit;
		font-size: 17px;
		font-weight: 600;
		line-height: 1.4;
		text-align: left;
	}
	button.line {
		color: var(--z-soft);
		cursor: pointer;
	}
	button.line.past {
		color: var(--z-muted);
	}
	button.line.now {
		color: var(--z-ink);
	}
	@media (hover: hover) {
		button.line:hover {
			background: var(--z-hover);
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		button.line {
			transition: color 0.2s;
		}
	}
	.credit {
		margin: 16px 8px 0;
	}
	.empty {
		margin: 6px 0 0;
		color: var(--z-soft);
	}
</style>
