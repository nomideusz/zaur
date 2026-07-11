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
	let observer: ResizeObserver | undefined;
	let pending = false;

	const srcdoc = $derived(buildEmailFrameSrcdoc({ html, darkMode, lightSurface }));

	function applyHeight() {
		pending = false;
		const el = frame;
		const root = el?.contentDocument?.documentElement;
		if (!el || !root) return;
		// Collapse first, then read documentElement.scrollHeight. documentElement is floored by the
		// iframe's current viewport height, so collapsing lets it shrink *and* grow accurately;
		// it also counts trailing child margins that escape body.scrollHeight (which undercounts).
		// Both writes happen in this one rAF, so the 0px state is never painted (no flicker).
		el.style.height = '0';
		const next = root.scrollHeight > 0 ? root.scrollHeight : 48;
		el.style.height = `${next}px`;
		// Fixed-width mail scrolls horizontally (overflow-x on html); a classic bottom scrollbar
		// would otherwise overlay the last line. Overlay/mobile scrollbars measure 0, so this is
		// a no-op there. Measured after the height is applied so the scrollbar has laid out.
		if (root.scrollWidth > root.clientWidth) {
			const scrollbar = el.clientHeight - root.clientHeight;
			if (scrollbar > 0) el.style.height = `${next + scrollbar}px`;
		}
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
	style="width: 100%; height: 48px; border: 0; display: block; background: transparent;"
></iframe>
