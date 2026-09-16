<script lang="ts">
	/**
	 * The brand mark: a stamp. Mono, letter-spaced, a hard 1px box — a postal
	 * stamp, which ties the brand to the mono captions already running through
	 * the shell, and says *Zaur* rather than *Zaur Mail*, because one account
	 * spans Mail, Chat, Discuss and Meet.
	 *
	 * It replaced the pixel dinosaur, which did two jobs in this corner: the
	 * brand, and an unread indicator that changed expression. A mark that
	 * changes expression is charming once and ambiguous after that — and it
	 * cannot say "12". The count lives in the folder switcher and the status
	 * line now, where a number already does. The sprite stays a mascot for
	 * marketing and `@zaur/sprite`; it is not the app mark.
	 */
	interface Props {
		/** Tooltip; the mark also announces it to screen readers. */
		label?: string;
		/** 24px in the top bar, 22px in compact headers (compose backdrop, phone). */
		size?: 'md' | 'sm';
		/** Extra classes — e.g. to lift the mark out of a header's flow. */
		class?: string;
	}

	let { label = 'Zaur', size = 'md', class: className = '' }: Props = $props();
</script>

<span
	role="img"
	aria-label={label}
	title={label}
	class="inline-flex shrink-0 items-center rounded-[6px] border border-[#0b1220] bg-white font-mono font-semibold text-[#0b1220] select-none {size ===
	'md'
		? 'h-6 px-[9px] text-[11px]'
		: 'h-[22px] px-2 text-[10px]'} {className}"
	style:letter-spacing="0.22em"
>
	ZAUR
</span>
