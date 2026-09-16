<script lang="ts">
	/**
	 * The four actions a thread can take, drawn once.
	 *
	 * A row's hover strip, the list header's selection group and the reader's
	 * toolbar all run the same four things on the same thread, so they draw
	 * them from here rather than each keeping their own copy to drift.
	 */
	interface Props {
		name:
			| 'star'
			| 'star-filled'
			| 'mail'
			| 'mail-open'
			| 'archive'
			| 'trash'
			| 'chevron';
		class?: string;
	}

	let { name, class: className = 'size-4' }: Props = $props();
</script>

{#if name === 'star' || name === 'star-filled'}
	<svg
		class={className}
		viewBox="0 0 16 16"
		fill={name === 'star-filled' ? 'currentColor' : 'none'}
		stroke="currentColor"
		stroke-width={name === 'star-filled' ? 0 : 1.3}
		stroke-linejoin="round"
		aria-hidden="true"
	>
		<path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2.1.7-4.3-3.1-3 4.3-.6z" />
	</svg>
{:else if name === 'mail-open'}
	<!-- An open envelope is the action that makes something read. -->
	<svg class={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M2 6.8L8 2.5l6 4.3V13H2z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
		<path d="M2 6.8l6 4.2 6-4.2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
	</svg>
{:else if name === 'mail'}
	<svg class={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<rect x="2" y="3.5" width="12" height="9" rx="1.2" stroke="currentColor" stroke-width="1.3" />
		<path d="M2.4 4.6L8 8.8l5.6-4.2" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" />
	</svg>
{:else if name === 'archive'}
	<svg class={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<rect x="2" y="2.8" width="12" height="3" rx="0.9" stroke="currentColor" stroke-width="1.3" />
		<path d="M3.2 5.8v6.3a1 1 0 001 1h7.6a1 1 0 001-1V5.8" stroke="currentColor" stroke-width="1.3" />
		<path d="M6.4 8.4L8 10l1.6-1.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{:else if name === 'trash'}
	<svg class={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M3 4.4h10M6.4 4.4V3a.6.6 0 01.6-.6h2a.6.6 0 01.6.6v1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
		<path d="M4.5 4.4l.5 8.1a1 1 0 001 .9h4a1 1 0 001-.9l.5-8.1" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
	</svg>
{:else}
	<svg class={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/if}
