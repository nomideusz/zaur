<script lang="ts">
	import { buildEmailFrameSrcdoc } from '$lib/email/frame';

	interface Props {
		/** Sanitized + post-processed email HTML (from `renderMessageBody`). */
		html: string;
		darkMode: boolean;
		/** Light-authored mail with no background of its own — rendered as a light card. */
		lightSurface: boolean;
	}

	let { html, darkMode, lightSurface }: Props = $props();

	let frame: HTMLIFrameElement | undefined = $state();
	// Min-height to avoid a zero-height flash before the first measure settles.
	let height = $state(48);
	let observer: ResizeObserver | undefined;
	let pending = false;

	const srcdoc = $derived(buildEmailFrameSrcdoc({ html, darkMode, lightSurface }));

	function applyHeight() {
		pending = false;
		const body = frame?.contentDocument?.body;
		if (!body) return;
		// Measure the body, not documentElement: documentElement.scrollHeight is floored by the
		// iframe's own viewport height, so it would never shrink once the frame has grown. The
		// body tracks content height in both directions.
		const next = body.scrollHeight;
		if (next > 0 && next !== height) height = next;
	}

	/**
	 * The frame runs no scripts (sandbox omits `allow-scripts`), so it can't size itself. We
	 * measure from the parent — which `allow-same-origin` permits — and re-measure on any reflow
	 * (late image/font loads, responsive width changes) via a ResizeObserver on the frame body.
	 *
	 * Applying the height lands on the next frame, coalesced via `pending`, so it never mutates
	 * size synchronously inside a resize observation — which is what trips the benign (dev-only)
	 * "ResizeObserver loop completed with undelivered notifications" warning.
	 */
	function measure() {
		if (pending) return;
		pending = true;
		requestAnimationFrame(applyHeight);
	}

	function handleLoad() {
		const doc = frame?.contentDocument;
		if (!doc) return;

		observer?.disconnect();
		observer = new ResizeObserver(measure);
		if (doc.body) observer.observe(doc.body);

		// Images that arrive after first paint shift layout — re-measure when each settles.
		for (const img of Array.from(doc.images)) {
			if (img.complete) continue;
			img.addEventListener('load', measure, { once: true });
			img.addEventListener('error', measure, { once: true });
		}

		measure();
	}

	$effect(() => () => observer?.disconnect());
</script>

<iframe
	bind:this={frame}
	title="Email message"
	{srcdoc}
	onload={handleLoad}
	sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
	scrolling="no"
	style="width: 100%; height: {height}px; border: 0; display: block; background: transparent;"
></iframe>
