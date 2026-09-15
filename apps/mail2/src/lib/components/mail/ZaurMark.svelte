<script lang="ts">
	import { SPRITE_FRAMES, SPRITE_GRID_H, SPRITE_GRID_W, type FrameId } from '@zaur/sprite';

	interface Props {
		/** Unseen messages in the active mailbox — drives look_up vs happy. */
		unread: number;
		/** Tooltip text; the mark also announces it to screen readers. */
		label?: string;
		/** Rendered width in px (height follows the 20:18 sprite grid). */
		size?: number;
		/** Extra classes — e.g. to lift the mark out of a header's flow. */
		class?: string;
	}

	let { unread, label, size = 28, class: className = '' }: Props = $props();

	const SLEEP_AFTER_MS = 5 * 60_000;
	const BLINK_MS = 180;
	const CHEER_MS = 2500;

	let offline = $state(false);
	let asleep = $state(false);
	let blinking = $state(false);
	let cheering = $state(false);

	// Sad beats everything (nothing else is true while the network is gone);
	// blink only interrupts the two resting faces.
	const frame = $derived<FrameId>(
		offline
			? 'sad'
			: cheering
				? 'cheer'
				: asleep
					? 'sleep'
					: blinking
						? 'blink'
						: unread > 0
							? 'look_up'
							: 'happy'
	);

	// Raspberry over deep plum: vivid enough to read at 28px, same hue family as
	// --z-accent (#7a3b5e), and complementary to the green account avatar across
	// the top bar. Both tones are the Hobday pink already in #lib/mail/colors.
	const BODY = '#db2777';
	const SHADE = '#831843';
	/** Rows from here down are the underside — legs and belly take the darker tone. */
	const SHADE_FROM_ROW = 11;
	const SCALE = 2;

	// A local renderer rather than the package's frameSvg: that one fills the
	// whole sprite with a single colour, and the duotone needs per-row fills.
	function duotoneSvg(id: FrameId): string {
		const rows = SPRITE_FRAMES[id];
		const rects: string[] = [];
		for (let y = 0; y < SPRITE_GRID_H; y++) {
			const row = rows[y] ?? '';
			for (let x = 0; x < SPRITE_GRID_W; x++) {
				// '.' is transparent and 'W' is the eye — left as a hole so the
				// header shows through it.
				if ((row[x] ?? '.') !== 'X') continue;
				const fill = y >= SHADE_FROM_ROW ? SHADE : BODY;
				rects.push(
					`<rect x="${x * SCALE}" y="${y * SCALE}" width="${SCALE}" height="${SCALE}" fill="${fill}"/>`
				);
			}
		}
		const w = SPRITE_GRID_W * SCALE;
		const h = SPRITE_GRID_H * SCALE;
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges">${rects.join('')}</svg>`;
	}

	// scale 2 keeps the pixel grid crisp; CSS scales the box down to `size`.
	const svg = $derived(duotoneSvg(frame));

	const title = $derived(
		label ?? (unread > 0 ? `${unread} unseen` : 'Nothing unseen')
	);

	$effect(() => {
		const sync = () => (offline = !navigator.onLine);
		sync();
		addEventListener('online', sync);
		addEventListener('offline', sync);
		return () => {
			removeEventListener('online', sync);
			removeEventListener('offline', sync);
		};
	});

	// Reaching inbox zero is worth a cheer; arriving already at zero is not.
	// Deliberately a plain `let`: as $state it would be a dependency of the very
	// effect that writes it, and the re-run's cleanup would cancel the timer.
	let previousUnread: number | null = null;
	$effect(() => {
		const now = unread;
		const before = previousUnread;
		previousUnread = now;
		if (before === null || before === 0 || now !== 0) return;
		cheering = true;
		const timer = setTimeout(() => (cheering = false), CHEER_MS);
		// Unread arriving mid-cheer ends it — look_up is the truer face then.
		return () => {
			clearTimeout(timer);
			cheering = false;
		};
	});

	// Dozes off after a spell with no input, wakes on the next one.
	$effect(() => {
		let timer: ReturnType<typeof setTimeout>;
		const wake = () => {
			asleep = false;
			clearTimeout(timer);
			timer = setTimeout(() => (asleep = true), SLEEP_AFTER_MS);
		};
		wake();
		addEventListener('pointerdown', wake, { passive: true });
		addEventListener('keydown', wake, { passive: true });
		return () => {
			clearTimeout(timer);
			removeEventListener('pointerdown', wake);
			removeEventListener('keydown', wake);
		};
	});

	$effect(() => {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let alive = true;
		let timer: ReturnType<typeof setTimeout>;
		const wait = (ms: number) =>
			new Promise<void>((resolve) => {
				timer = setTimeout(resolve, ms);
			});
		void (async () => {
			await wait(2000 + Math.random() * 3000);
			while (alive) {
				blinking = true;
				await wait(BLINK_MS);
				blinking = false;
				// A double blink now and then keeps it from looking metronomic.
				if (Math.random() < 0.3) {
					await wait(120);
					blinking = true;
					await wait(BLINK_MS);
					blinking = false;
				}
				await wait(2500 + Math.random() * 4500);
			}
		})();
		return () => {
			alive = false;
			clearTimeout(timer);
			blinking = false;
		};
	});
</script>

<!--
	The Zaur pixel mark stands in for the usual window traffic lights: it is the
	brand, and unlike three inert dots it says something — it looks up while
	unseen mail is waiting, cheers on reaching zero, sulks when the network
	drops, and dozes off when the app is left alone.
-->
<span
	role="img"
	aria-label="Zaur — {title}"
	{title}
	class="block shrink-0 [&>svg]:h-auto [&>svg]:w-full {className}"
	style:width="{size}px"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- generated by @zaur/sprite, no user input -->
	{@html svg}
</span>
