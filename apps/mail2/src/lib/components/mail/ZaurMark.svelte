<script lang="ts">
	/**
	 * The brand mark: ZA/UR, two mono capitals a line in a square — live type in
	 * Ioskeley Mono Bold, not artwork. It says *Zaur* rather than *Zaur Mail*,
	 * because one account spans Mail, Chat, Discuss and Meet.
	 *
	 * The letter inks are fixed identity colours and deliberately not channel
	 * hues: a channel says what kind of message this is, and the mark is not a
	 * message. It never carries a count — unread lives in the mailbox list and
	 * the status line. The pixel sprite stays a mascot for `@zaur/sprite`.
	 */
	interface Props {
		/** Tooltip; the mark also announces it to screen readers. */
		label?: string;
		/** 30px square in the 52px toolbar, 26px in compact headers (phone, drawer). */
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
	class="inline-flex shrink-0 items-center justify-center border border-[var(--z-mark-stroke)] bg-[var(--z-mark-fill)] font-mono font-bold select-none {size ===
	'md'
		? 'size-[30px] rounded-[8px] text-[14px]'
		: 'size-[26px] rounded-[7px] text-[12px]'} {className}"
>
	<!-- Each line is its own flex row so the glyphs cannot re-flow; the negative
	     margin re-centres the block against mono tracking's trailing gap. -->
	<span class="flex flex-col leading-[0.8] tracking-[0.04em] -mr-[0.04em]" aria-hidden="true">
		<span class="flex"><span class="text-[var(--z-mark-z)]">Z</span><span class="text-[var(--z-mark-a)]">A</span></span>
		<span class="flex"><span class="text-[var(--z-mark-a)]">U</span><span class="text-[var(--z-mark-r)]">R</span></span>
	</span>
</span>
