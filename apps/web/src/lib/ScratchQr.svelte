<script lang="ts">
	// The ticket's real code, which a pointer can scratch. Nothing here decides
	// whether it still reads: the visitor's own phone does. The meter only counts
	// the modules a scratch has touched, beside where a test decoder gave out.
	import { downloadQrPng, getQrCapacity, getQrMatrix, matrixToSvg, type ErrorCorrection } from '@nomideusz/svelte-qr';
	import { t } from '#lib/i18n';

	let { text }: { text: string } = $props();
	const levels: ErrorCorrection[] = ['L', 'M', 'Q', 'H'];
	// Where scratches like these first beat a decoder (jsQR, 12 random trials a step, on
	// this page's ticket address). Far under the standard's 7-30%, which counts damaged
	// codewords: a thin stroke touches many codewords with few modules.
	const limit: Record<ErrorCorrection, number> = { L: 8, M: 11, Q: 17, H: 21 };
	let level = $state<ErrorCorrection>('H');

	const code = $derived.by(() => {
		const used = new TextEncoder().encode(text).length;
		try {
			const m = getQrMatrix(text, { errorCorrection: level });
			return { n: m.length, v: (m.length - 17) / 4, used, svg: matrixToSvg(m, { foreground: '#0b0a09', background: '#f8f6f1' }) };
		} catch {
			return { used, cap: getQrCapacity(level) };
		}
	});

	let canvas = $state<HTMLCanvasElement>();
	let touched = $state(new Set<number>());
	const size = 480;
	// The quiet zone is part of the SVG: scratches count only over real modules.
	const quiet = 4;

	const pct = $derived(code.n ? Math.round((touched.size / (code.n * code.n)) * 100) : 0);
	const hasScratches = $derived(touched.size > 0);

	function repair() {
		canvas?.getContext('2d')?.clearRect(0, 0, size, size);
		touched = new Set();
	}
	// A new code has a new grid: old scratches would mean nothing on it.
	$effect(() => {
		void code.svg;
		repair();
	});

	let last: { x: number; y: number } | null = null;
	function scratch(e: PointerEvent) {
		if (!canvas || !code.n) return;
		const box = canvas.getBoundingClientRect();
		const x = ((e.clientX - box.left) / box.width) * size;
		const y = ((e.clientY - box.top) / box.height) * size;
		const unit = size / (code.n + quiet * 2);
		const ctx = canvas.getContext('2d')!;
		ctx.strokeStyle = '#b8aff3';
		ctx.lineWidth = unit * 1.6;
		ctx.lineCap = 'round';
		ctx.beginPath();
		ctx.moveTo(last?.x ?? x, last?.y ?? y);
		ctx.lineTo(x, y);
		ctx.stroke();
		// Mark every module along the stroke, sampled finer than one module.
		const from = last ?? { x, y };
		const steps = Math.ceil(Math.hypot(x - from.x, y - from.y) / (unit / 2)) || 1;
		const next = new Set(touched);
		for (let i = 0; i <= steps; i++) {
			const px = from.x + ((x - from.x) * i) / steps;
			const py = from.y + ((y - from.y) * i) / steps;
			for (const dx of [-0.8, 0, 0.8])
				for (const dy of [-0.8, 0, 0.8]) {
					const col = Math.floor((px + dx * unit) / unit) - quiet;
					const row = Math.floor((py + dy * unit) / unit) - quiet;
					if (col >= 0 && row >= 0 && col < code.n && row < code.n) next.add(row * code.n + col);
				}
		}
		touched = next;
		last = { x, y };
	}
	function down(e: PointerEvent) {
		canvas?.setPointerCapture(e.pointerId);
		last = null;
		scratch(e);
	}
	const move = (e: PointerEvent) => {
		if (e.buttons || e.pointerType === 'touch') scratch(e);
	};
	const up = () => (last = null);
</script>

<div class="qr">
	{#if code.svg}
		<div class="code">
			{@html code.svg}
			<canvas bind:this={canvas} width={size} height={size} aria-hidden="true" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up}></canvas>
		</div>
	{:else}
		<p class="meta" role="status">{t('machine.qr.tooLong', { level, cap: code.cap ?? 0 })}</p>
	{/if}
	<div class="seg" role="group" aria-label={t('machine.qr.level')}>
		<span aria-hidden="true">{t('machine.qr.level')}</span>
		{#each levels as l (l)}<button type="button" aria-pressed={level === l} onclick={() => (level = l)}>{l}</button>{/each}
	</div>
	{#if code.svg}
		<p class="meta">{t('machine.qr.meta', { v: code.v ?? 0, n: code.n ?? 0, used: code.used })}</p>
		<p class="meter" class:over={pct > limit[level]} aria-live="polite">
			{#if hasScratches}
				{t('machine.qr.damage', { pct, level, cap: limit[level] })}
			{:else}
				{t('machine.qr.scratch')}
			{/if}
		</p>
		<p class="actions">
			<!-- For a visitor already on a phone, or without a second device: same ticket, same page. -->
			<a href={text.slice(text.indexOf('#'))}>{t('machine.qr.open')}</a>
			{#if hasScratches}<button type="button" onclick={repair}>{t('machine.qr.repair')}</button>{/if}
			<button type="button" onclick={() => downloadQrPng(text, 'ticket-qr.png', { errorCorrection: level })}>{t('machine.qr.save')}</button>
		</p>
	{/if}
</div>

<style>
	.qr {
		display: grid;
		gap: 0.6rem;
		justify-items: start;
		font-size: 0.875rem;
	}
	.code {
		position: relative;
		width: 100%;
		max-width: 20rem;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
		line-height: 0;
	}
	.code :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		cursor: crosshair;
		/* The code can be scratched with a finger; the page scrolls everywhere else. */
		touch-action: none;
	}
	.seg {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		font-weight: 700;
	}
	.seg span {
		margin-right: 0.35rem;
	}
	.seg button,
	.actions button {
		min-width: 2rem;
		height: 1.75rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-weight: 700;
		cursor: pointer;
	}
	.seg button:hover,
	.actions button:hover {
		background: var(--chip);
	}
	.seg button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
	}
	.actions a {
		display: inline-flex;
		align-items: center;
		min-height: 1.75rem;
		margin-right: 0.4rem;
		font-weight: 700;
	}
	.actions button {
		padding: 0 0.6rem;
	}
	.meta {
		font-variant-numeric: tabular-nums;
	}
	.meter {
		max-width: 34ch;
		font-weight: 700;
	}
	.meter.over {
		text-decoration: underline;
		text-decoration-color: var(--orange);
		text-decoration-thickness: 3px;
		text-underline-offset: 0.2em;
	}
	/* The machine's narrow column: the code beside its switch, the words under both.
	   It grows with the window, as a bigger code is easier to scan and to scratch. */
	@media (min-width: 1181px) {
		.qr {
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-rows: auto 1fr;
			gap: 0.4rem 0.75rem;
			width: 100%;
			font-size: 0.8125rem;
			line-height: 1.3;
		}
		.code {
			grid-row: 1 / span 2;
			width: clamp(8.5rem, 21svh, 15rem);
		}
		.seg,
		.meta {
			grid-column: 2;
		}
		.meter,
		.actions {
			grid-column: 1 / -1;
			max-width: none;
		}
		/* The label takes its own line, so the four levels never split. */
		.seg span {
			flex-basis: 100%;
		}
		.seg button {
			height: 1.5rem;
		}
	}
	@media (pointer: coarse) {
		.seg button,
		.actions button {
			min-width: 2.75rem;
			height: 2.75rem;
		}
		.actions a {
			min-height: 2.75rem;
		}
	}
</style>
