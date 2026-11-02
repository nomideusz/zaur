<script lang="ts" module>
	// Opened from the bar, the / and Ctrl+K keys, and svelte-search's index row.
	export const palette = $state({ open: false });
</script>

<script lang="ts">
	// svelte-search running the page: everything listed here, matched in the browser
	// by lib/find on the package's own pure pieces, with every step left on show.
	import { fold, gramsOf, search as match, tokensOf, type Result, indexed } from '#lib/find';
	import { t } from '#lib/i18n';

	let { entries, locale }: { entries: ReturnType<typeof indexed>; locale: string } = $props();

	let dialog = $state<HTMLDialogElement>();
	let box = $state<HTMLInputElement>();
	let q = $state('');
	let at = $state(0);

	// A folded Polish name, a Polish word for an English one, two typos.
	const tries = ['szkoly', 'kalendarz', 'metabse', 'chromiun'];
	const found = $derived(match(entries, q));
	const shown = $derived(found.slice(0, 8));
	const grams = $derived([...new Set(gramsOf(q))]);
	const shared = $derived(new Set(found[0] ? gramsOf(found[0].folded) : []));
	const score = $derived(new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
	const why = (r: Result) =>
		r.matches.map((m) => (m.how === 'exact' ? t('palette.exact') : t(`palette.${m.how}`, { token: m.token, word: m.word! }))).join(' · ');

	$effect(() => {
		if (!dialog) return;
		if (palette.open && !dialog.open) {
			dialog.showModal();
			box?.select();
		} else if (!palette.open && dialog.open) dialog.close();
	});
	$effect(() => {
		void q;
		at = 0;
	});

	const editing = (el: EventTarget | null) => {
		const e = el as HTMLElement | null;
		return !!e?.closest?.('input, textarea, select, [contenteditable]');
	};
	function onkey(e: KeyboardEvent) {
		if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !editing(e.target))) {
			e.preventDefault();
			palette.open = true;
		}
	}
	function onnav(e: KeyboardEvent) {
		if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
			e.preventDefault();
			if (shown.length) at = (at + (e.key === 'ArrowDown' ? 1 : shown.length - 1)) % shown.length;
		} else if (e.key === 'Enter' && shown[at]) {
			e.preventDefault();
			go(shown[at].href);
		}
	}
	/** A real click on a real anchor: the page's own handler opens any fold the row sits in. */
	function go(href: string) {
		palette.open = false;
		const a = document.createElement('a');
		a.href = href;
		document.body.append(a);
		a.click();
		a.remove();
	}
</script>

<svelte:window onkeydown={onkey} />

<dialog bind:this={dialog} class="palette" aria-labelledby="palette-label" onclose={() => (palette.open = false)} onclick={(e) => e.target === dialog && (palette.open = false)}>
	<div class="inner">
		<label class="field">
			<span id="palette-label">{t('palette.label')}</span>
			<input
				bind:this={box}
				bind:value={q}
				type="search"
				role="combobox"
				aria-expanded={shown.length > 0}
				aria-controls="palette-results"
				aria-activedescendant={shown[at] ? `palette-${at}` : undefined}
				autocomplete="off"
				spellcheck="false"
				onkeydown={onnav}
			/>
		</label>

		{#if tokensOf(q).length}
			<p class="how" aria-live="polite">normalize → <code>{fold(q)}</code> · {t('palette.meta', { count: found.length, total: entries.length })}</p>
			<p class="grams">
				<span>{t('palette.trigrams')}</span>
				{#each grams as g (g)}<code class:on={shared.has(g)}>{g}</code>{/each}
			</p>
			{#if !found.length}<p class="none">{t('palette.none', { q: q.trim() })}</p>{/if}
		{:else}
			<div class="tries" role="group" aria-label={t('palette.try')}>
				<span aria-hidden="true">{t('palette.try')}</span>
				{#each tries as x (x)}<button type="button" onclick={() => { q = x; box?.focus(); }}>{x}</button>{/each}
			</div>
			<p class="how">{t('palette.hint')}</p>
		{/if}

		<ol id="palette-results" role="listbox" aria-label={t('palette.label')}>
			{#each shown as r, i (r.href)}
				<li id="palette-{i}" role="option" aria-selected={i === at} class:at={i === at}>
					<span class="kind">{t(`palette.kind.${r.kind}`)}</span>
					<a href={r.href} tabindex="-1" onclick={(e) => { e.preventDefault(); go(r.href); }} onpointermove={() => (at = i)}>
						<b>{r.name}</b>
						<small>{why(r)}</small>
					</a>
					<span class="score">{score.format(r.score)}</span>
				</li>
			{/each}
		</ol>

		<p class="foot"><a href="#pkg-svelte-search" onclick={(e) => { e.preventDefault(); go('#pkg-svelte-search'); }}>svelte-search</a><span>{t('palette.keys')}</span></p>
	</div>
</dialog>

<style>
	.palette {
		width: min(46rem, calc(100vw - 2rem));
		max-width: none;
		max-height: min(80vh, 44rem);
		margin: 8vh auto auto;
		padding: 0;
		border: var(--rule-heavy) solid var(--ink);
		background: var(--ground);
		color: var(--ink);
	}
	.palette::backdrop {
		background: color-mix(in srgb, var(--ink) 55%, transparent);
	}
	.inner {
		display: grid;
		gap: 0.7rem;
		padding: 1rem;
	}
	.field {
		display: grid;
		gap: 0.3rem;
		font-weight: 800;
		font-size: max(1.5rem, 2.2vw);
		letter-spacing: -0.03em;
	}
	input {
		width: 100%;
		height: 3rem;
		padding: 0 0.75rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		font-size: 1.25rem;
		letter-spacing: normal;
	}
	input::-webkit-search-cancel-button {
		filter: grayscale(1) brightness(0);
	}
	.how {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	code {
		font: inherit;
	}
	.tries {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
		font-size: 0.875rem;
	}
	.tries span {
		margin-right: 0.35rem;
	}
	.tries button {
		height: 1.75rem;
		padding: 0 0.5rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: none;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	.tries button:hover {
		background: var(--chip);
	}
	.grams {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.grams span {
		margin-right: 0.35rem;
		font-weight: 700;
	}
	.grams code {
		padding: 0 0.35rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
	}
	.grams code.on {
		background: var(--ink);
		color: var(--paper);
	}
	ol {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: grid;
		grid-template-columns: 5.5rem minmax(0, 1fr) 2.5rem;
		gap: 0 0.75rem;
		align-items: baseline;
		padding: 0.35rem 0.5rem;
		border-top: var(--rule) solid var(--ink);
		font-size: 0.9375rem;
	}
	li.at {
		background: var(--orange);
	}
	.kind {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	li.at .kind,
	li.at small {
		color: var(--ink);
	}
	li a {
		text-decoration: none;
	}
	b {
		display: block;
		font-weight: 700;
		overflow-wrap: anywhere;
	}
	small {
		display: block;
		color: var(--quiet);
		font-size: 0.8125rem;
	}
	.score {
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.none {
		font-weight: 700;
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.25rem 1rem;
		padding-top: 0.5rem;
		border-top: var(--rule) solid var(--ink);
		font-size: 0.875rem;
	}
	@media (pointer: coarse) {
		.tries button {
			min-height: 2.75rem;
		}
	}
</style>
