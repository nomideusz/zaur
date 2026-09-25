<!--
	Trix's toolbar, in mail2's buttons. Trix fills an empty <trix-toolbar> with its
	own markup and sprite sheet; given children it uses them, and only reads the
	data-trix-* attributes. It marks the pressed ones `.trix-active`.
-->
<script lang="ts">
	interface Props {
		id: string;
		/**
		 * Plain-text mode. The toolbar stays in the document regardless: a <trix-editor>
		 * looks its toolbar up as it connects and throws if it is not there yet.
		 */
		off?: boolean;
		class?: string;
		/** Phone: each control is a 44px target. The row scrolls when they do not fit. */
		large?: boolean;
	}

	let { id, off = false, large = false, class: className = '' }: Props = $props();

	const tools = [
		{ attribute: 'bold', key: 'b', label: 'Bold', glyph: 'B', style: 'font-weight:700' },
		{ attribute: 'italic', key: 'i', label: 'Italic', glyph: 'I', style: 'font-style:italic;font-family:var(--font-serif, serif)' },
		{ attribute: 'strike', label: 'Strikethrough', glyph: 'S', style: 'text-decoration:line-through' }
	];
</script>

<trix-toolbar {id} class="z-rich-tools flex min-w-0 items-center {large ? 'gap-1' : 'gap-0.5'} {className}" class:z-rich-tools--off={off}>
	{#each tools as tool (tool.attribute)}
		<button
			type="button"
			class="z-icon-btn shrink-0 text-[13px] {large ? '!size-11' : ''}"
			data-trix-attribute={tool.attribute}
			data-trix-key={tool.key}
			title={tool.label}
			aria-label={tool.label}
			tabindex={-1}
		>
			<span style={tool.style} aria-hidden="true">{tool.glyph}</span>
		</button>
	{/each}
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-attribute="href" data-trix-action="link" data-trix-key="k" title="Link" aria-label="Link" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.6.6M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.6-.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		</svg>
	</button>
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-attribute="bullet" title="Bulleted list" aria-label="Bulleted list" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M6.5 4h7M6.5 8h7M6.5 12h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
			<circle cx="3" cy="4" r="1" fill="currentColor" /><circle cx="3" cy="8" r="1" fill="currentColor" /><circle cx="3" cy="12" r="1" fill="currentColor" />
		</svg>
	</button>
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-attribute="number" title="Numbered list" aria-label="Numbered list" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M6.5 4h7M6.5 8h7M6.5 12h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
			<path d="M2.4 3l.9-.5v3M2.2 10.2c.3-.5 1.6-.6 1.6.3 0 .7-1.6 1.2-1.6 2h1.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-attribute="quote" title="Quote" aria-label="Quote" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M3 3v10M6.5 5h6.5M6.5 8h6.5M6.5 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		</svg>
	</button>

	<button type="button" class="z-icon-btn shrink-0 text-[13px] {large ? '!size-11' : ''}" data-trix-attribute="heading1" title="Heading" aria-label="Heading" tabindex={-1}>
		<span style="font-weight:700" aria-hidden="true">H</span>
	</button>
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-attribute="code" title="Code block" aria-label="Code block" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M5.5 4.5 2 8l3.5 3.5M10.5 4.5 14 8l-3.5 3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>
	<!-- Trix's own picker: images go into the text, anything else is refused into the attachment strip. -->
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-action="attachFiles" title="Insert image" aria-label="Insert image" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4" />
			<circle cx="5.8" cy="6.3" r="1.1" fill="currentColor" />
			<path d="m2.5 11.5 3.5-3 2.5 2 2-1.5 3 2.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
		</svg>
	</button>
	<span class="{large ? 'h-6' : 'h-5'} mx-0.5 w-px shrink-0 bg-[var(--z-hairline)]" aria-hidden="true"></span>
	<!-- Trix disables these when there is nothing to undo or redo. -->
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-action="undo" data-trix-key="z" title="Undo" aria-label="Undo" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M5 3.5 2.5 6 5 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
			<path d="M2.5 6h6.75a3.75 3.75 0 0 1 0 7.5H7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		</svg>
	</button>
	<button type="button" class="z-icon-btn shrink-0 {large ? '!size-11' : ''}" data-trix-action="redo" data-trix-key="shift+z" title="Redo" aria-label="Redo" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M11 3.5 13.5 6 11 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
			<path d="M13.5 6H6.75a3.75 3.75 0 0 0 0 7.5H9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		</svg>
	</button>

	<div data-trix-dialogs>
		<div
			class="z-menu absolute bottom-[calc(100%+6px)] left-3 z-10 w-[min(360px,calc(100%-24px))]"
			data-trix-dialog="href"
			data-trix-dialog-attribute="href"
		>
			<div class="flex items-center gap-1.5 p-1">
				<input
					type="url"
					name="href"
					class="z-field min-w-0 flex-1 !text-[12.5px]"
					placeholder="https://"
					aria-label="Link address"
					required
					data-trix-input
				/>
				<input type="button" class="btn-tactile !h-8 !px-2.5 !text-[12px]" value="Link" data-trix-method="setAttribute" />
				<input type="button" class="btn-tactile !h-8 !px-2.5 !text-[12px]" value="Unlink" data-trix-method="removeAttribute" />
			</div>
		</div>
	</div>
</trix-toolbar>

<style>
	/* Trix injects an unlayered `trix-toolbar { display: block }`, which outranks any
	   Tailwind utility (those are layered) — so the row is declared here, unlayered. */
	:global(trix-toolbar.z-rich-tools) {
		display: flex;
	}
	:global(trix-toolbar.z-rich-tools--off) {
		display: none;
	}
	:global(.z-rich-tools button.trix-active) {
		background: var(--z-accent-soft);
		color: var(--z-accent-edge);
	}
</style>
