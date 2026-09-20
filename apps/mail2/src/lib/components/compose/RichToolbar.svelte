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
	}

	let { id, off = false, class: className = '' }: Props = $props();

	const tools = [
		{ attribute: 'bold', key: 'b', label: 'Bold', glyph: 'B', style: 'font-weight:700' },
		{ attribute: 'italic', key: 'i', label: 'Italic', glyph: 'I', style: 'font-style:italic;font-family:var(--font-serif, serif)' },
		{ attribute: 'strike', label: 'Strikethrough', glyph: 'S', style: 'text-decoration:line-through' }
	];
</script>

<trix-toolbar {id} class="z-rich-tools flex min-w-0 items-center gap-0.5 {className}" class:z-rich-tools--off={off}>
	{#each tools as tool (tool.attribute)}
		<button
			type="button"
			class="z-icon-btn shrink-0 text-[13px]"
			data-trix-attribute={tool.attribute}
			data-trix-key={tool.key}
			title={tool.label}
			aria-label={tool.label}
			tabindex={-1}
		>
			<span style={tool.style} aria-hidden="true">{tool.glyph}</span>
		</button>
	{/each}
	<button type="button" class="z-icon-btn shrink-0" data-trix-attribute="href" data-trix-action="link" data-trix-key="k" title="Link" aria-label="Link" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.6.6M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.6-.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
		</svg>
	</button>
	<button type="button" class="z-icon-btn shrink-0" data-trix-attribute="bullet" title="Bulleted list" aria-label="Bulleted list" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M6.5 4h7M6.5 8h7M6.5 12h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
			<circle cx="3" cy="4" r="1" fill="currentColor" /><circle cx="3" cy="8" r="1" fill="currentColor" /><circle cx="3" cy="12" r="1" fill="currentColor" />
		</svg>
	</button>
	<button type="button" class="z-icon-btn shrink-0" data-trix-attribute="number" title="Numbered list" aria-label="Numbered list" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M6.5 4h7M6.5 8h7M6.5 12h7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
			<path d="M2.4 3l.9-.5v3M2.2 10.2c.3-.5 1.6-.6 1.6.3 0 .7-1.6 1.2-1.6 2h1.8" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	</button>
	<button type="button" class="z-icon-btn shrink-0" data-trix-attribute="quote" title="Quote" aria-label="Quote" tabindex={-1}>
		<svg class="size-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
			<path d="M3 3v10M6.5 5h6.5M6.5 8h6.5M6.5 11h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
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
