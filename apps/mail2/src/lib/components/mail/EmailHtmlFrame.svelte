<script lang="ts">
	import { browser } from '$app/environment';
	import { buildEmailFrameSrcdoc } from '#lib/email/frame';
	import { prefs } from '#lib/settings.svelte.ts';

	interface Props {
		/** Sanitized + post-processed email HTML (from `renderMessageBody`). */
		html: string;
		/** True when the html was produced from a plain-text body. */
		plain: boolean;
		/** Remote images are allowed for this message; otherwise the frame's CSP refuses them. */
		remote?: boolean;
	}

	let { html, plain, remote = false }: Props = $props();

	let frame: HTMLIFrameElement | undefined = $state();
	let observer: ResizeObserver | undefined;
	let pending = false;

	/**
	 * The frame cannot see the shell's tokens, so it is told which palette to
	 * use. "system" follows the OS and is re-read when the OS flips.
	 *
	 * Read before the first render, not in the effect: a `srcdoc` that changes
	 * right after mount is a second navigation of the frame, and WebKit files it
	 * in history — Back then had to be pressed twice to leave a plain-text
	 * message in dark mode.
	 */
	let systemDark = $state(browser && window.matchMedia('(prefers-color-scheme: dark)').matches);
	$effect(() => {
		const media = window.matchMedia('(prefers-color-scheme: dark)');
		const sync = () => (systemDark = media.matches);
		media.addEventListener('change', sync);
		return () => media.removeEventListener('change', sync);
	});
	const dark = $derived(prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark));

	// The origin is for the frame's CSP, which names the inline-image address in full.
	const origin = browser ? location.origin : undefined;
	const srcdoc = $derived(buildEmailFrameSrcdoc({ html, plain, dark, remote, origin }));

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
		// would otherwise overlay the last line. Measured after the height is applied so the
		// scrollbar has laid out.
		if (root.scrollWidth > root.clientWidth) {
			const scrollbar = el.clientHeight - root.clientHeight;
			if (scrollbar > 0) el.style.height = `${next + scrollbar}px`;
		}
	}

	/**
	 * The frame runs no scripts (sandbox omits `allow-scripts`), so it can't size itself. We
	 * measure from the parent — which `allow-same-origin` permits — and re-measure on any reflow
	 * (late image/font loads, responsive width changes) via a ResizeObserver on the frame body.
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

<!-- HTML mail keeps its light palette, so in dark it sits on its own white
     card rather than bleeding a white rectangle into the reader column. -->
<div class={dark && !plain ? 'z-html-card' : undefined}>
	<iframe
		bind:this={frame}
		title="Email message"
		{srcdoc}
		sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
		onload={handleLoad}
		class="w-full border-0 align-top"
	></iframe>
</div>

<style>
	.z-html-card {
		padding: 14px 16px;
		border-radius: 8px;
		background: #ffffff;
		border: 1px solid var(--z-line);
	}
</style>
