<script lang="ts">
	/**
	 * The four actions a thread can take, plus the two marks that go beside
	 * them, drawn once.
	 *
	 * A row's hover strip, the list header's selection group and the reader's
	 * toolbar all run the same things on the same thread, so they draw them
	 * from here rather than each keeping their own copy to drift.
	 *
	 * Every glyph fills the same share of the 16-unit box — roughly 2 to 14
	 * across. That is what keeps them the same *optical* size when they sit in
	 * a row: a bin drawn 10 units wide next to a 12-unit archive box reads as
	 * smaller even though both are `size-4`.
	 */
	interface Props {
		name:
			| 'flag'
			| 'flag-filled'
			| 'important'
			| 'important-filled'
			| 'mail'
			| 'mail-open'
			| 'archive'
			| 'spam'
			| 'not-spam'
			| 'trash'
			| 'clip'
			| 'chevron';
		class?: string;
		/** Give a label only where the glyph is the whole message, not decoration. */
		label?: string;
	}

	let { name, class: className = 'size-4', label }: Props = $props();
</script>

{#if name === 'flag' || name === 'flag-filled'}
	<!-- A flag, because the mark is called Flagged everywhere it is named; a
	     star drawn next to the word "flag" was two ideas for one thing. -->
	<svg
		class={className}
		viewBox="0 0 16 16"
		fill={name === 'flag-filled' ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width="1.3"
		stroke-linejoin="round"
		stroke-linecap="round"
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
	>
		<path d="M3.5 14.5V2.2" fill="none" />
		<path d="M3.5 2.5h9.3l-2.4 3.2 2.4 3.2H3.5z" />
	</svg>
{:else if name === 'important' || name === 'important-filled'}
	<!-- The importance marker: a pointer, filled once it is set. -->
	<svg
		class={className}
		viewBox="0 0 16 16"
		fill={name === 'important-filled' ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width="1.3"
		stroke-linejoin="round"
		role={label ? 'img' : undefined}
		aria-label={label}
		aria-hidden={label ? undefined : 'true'}
	>
		<path d="M2.5 3.2h6.2L13.5 8l-4.8 4.8H2.5L6.6 8z" />
	</svg>
{:else if name === 'mail-open'}
	<!-- An open envelope is the action that makes something read. -->
	<svg class={className} viewBox="0 0 16 16" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<path d="M2 6.8L8 2.5l6 4.3V13H2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
		<path d="M2 6.8l6 4.2 6-4.2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
	</svg>
{:else if name === 'mail'}
	<svg class={className} viewBox="0 0 16 16" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<rect x="2" y="3.5" width="12" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3" />
		<path d="M2.4 4.6L8 8.8l5.6-4.2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
	</svg>
{:else if name === 'archive'}
	<svg class={className} viewBox="0 0 16 16" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<rect x="2" y="2.8" width="12" height="3" rx="0.9" stroke="currentColor" stroke-width="1.3" />
		<path d="M3.2 5.8v6.3a1 1 0 001 1h7.6a1 1 0 001-1V5.8" stroke="currentColor" stroke-width="1.3" />
		<path d="M6.4 8.4L8 10l1.6-1.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{:else if name === 'spam' || name === 'not-spam'}
	<!-- A shield spanning the same 2→14 box as the archive lid beside it: what
	     the folder does to the sender, not what it does to the message. -->
	<svg class={className} viewBox="0 0 16 16" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<path d="M8 2.2l5 1.8v4.3c0 3-2.1 5.2-5 5.9-2.9-.7-5-2.9-5-5.9V4z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
		{#if name === 'spam'}
			<path d="M8 5.6v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
			<path d="M8 10.5v.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		{:else}
			<path d="M5.9 8.1l1.5 1.5 2.7-2.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
		{/if}
	</svg>
{:else if name === 'trash'}
	<!-- Lid spans 2→14, the same as the archive box it stands next to. -->
	<svg class={className} viewBox="0 0 16 16" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<path d="M2 4.2h12M6 4.2V3a.8.8 0 01.8-.8h2.4a.8.8 0 01.8.8v1.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
		<path d="M4.1 4.2l.5 8.5a1.1 1.1 0 001.1 1h4.6a1.1 1.1 0 001.1-1l.5-8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
	</svg>
{:else if name === 'clip'}
	<svg class={className} viewBox="0 0 16 16" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<path
			d="M10.5 4.5L6 9a1.8 1.8 0 002.5 2.5l4.5-4.5a3.2 3.2 0 00-4.5-4.5L3.7 7.3a4.6 4.6 0 006.5 6.5l3.3-3.3"
			stroke="currentColor"
			stroke-width="1.4"
			stroke-linecap="round"
		/>
	</svg>
{:else}
	<svg class={className} viewBox="0 0 16 16" fill="none" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/if}
