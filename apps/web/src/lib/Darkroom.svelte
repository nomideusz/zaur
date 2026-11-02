<script lang="ts">
	// svelte-geometrize and svelte-media on one picture: my portrait until a visitor
	// brings their own. The portrait's fit is prebuilt and only replays; a preset or
	// a dropped photo fits for real in a worker, loaded on that first request.
	// Nothing leaves the tab. processAndStore needs sharp, so the files below are
	// the browser's own encodes, cut to the package's sizes, qualities and keys.
	import { onMount, type Snippet } from 'svelte';
	import { PRESETS, placeholderToSvg, shapeCount, takeShapes, type GeometrizePlaceholder, type GeometrizePreset } from '@nomideusz/svelte-geometrize';
	import { IMAGE_SIZES, SIZE_QUALITY, generateMediaKey, getStorageKey, validateImageFile } from '@nomideusz/svelte-media';
	import portrait from '#lib/me.webp';
	import portraitFit from '#lib/me.webp?shapes=100&geometrize';
	import Tape from '#lib/Tape.svelte';
	import { t } from '#lib/i18n';
	import type { FitRequest } from '#lib/fit.worker';

	let {
		locale,
		version,
		npmOf,
		usedIn,
		children
	}: {
		locale: string;
		version: (id: string) => string;
		npmOf: (id: string) => string | undefined;
		usedIn: (id: string) => string;
		/** The switch that holds every capture on the page at its triangles. */
		children?: Snippet;
	} = $props();

	const SHAPES = 100;
	const MAX_FILE = 30 * 1024 * 1024;
	const presets = Object.keys(PRESETS) as GeometrizePreset[];
	const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

	let root: HTMLElement;
	let picker = $state<HTMLInputElement>();
	// svelte-ignore state_referenced_locally
	let fit = $state<GeometrizePlaceholder>(portraitFit);
	let photo = $state({ url: portrait, name: 'me.webp', bytes: 0, width: 480, height: 480 });
	let preset = $state<GeometrizePreset>('triangles');
	let shown = $state(0);
	let busy = $state(false);
	let error = $state('');
	let over = $state(false);
	// A square loupe over the shapes, in percent of the stage. A wipe from one edge
	// showed nearly the whole photo to a pointer arriving from the far side; this
	// shows the same small window from any direction.
	let lens = $state<{ x: number; y: number; rx: number; ry: number } | null>(null);
	let held = $state(false);
	let files = $state<{ size: string; key: string; dims: string; fit: string; bytes: number; href: string; name: string }[]>([]);
	let lossy = $state(true);
	let lines = $state<{ id: number; pkg: string; call: string; out: string; stopped?: boolean }[]>([]);
	let lineId = 0;

	const total = $derived(shapeCount(fit));
	const svg = $derived(placeholderToSvg(takeShapes(fit, Math.max(1, shown))));
	const fitBytes = $derived(JSON.stringify(takeShapes(fit, Math.max(1, shown))).length);
	const kb = $derived(new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1 }));
	const fmt = (b: number) => (b >= 1e6 ? new Intl.NumberFormat(locale, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 }).format(b / 1e6) : kb.format(b / 1000));
	const smaller = $derived(photo.bytes && fitBytes ? Math.round(photo.bytes / fitBytes) : 0);

	const log = (pkg: string, call: string, out: string, stopped = false) => (lines = [{ id: ++lineId, pkg, call, out, stopped }, ...lines].slice(0, 12));

	// The fit is ordered, so a replay is the picture sharpening: slow while each
	// shape still changes a lot, then a rush through the fine detail.
	let frame = 0;
	function replay() {
		cancelAnimationFrame(frame);
		if (reduced()) {
			shown = total;
			return;
		}
		const began = performance.now();
		const tick = (now: number) => {
			const p = Math.min(1, (now - began) / 2200);
			shown = Math.max(1, Math.ceil(total * p ** 2.4));
			if (p < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
	}

	let worker: Worker | undefined;
	let job = 0;
	let pixels: Omit<FitRequest, 'id' | 'preset' | 'shapes'> | undefined;

	/** Decodes the photo once: 128px for the fitter (more buys nothing), the rest for the files. */
	async function decode(blob: Blob) {
		const bitmap = await createImageBitmap(blob);
		const scale = Math.min(1, 128 / Math.max(bitmap.width, bitmap.height));
		const width = Math.max(1, Math.round(bitmap.width * scale));
		const height = Math.max(1, Math.round(bitmap.height * scale));
		const c = document.createElement('canvas');
		c.width = width;
		c.height = height;
		const ctx = c.getContext('2d', { willReadFrequently: true })!;
		ctx.drawImage(bitmap, 0, 0, width, height);
		pixels = { rgba: ctx.getImageData(0, 0, width, height).data, width, height, sourceWidth: bitmap.width, sourceHeight: bitmap.height };
		return bitmap;
	}

	async function refit() {
		if (!pixels) await decode(await (await fetch(photo.url)).blob()).then((b) => b.close());
		if (!pixels) return;
		const id = ++job;
		busy = true;
		worker ??= new Worker(new URL('./fit.worker.ts', import.meta.url), { type: 'module' });
		const done = (e: MessageEvent) => {
			if (e.data.id !== id) return;
			worker?.removeEventListener('message', done);
			busy = false;
			if (e.data.error) {
				error = t('darkroom.failed');
				return;
			}
			fit = e.data.placeholder;
			log('svelte-geometrize', `fitShapes(rgba, ${pixels!.width}, ${pixels!.height}, { preset: '${preset}', shapes: ${SHAPES} })`, t('darkroom.fitted', { n: shapeCount(fit), ms: Math.round(e.data.ms) }));
			replay();
		};
		worker.addEventListener('message', done);
		worker.postMessage({ ...pixels, rgba: pixels.rgba, id, preset, shapes: SHAPES });
	}

	// The held photo covers the shapes, so whatever changes the shapes uncovers them.
	function usePreset(p: GeometrizePreset) {
		held = false;
		if (p === preset) return;
		preset = p;
		error = '';
		void refit();
	}

	/** svelte-media's sizes and qualities, encoded by this browser. */
	async function encode(bitmap: ImageBitmap) {
		for (const f of files) URL.revokeObjectURL(f.href);
		const out: typeof files = [];
		const filename = generateMediaKey();
		for (const [size, spec] of Object.entries(IMAGE_SIZES) as [keyof typeof IMAGE_SIZES, (typeof IMAGE_SIZES)[keyof typeof IMAGE_SIZES]][]) {
			const cover = spec.fit === 'cover';
			const ratio = cover ? Math.max(spec.width / bitmap.width, spec.height / bitmap.height) : Math.min(1, spec.width / bitmap.width, spec.height / bitmap.height);
			const w = cover ? Math.min(spec.width, bitmap.width) : Math.round(bitmap.width * ratio);
			const h = cover ? Math.min(spec.height, bitmap.height) : Math.round(bitmap.height * ratio);
			const c = document.createElement('canvas');
			c.width = w;
			c.height = h;
			const sw = cover ? w / ratio : bitmap.width;
			const sh = cover ? h / ratio : bitmap.height;
			c.getContext('2d')!.drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, w, h);
			const blob = await new Promise<Blob | null>((go) => c.toBlob(go, 'image/webp', SIZE_QUALITY[size] / 100));
			if (!blob) continue;
			// Safari and older browsers cannot encode WebP, and hand back a PNG instead: say so.
			lossy = blob.type === 'image/webp';
			const key = getStorageKey('uploads', 'demo', filename, size);
			out.push({ size, key, dims: `${w}×${h}`, fit: spec.fit, bytes: blob.size, href: URL.createObjectURL(blob), name: key.split('/').pop()! });
		}
		files = out;
		log('svelte-media', `getStorageKey('uploads', 'demo', '${filename.slice(0, 8)}….webp', size)`, t('darkroom.keys', { n: out.length }));
	}

	async function take(file: File) {
		error = '';
		const check = validateImageFile(file, { maxFileSize: MAX_FILE });
		log('svelte-media', `validateImageFile(${JSON.stringify(file.type || file.name)}, ${fmt(file.size)})`, check.valid ? 'valid' : String(check.code), !check.valid);
		if (!check.valid) {
			error = check.code === 'file-too-large' ? t('darkroom.tooBig', { max: fmt(MAX_FILE) }) : check.code === 'empty' ? t('darkroom.empty') : t('darkroom.badType');
			return;
		}
		let bitmap: ImageBitmap;
		try {
			bitmap = await decode(file);
		} catch {
			error = t('darkroom.unreadable');
			return;
		}
		if (photo.url !== portrait) URL.revokeObjectURL(photo.url);
		photo = { url: URL.createObjectURL(file), name: file.name, bytes: file.size, width: bitmap.width, height: bitmap.height };
		held = false;
		await encode(bitmap);
		bitmap.close();
		void refit();
	}

	const choose = (e: Event & { currentTarget: HTMLInputElement }) => {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (file) void take(file);
	};
	function drop(e: DragEvent) {
		e.preventDefault();
		over = false;
		const file = e.dataTransfer?.files[0];
		if (file) void take(file);
	}
	function point(e: PointerEvent & { currentTarget: HTMLElement }) {
		const box = e.currentTarget.getBoundingClientRect();
		const half = Math.min(box.width, box.height) * 0.2;
		lens = {
			x: ((e.clientX - box.left) / box.width) * 100,
			y: ((e.clientY - box.top) / box.height) * 100,
			rx: (half / box.width) * 100,
			ry: (half / box.height) * 100
		};
	}
	const reveal = $derived(
		held ? 'none' : lens ? `inset(${lens.y - lens.ry}% ${100 - lens.x - lens.rx}% ${100 - lens.y - lens.ry}% ${lens.x - lens.rx}%)` : 'inset(0 100% 0 0)'
	);

	onMount(() => {
		const seen = new IntersectionObserver(
			async ([e]) => {
				if (!e.isIntersecting) return;
				seen.disconnect();
				replay();
				// The portrait's own file sizes, by the same path a dropped photo takes.
				const blob = await (await fetch(portrait)).blob();
				photo.bytes = blob.size;
				const bitmap = await createImageBitmap(blob);
				await encode(bitmap);
				bitmap.close();
			},
			{ rootMargin: '-25% 0px' }
		);
		seen.observe(root);
		// A pasted image counts as a dropped one, unless the paste is going into a field.
		const paste = (e: ClipboardEvent) => {
			const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
			const box = root.getBoundingClientRect();
			if (!file || box.bottom < 0 || box.top > innerHeight) return;
			if ((e.target as Element).closest?.('input, textarea, [contenteditable]')) return;
			void take(file);
		};
		addEventListener('paste', paste);
		return () => {
			seen.disconnect();
			removeEventListener('paste', paste);
			cancelAnimationFrame(frame);
			worker?.terminate();
			for (const f of files) URL.revokeObjectURL(f.href);
			if (photo.url !== portrait) URL.revokeObjectURL(photo.url);
		};
	});
</script>

<div class="darkroom" id="darkroom" bind:this={root}>
	<div class="media" role="group" aria-label={t('darkroom.stage')} ondragover={(e) => { e.preventDefault(); over = true; }} ondragleave={() => (over = false)} ondrop={drop} class:over>
		<div class="stage" style:aspect-ratio="{photo.width} / {photo.height}" onpointermove={point} onpointerdown={point} onpointerleave={() => (lens = null)} role="presentation">
			<!-- Generated by svelte-geometrize from numbers: no text from the file reaches it. -->
			<div class="shapes" aria-hidden="true">{@html svg}</div>
			<img class="photo" src={photo.url} alt={t('darkroom.alt')} style:clip-path={reveal} />
			{#if lens && !held}<span class="lens" style:left="{lens.x - lens.rx}%" style:top="{lens.y - lens.ry}%" style:width="{lens.rx * 2}%" style:height="{lens.ry * 2}%" aria-hidden="true"></span>{/if}
			{#if busy}<span class="status" role="status"><i aria-hidden="true"></i>{t('darkroom.fitting', { tries: (SHAPES * 5000).toLocaleString(locale) })}</span>{/if}
		</div>
	</div>

	<div class="body">
		<h3>{t('darkroom.title')}</h3>
		<p class="what">{t('darkroom.lede')}</p>

		<p class="row">
			<button type="button" class="act" onclick={() => picker?.click()}>{t('darkroom.use')}</button>
			<button type="button" class="act quiet" aria-pressed={held} onclick={() => (held = !held)}>{t(held ? 'darkroom.showShapes' : 'darkroom.showPhoto')}</button>
			<input bind:this={picker} class="sr" type="file" accept="image/*" tabindex="-1" aria-hidden="true" onchange={choose} />
		</p>
		<p class="note" role={error ? 'alert' : undefined} class:bad={error}>{error || t('darkroom.private')}</p>

		<section id="pkg-svelte-geometrize" class="part">
			<header><h4><a href={npmOf('svelte-geometrize')}>svelte-geometrize</a></h4><span>{version('svelte-geometrize')}</span></header>
			<div class="seg" role="group" aria-label={t('darkroom.preset')}>
				{#each presets as p (p)}<button type="button" aria-pressed={preset === p} disabled={busy} onclick={() => usePreset(p)}>{p}</button>{/each}
			</div>
			<label class="range">
				<span>{t('darkroom.shapes', { n: Math.max(1, shown), total })}</span>
				<input type="range" min="1" max={total} value={Math.max(1, shown)} oninput={(e) => { cancelAnimationFrame(frame); held = false; shown = +e.currentTarget.value; }} />
			</label>
			<p class="weight">
				<b>{kb.format(fitBytes / 1000)}</b>
				{#if smaller > 1}<span>{t('darkroom.weight', { photo: fmt(photo.bytes), times: smaller })}</span>{/if}
			</p>
			{#if usedIn('svelte-geometrize')}<p class="used">{usedIn('svelte-geometrize')}</p>{/if}
			<div>{@render children?.()}</div>
		</section>

		<section id="pkg-svelte-media" class="part">
			<header><h4><a href={npmOf('svelte-media')}>svelte-media</a></h4><span>{version('svelte-media')}</span></header>
			<ul class="files">
				{#each files as f (f.key)}
					<li><a href={f.href} download={f.name}><code>{f.name}</code></a><span>{f.dims}</span><span>{f.fit}</span><span>{kb.format(f.bytes / 1000)}</span></li>
				{/each}
			</ul>
			<p class="used">{t(lossy ? 'darkroom.files' : 'darkroom.filesPng')}</p>
			{#if usedIn('svelte-media')}<p class="used">{usedIn('svelte-media')}</p>{/if}
		</section>

		{#if lines.length}<div class="trace"><Tape {lines} label={t('darkroom.tape')} /></div>{/if}
	</div>
</div>

<style>
	.darkroom {
		display: grid;
		grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
		border-bottom: var(--rule) solid var(--ink);
	}
	.media {
		display: grid;
		place-items: start center;
		padding: 2vw;
		border-right: var(--rule) solid var(--ink);
		background: var(--lilac);
	}
	.media.over {
		background: var(--orange);
	}
	/* The picture rides beside the taller column of readings. */
	.stage {
		position: sticky;
		top: calc(3.66vw + 2vw);
		width: 100%;
		max-width: min(100%, 74vh);
		overflow: hidden;
		border: var(--rule) solid var(--ink);
		background: var(--paper);
		cursor: crosshair;
		touch-action: pan-y;
	}
	.shapes,
	.photo {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.shapes :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.photo {
		display: block;
		object-fit: cover;
	}
	.lens {
		position: absolute;
		border: var(--rule) solid var(--ink);
		pointer-events: none;
	}
	.status {
		position: absolute;
		left: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0.6rem;
		background: var(--ink);
		color: var(--paper);
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.status i {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--orange);
		animation: blink 1s steps(2, jump-none) infinite;
	}
	@keyframes blink {
		from {
			opacity: 1;
		}
		to {
			opacity: 0.25;
		}
	}
	.body {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	h3 {
		padding: 1.4vw 1.39vw 0;
		font-weight: 800;
		font-size: max(2rem, 3.6vw);
		line-height: 1.05;
		letter-spacing: -0.035em;
	}
	.what {
		max-width: 62ch;
		padding: 0.6rem 1.39vw 0;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding: 0.9rem 1.39vw 0;
	}
	.act {
		min-height: 2.25rem;
		padding: 0 0.75rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: var(--ink);
		color: var(--paper);
		font: inherit;
		font-weight: 700;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.act:hover {
		background: var(--orange);
		color: var(--ink);
	}
	.act.quiet {
		background: none;
		color: var(--ink);
	}
	.act.quiet:hover {
		background: var(--chip);
	}
	.note {
		padding: 0.5rem 1.39vw 1rem;
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.note.bad {
		color: var(--ink);
		font-weight: 700;
	}
	.part {
		display: grid;
		gap: 0.6rem;
		padding-bottom: 0.9rem;
		border-top: var(--rule) solid var(--ink);
		scroll-margin-top: 3.66vw;
	}
	.part:target header {
		background: var(--chip);
	}
	.part > :not(header) {
		margin-inline: 1.39vw;
	}
	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 1.39vw 0.45rem;
		border-bottom: var(--rule) solid var(--ink);
		font-variant-numeric: tabular-nums;
	}
	h4 {
		margin: 0;
		font-weight: 700;
		font-size: max(1.125rem, 1.45vw);
		letter-spacing: -0.02em;
	}
	h4 a {
		text-decoration: none;
	}
	h4 a:hover {
		text-decoration: underline;
	}
	.seg {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		font-size: 0.875rem;
		font-weight: 700;
	}
	.seg button {
		height: 1.75rem;
		padding: 0 0.5rem;
		border: var(--rule) solid var(--ink);
		border-radius: 3px;
		background: none;
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	.seg button:hover:not(:disabled, [aria-pressed='true']) {
		background: var(--chip);
	}
	.seg button[aria-pressed='true'] {
		background: var(--ink);
		color: var(--paper);
	}
	.seg button:disabled:not([aria-pressed='true']) {
		color: var(--quiet);
		cursor: default;
	}
	.range {
		display: grid;
		gap: 0.15rem;
		font-weight: 700;
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.range input {
		width: 100%;
		margin: 0;
		accent-color: var(--ink);
	}
	.weight {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.1rem 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.weight b {
		font-weight: 800;
		font-size: max(1.75rem, 3.07vw);
		line-height: 1;
		letter-spacing: -0.03em;
	}
	.weight span {
		font-size: 0.875rem;
	}
	.used {
		color: var(--quiet);
		font-size: 0.875rem;
	}
	.files {
		font-size: 0.875rem;
		font-variant-numeric: tabular-nums;
	}
	.files li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 5.5rem 3.25rem 4rem;
		gap: 0 0.75rem;
		padding: 0.2rem 0;
		border-top: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
	}
	.files li > :last-child {
		text-align: right;
	}
	/* The keys share one long id: keep their size prefix, clip the rest. */
	.files a {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.files code {
		font: inherit;
	}
	.trace {
		height: 11rem;
		border-top: var(--rule) solid var(--ink);
		overflow: hidden;
	}
	.trace :global(.tape) {
		min-height: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.status i {
			animation: none;
		}
	}
	@media (max-width: 900px) {
		.darkroom {
			grid-template-columns: minmax(0, 1fr);
		}
		.media {
			order: 1;
			padding: 1rem;
			border-right: 0;
			border-top: var(--rule) solid var(--ink);
			border-bottom: var(--rule) solid var(--ink);
		}
		.stage {
			position: relative;
			top: 0;
			max-width: 100%;
		}
		.body {
			display: contents;
		}
		h3,
		.what,
		.row,
		.note {
			order: 0;
			padding-inline: 1rem;
		}
		h3 {
			padding-top: 1.25rem;
		}
		.part,
		.trace {
			order: 2;
		}
		.part:first-of-type {
			border-top: 0;
		}
		.part > :not(header) {
			margin-inline: 1rem;
		}
		header {
			padding-inline: 1rem;
		}
	}
	@media (pointer: coarse) {
		.act,
		.seg button {
			min-height: 2.75rem;
		}
	}
</style>
